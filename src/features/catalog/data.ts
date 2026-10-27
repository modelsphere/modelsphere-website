import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import baselineInput from '../../../content/catalog/baseline.json';
import baselineSource from '../../../content/catalog/baseline-source.json';
import source from '../../../content/catalog/source.json';
import { catalogReturnTo } from './routes';

const id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const tuningSchema = z.object({
  baseline: z.string(),
  optimized: z.string(),
  uplift: z.number().finite().optional(),
  workloads: z
    .array(z.object({ name: z.string(), uplift: z.number().finite() }))
    .default([]),
  report: z.string().optional(),
});
const variantSchema = z.object({
  id,
  version: z.string(),
  releaseDate: z.string().optional(),
  commit: sha.optional(),
  path: z.string(),
  digest,
  history: z.string(),
  engine: z.string(),
  servedName: z.string().optional(),
  description: z.string().optional(),
  deprecated: z.union([z.boolean(), z.string()]).optional(),
  chart: z.object({
    name: z.string().optional(),
    version: z.string().optional(),
  }),
  image: z
    .object({
      repository: z.string(),
      tag: z.string().optional(),
      digest: digest.optional(),
    })
    .optional(),
  requires: z.object({
    gpus: z.number().int().nonnegative().optional(),
    nodes: z.number().int().positive().optional(),
    vendor: z.string().optional(),
    gpuProduct: z.array(z.string()).default([]),
    topology: z.string().optional(),
  }),
});
const catalogSchema = z.object({
  apiVersion: z.literal('catalog.swiss/v2'),
  commit: sha,
  count: z.number().int().nonnegative(),
  models: z.array(
    z.object({
      name: id,
      displayName: z.string().optional(),
      description: z.string().optional(),
      family: z.string().optional(),
      tags: z.array(z.string()).default([]),
      defaultVariant: z.string().optional(),
      quantization: z.string().optional(),
      deprecated: z.union([z.boolean(), z.string()]).optional(),
      source: z
        .object({ hf: z.string().optional(), revision: z.string().optional() })
        .optional(),
      reports: z.array(z.string()).default([]),
      tuning: z.array(tuningSchema).default([]),
      variants: z.array(variantSchema),
    }),
  ),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type Model = Catalog['models'][number];
export type Variant = Model['variants'][number];
export type Tuning = Model['tuning'][number];
export interface Recipe {
  key: string;
  model: Model;
  variant: Variant;
  tuning: Tuning[];
  quotedGain: number | null;
  workload: string | null;
}
export const config = source;
export const baselineInfo = baselineSource;
export function parseCatalog(value: unknown): Catalog {
  const result = catalogSchema.parse(value);
  if (
    result.count !== result.models.length ||
    new Set(result.models.map((m) => m.name)).size !== result.models.length
  )
    throw new Error('目录计数或模型标识无效');
  for (const m of result.models) {
    if (new Set(m.variants.map((v) => v.id)).size !== m.variants.length)
      throw new Error('配方标识重复');
    for (const v of m.variants)
      if (
        v.path !== `models/${m.name}/${v.id}.yaml` ||
        v.history !== `models/${m.name}/${v.id}.history.json`
      )
        throw new Error('配方路径与标识不符');
    if (m.reports.some((r) => !/^[a-zA-Z0-9._-]+\.html$/.test(r)))
      throw new Error('报告路径无效');
  }
  return result;
}
export const baseline = parseCatalog(baselineInput);
const versions = new Map<string, Catalog>([[baseline.commit, baseline]]);
export const cachedCatalog = (version: string) => versions.get(version);
export function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
function encodedPath(path: string) {
  if (path.split('/').some((p) => !p || p === '.' || p === '..'))
    throw new Error('文件路径无效');
  return path.split('/').map(encodeURIComponent).join('/');
}
export const fileUrl = (path: string) =>
  new URL(encodedPath(path), config.baseUrl).href;
export const rawUrl = (commit: string, path: string) => {
  if (!sha.safeParse(commit).success) throw new Error('来源提交无效');
  return new URL(`${commit}/${encodedPath(path)}`, config.rawBase).href;
};
export const sourceUrl = (v: Variant) =>
  v.commit
    ? `${config.repository}/blob/${v.commit}/${encodedPath(v.path)}`
    : fileUrl(v.path);
export const reportUrl = (r: Recipe, t = r.tuning[0]) =>
  t?.report && r.model.reports.includes(t.report)
    ? fileUrl(`models/${r.model.name}/${t.report}`) + '#en'
    : null;
export async function requestText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: 'no-cache',
  });
  if (!response.ok) throw new Error(`来源请求失败（${response.status}）`);
  return response.text();
}
export async function loadCatalog(signal?: AbortSignal) {
  const catalog = parseCatalog(
    JSON.parse(
      await requestText(new URL('index-v2.json', config.baseUrl).href, signal),
    ),
  );
  versions.set(catalog.commit, catalog);
  return catalog;
}
export function recipesOf(catalog: Catalog): Recipe[] {
  return catalog.models.flatMap((model) =>
    model.variants.map((variant) => {
      const mine = model.tuning.filter(
        (t) => t.optimized.split('@')[0] === variant.id,
      );
      // Release dates belong to recipes; the benchmark stays bound to its explicitly measured version.
      const latest = mine
        .map((t) => t.optimized.split('@')[1] ?? '')
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
        .at(-1);
      const tuning = mine.filter((t) => t.optimized.split('@')[1] === latest);
      const values = tuning.flatMap<{ value: number; workload: string | null }>(
        (t) =>
          t.workloads.length
            ? t.workloads.map((w) => ({ value: w.uplift, workload: w.name }))
            : t.uplift == null
              ? []
              : [{ value: t.uplift, workload: null }],
      );
      const best = values.sort((a, b) => b.value - a.value)[0];
      return {
        key: `${model.name}/${variant.id}`,
        model,
        variant,
        tuning,
        quotedGain: best?.value ?? null,
        workload: best?.workload ?? null,
      };
    }),
  );
}
export function hardware(v: Variant) {
  return v.requires.gpus === 0
    ? ['无需 GPU']
    : v.requires.gpuProduct.map((p) =>
        p
          .replace(/^NVIDIA-/, '')
          .replace(/-80GB-HBM3|-SXM4-80GB|-SXM6-AC/g, ''),
      );
}
export function hardwareText(v: Variant) {
  const labels = hardware(v).join(' / ') || (v.requires.vendor ?? 'GPU 未指定');
  if (v.requires.topology === 'pd') return labels;
  return `${v.requires.gpus == null ? '' : `${v.requires.gpus} × `}${labels}${v.requires.nodes && v.requires.nodes > 1 ? ` × ${v.requires.nodes} 节点` : ''}`;
}
export const topology = (v: Variant) => v.requires.topology ?? 'single-node';
export const topologyLabel = (v: Variant) =>
  ({ 'single-node': '单节点', lws: '多节点 LWS', pd: 'Prefill / Decode 分离' })[
    topology(v)
  ] ?? topology(v);
