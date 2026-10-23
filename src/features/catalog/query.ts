import {
  hardware,
  isDefault,
  role,
  recipesOf,
  topology,
  type Catalog,
  type Recipe,
} from './data';
export interface Query {
  q: string;
  family: string;
  engine: string;
  tag: string;
  role: string;
  hardware: string[];
  topology: string;
  view: string;
  layout: string;
  sort: string;
  page: number;
  benchmark: string;
  dataVersion: string;
  hidedep: boolean;
}
export const PAGE_SIZE = 12;
export const initialQuery: Query = {
  q: '',
  family: '',
  engine: '',
  tag: '',
  role: '',
  hardware: [],
  topology: '',
  view: 'recipes',
  layout: 'cards',
  sort: 'improvement-desc',
  page: 1,
  benchmark: '',
  dataVersion: '',
  hidedep: false,
};
export function facets(c: Catalog) {
  const rs = recipesOf(c);
  return {
    family: Array.from(
      new Set(c.models.flatMap((m) => (m.family ? [m.family] : []))),
    ).sort(),
    engine: Array.from(new Set(rs.map((r) => r.variant.engine))).sort(),
    tag: Array.from(new Set(c.models.flatMap((m) => m.tags))).sort(),
    hardware: Array.from(
      new Set(rs.flatMap((r) => r.variant.requires.gpuProduct)),
    ).sort(),
  };
}
export function parseQuery(search: string, c: Catalog): Query {
  const p = new URLSearchParams(search),
    f = facets(c);
  const allowed = (key: string, values: string[], fallback = '') =>
    values.includes(p.get(key) ?? '') ? p.get(key)! : fallback;
  const rawPage = p.get('page') ?? '1';
  return {
    q: Array.from(
      new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(
        (p.get('q') ?? '').trim(),
      ),
    )
      .slice(0, 100)
      .map((x) => x.segment)
      .join(''),
    family: allowed('family', f.family),
    engine: allowed('engine', f.engine),
    tag: allowed('tag', f.tag),
    role: allowed('role', ['optimized', 'baseline', 'default', 'recipe']),
    hardware: Array.from(
      new Set(p.getAll('hardware').filter((x) => f.hardware.includes(x))),
    ),
    topology: allowed('topology', ['single-node', 'lws', 'pd']),
    view: allowed('view', ['models', 'recipes'], 'recipes'),
    layout: allowed('layout', ['cards', 'table'], 'cards'),
    sort: allowed(
      'sort',
      ['improvement-desc', 'name-asc', 'name-desc', 'updated-desc'],
      'improvement-desc',
    ),
    page:
      /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(+rawPage)
        ? +rawPage
        : 1,
    benchmark: p.get('benchmark') ?? '',
    dataVersion: p.get('dataVersion') ?? '',
    hidedep: p.get('hidedep') === '1',
  };
}
export function queryHref(q: Query) {
  const p = new URLSearchParams();
  for (const k of ['q', 'family', 'engine', 'tag', 'role'] as const)
    if (q[k]) p.set(k, q[k]);
  q.hardware.forEach((x) => p.append('hardware', x));
  for (const k of [
    'topology',
    'view',
    'layout',
    'sort',
    'page',
    'benchmark',
    'dataVersion',
  ] as const)
    if (q[k] && q[k] !== initialQuery[k]) p.set(k, String(q[k]));
  if (q.hidedep) p.set('hidedep', '1');
  return '/models' + (p.size ? '?' + p.toString() : '');
}
export function queryRecipes(c: Catalog, q: Query) {
  const list = recipesOf(c)
    .filter((r) => {
      const m = r.model,
        v = r.variant;
      const text = [
        m.name,
        m.displayName,
        m.description,
        m.family,
        m.source?.hf,
        ...m.tags,
        v.id,
        v.description,
        v.engine,
        v.image?.repository,
        v.image?.tag,
        ...v.requires.gpuProduct,
        ...hardware(v),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!q.q || text.includes(q.q.toLowerCase())) &&
        (!q.family || m.family === q.family) &&
        (!q.engine || v.engine === q.engine) &&
        (!q.tag || m.tags.includes(q.tag)) &&
        (!q.role ||
          (q.role === 'default' ? isDefault(r) : role(r) === q.role)) &&
        (!q.topology || topology(v) === q.topology) &&
        (!q.hardware.length ||
          q.hardware.some((x) => v.requires.gpuProduct.includes(x))) &&
        (!q.hidedep || !(m.deprecated || v.deprecated))
      );
    })
    .sort((a, b) => compare(a, b, q.sort));
  const entries =
    q.view === 'models'
      ? Array.from(new Set(list.map((r) => r.model.name)))
          .map((name) => {
            const matching = list
              .filter((r) => r.model.name === name)
              .sort((a, b) => a.key.localeCompare(b.key));
            return (
              matching.find((r) => r.variant.id === r.model.defaultVariant) ??
              matching[0]
            );
          })
          .sort((a, b) =>
            compare(
              { ...a, quotedGain: null },
              { ...b, quotedGain: null },
              q.sort,
            ),
          )
      : list;
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE)),
    page = Math.min(q.page, pages);
  return {
    all: entries,
    total: entries.length,
    page,
    pages,
    items: entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}
export function compare(a: Recipe, b: Recipe, sort: string) {
  // These are explicitly quoted source records, not verified comparable throughput measurements.
  if (sort === 'improvement-desc') {
    const missing = Number(a.quotedGain == null) - Number(b.quotedGain == null);
    if (missing) return missing;
    if (
      a.quotedGain != null &&
      b.quotedGain != null &&
      a.quotedGain !== b.quotedGain
    )
      return b.quotedGain - a.quotedGain;
  }
  if (sort === 'updated-desc') {
    const missing =
      Number(!a.variant.releaseDate) - Number(!b.variant.releaseDate);
    if (missing) return missing;
    const d = (b.variant.releaseDate ?? '').localeCompare(
      a.variant.releaseDate ?? '',
    );
    if (d) return d;
  }
  const name = a.model.name.localeCompare(b.model.name);
  return (sort === 'name-desc' ? -name : name) || a.key.localeCompare(b.key);
}