export function role(r: Recipe) {
  if (r.tuning.length) return 'optimized';
  if (r.model.tuning.some((t) => t.baseline.split('@')[0] === r.variant.id))
    return 'baseline';
  return 'recipe';
}
export function isDefault(r: Recipe) {
  return r.variant.id === (r.model.defaultVariant ?? r.model.variants[0]?.id);
}
export function detailHref(
  r: Recipe,
  version: string,
  recipeVersion?: string,
  returnTo?: string,
) {
  return (
    '/models/recipe?' +
    new URLSearchParams({
      modelId: r.model.name,
      recipeId: r.variant.id,
      dataVersion: version,
      ...(recipeVersion ? { version: recipeVersion } : {}),
      ...(returnTo ? { returnTo: catalogReturnTo(returnTo) } : {}),
    })
  );
}
export function modelHref(m: Model, version: string, returnTo?: string) {
  return (
    '/models/detail?' +
    new URLSearchParams({
      modelId: m.name,
      dataVersion: version,
      ...(returnTo ? { returnTo: catalogReturnTo(returnTo) } : {}),
    })
  );
}
export function stats(c: Catalog) {
  const rs = recipesOf(c);
  const pairs = rs.flatMap((recipe) =>
    recipe.tuning.map((t) => ({
      recipe,
      gain: t.workloads.length
        ? Math.max(...t.workloads.map((w) => w.uplift))
        : (t.uplift ?? null),
    })),
  );
  const gains = pairs
    .flatMap((p) => (p.gain == null ? [] : [p.gain]))
    .sort((a, b) => a - b);
  const middle = Math.floor(gains.length / 2);
  const bestImprovement = gains.at(-1) ?? null;
  return {
    models: c.models.length,
    recipes: rs.length,
    optimizedPairs: pairs.length,
    optimizedCoverage: c.models.length
      ? Math.round(
          (new Set(pairs.map((p) => p.recipe.model.name)).size /
            c.models.length) *
            100,
        )
      : 0,
    medianImprovement: gains.length
      ? gains.length % 2
        ? gains[middle]
        : (gains[middle - 1] + gains[middle]) / 2
      : null,
    minImprovement: gains[0] ?? null,
    bestImprovement,
    bestRecipe:
      pairs.find((p) => p.gain != null && p.gain === bestImprovement)?.recipe ??
      null,
    tunedModels: c.models.filter((m) => m.tuning.length).length,
    reports: c.models.reduce((n, m) => n + m.reports.length, 0),
    hardware: new Set(rs.flatMap((r) => r.variant.requires.gpuProduct)).size,
    engines: Array.from(new Set(rs.map((r) => r.variant.engine)))
      .map(
        (engine) =>
          `${engine} ${rs.filter((r) => r.variant.engine === engine).length}`,
      )
      .join(' · '),
  };
}
export async function loadYaml(
  v: Variant,
  signal?: AbortSignal,
  commit = v.commit,
  expected = v.digest,
) {
  const text = await requestText(
    commit ? rawUrl(commit, v.path) : fileUrl(v.path),
    signal,
  );
  if (!crypto.subtle)
    throw new Error('当前环境不能校验配方，请通过来源链接阅读');
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  const actual =
    'sha256:' +
    Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  if (actual !== expected)
    throw new Error('配方校验值与目录不一致，请重新加载目录');
  return text;
}
const historySchema = z.object({
  model: id,
  id,
  path: z.string(),
  revisions: z.array(
    z.object({
      version: z.string(),
      releaseDate: z.string().optional(),
      commit: sha.optional(),
      digest,
      subject: z.string(),
    }),
  ),
});
export type History = z.infer<typeof historySchema>;
export async function loadHistory(
  r: Recipe,
  signal?: AbortSignal,
): Promise<History> {
  const h = historySchema.parse(
    JSON.parse(await requestText(fileUrl(r.variant.history), signal)),
  );
  if (
    h.model !== r.model.name ||
    h.id !== r.variant.id ||
    h.path !== r.variant.path
  )
    throw new Error('历史记录不属于当前配方');
  const start = h.revisions.findIndex((x) => x.digest === r.variant.digest);
  if (start < 0) throw new Error('历史与所选目录版本不一致');
  return { ...h, revisions: h.revisions.slice(start) };
}
export function launchFacts(text: string) {
  const d = z
    .object({
      values: z
        .object({
          extraArgs: z.array(z.string()).optional(),
          model: z
            .object({
              contextLength: z.union([z.string(), z.number()]).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .parse(parseYaml(text));
  const args = d.values?.extraArgs ?? [];
  return { args, context: d.values?.model?.contextLength };
}
