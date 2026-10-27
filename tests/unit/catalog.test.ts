import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  baseline,
  baselineInfo,
  parseCatalog,
  recipesOf,
  stats,
  role,
  isDefault,
  hardwareText,
  loadYaml,
  loadHistory,
  rawUrl,
  safeUrl,
  type Catalog,
} from '../../src/features/catalog/data';
import {
  catalogReturnTo,
  legacyCatalogReportHref,
  legacyRecipeReportHref,
  reportHref,
  recipeTab,
  recipeTabHref,
} from '../../src/features/catalog/routes';
import {
  initialQuery,
  parseQuery,
  queryRecipes,
  queryHref,
  compare,
} from '../../src/features/catalog/query';
afterEach(() => vi.unstubAllGlobals());
describe('public catalog contract and provenance', () => {
  it('keeps the verified source snapshot intact and accounts for mock records', () => {
    const raw = readFileSync('content/catalog/baseline.json');
    // The preserved upstream acquisition hash and the local baseline digest are separate.
    expect(baselineInfo.dataCommit).toBe(baseline.commit);
    expect(baselineInfo.sha256).toBe(
      createHash('sha256').update(raw).digest('hex'),
    );
    expect(JSON.parse(raw.toString()).commit).toBe(baseline.commit);
    expect(stats(baseline)).toMatchObject({
      models: 28,
      recipes: 72,
      optimizedPairs: 23,
      optimizedCoverage: 79,
      medianImprovement: 32.4,
      minImprovement: 5.3,
      bestImprovement: 195.3,
      tunedModels: 22,
      reports: 23,
      hardware: 6,
    });
    expect(baseline.models.some((m) => m.name === 'mock-llm')).toBe(true);
    expect(stats(baseline).bestRecipe?.key).toBe(
      'glm5.3/sglang-tp4-b300-optimized',
    );
  });
  it('rejects inconsistent counts, traversal, duplicate identities and non-finite gains', () => {
    const bad = structuredClone(baseline);
    bad.count++;
    expect(() => parseCatalog(bad)).toThrow();
    bad.count--;
    bad.models[0].variants[0].path = 'models/../private.yaml';
    expect(() => parseCatalog(bad)).toThrow();
    const dup = structuredClone(baseline);
    dup.models[0].variants.push(dup.models[0].variants[0]);
    expect(() => parseCatalog(dup)).toThrow();
    const gain = structuredClone(baseline);
    gain.models.find((m) => m.tuning.length)!.tuning[0].uplift = Infinity;
    expect(() => parseCatalog(gain)).toThrow();
  });
  it('distinguishes source comparisons from defaults and keeps measured versions', () => {
    const r = recipesOf(baseline).find(
      (r) => r.key === 'qwen3.6-35b-a3b/sglang-tp2-h100',
    )!;
    expect(isDefault(r)).toBe(true);
    expect(role(r)).toBe('recipe');
    expect(r.quotedGain).toBeNull();
    const glm = recipesOf(baseline).find(
      (r) => r.key === 'glm5.3/sglang-tp4-b300-optimized',
    )!;
    expect(glm.quotedGain).toBe(195.3);
    expect(glm.workload).toBe('50k + 1.5k');
    expect(glm.tuning[0].optimized).toContain('@1.0.4');
  });
  it('does not pretend a PD recipe GPU count is the total deployment count', () => {
    const pd = recipesOf(baseline).find(
      (r) => r.variant.requires.topology === 'pd',
    )!;
    expect(hardwareText(pd.variant)).not.toContain('1 ×');
    expect(rawUrl(baseline.commit, 'models/a/b.yaml')).toContain(
      baseline.commit,
    );
    expect(() => rawUrl('master', 'models/a/b.yaml')).toThrow();
    expect(safeUrl('javascript:alert(1)')).toBeNull();
  });
});
describe('catalog improvement statistics', () => {
  function withGains(gains: (number | undefined)[]): Catalog {
    const models = structuredClone(baseline.models)
      .filter((m) => m.tuning.length)
      .slice(0, gains.length)
      .map((m, i) => ({
        ...m,
        tuning: [{ ...m.tuning[0], workloads: [], uplift: gains[i] }],
      }));
    return { ...baseline, count: models.length, models };
  }
  it('calculates odd and even medians numerically, retaining zero and negative gains', () => {
    expect(stats(withGains([10, -5, 0]))).toMatchObject({
      optimizedPairs: 3,
      optimizedCoverage: 100,
      medianImprovement: 0,
      minImprovement: -5,
      bestImprovement: 10,
    });
    expect(stats(withGains([100, 2, 10, 4])).medianImprovement).toBe(7);
    expect(stats(withGains([-10, -2])).bestImprovement).toBe(-2);
  });
  it('uses each pair’s best workload, falling back only when workloads are absent', () => {
    const c = withGains([200, 10, undefined]);
    c.models[0].tuning[0].workloads = [
      { name: 'long', uplift: 5 },
      { name: 'short', uplift: 20 },
    ];
    expect(stats(c)).toMatchObject({
      optimizedPairs: 3,
      medianImprovement: 15,
      minImprovement: 10,
      bestImprovement: 20,
    });
    expect(stats(c).bestRecipe?.model.name).toBe(c.models[0].name);
  });
  it('does not count older measurements or references to missing optimized recipes', () => {
    const c = withGains([12]);
    const t = c.models[0].tuning[0];
    c.models[0].tuning.push(
      { ...t, optimized: t.optimized.split('@')[0] + '@0.0.1', uplift: 999 },
      { ...t, optimized: 'unavailable@1.0.0', uplift: 999 },
    );
    expect(stats(c)).toMatchObject({
      optimizedPairs: 1,
      medianImprovement: 12,
      bestImprovement: 12,
    });
  });
  it('keeps missing improvements and empty catalogs distinct from measured zero', () => {
    for (const c of [withGains([]), withGains([undefined])])
      expect(stats(c)).toMatchObject({
        medianImprovement: null,
        minImprovement: null,
        bestImprovement: null,
        bestRecipe: null,
      });
    expect(stats(withGains([])).optimizedCoverage).toBe(0);
    expect(stats(withGains([0]))).toMatchObject({
      medianImprovement: 0,
      minImprovement: 0,
      bestImprovement: 0,
    });
    const c = withGains([10]);
    c.models[0].tuning = [];
    expect(stats(c)).toMatchObject({ optimizedPairs: 0, optimizedCoverage: 0 });
  });
});
describe('catalog queries', () => {
  it('combines OR hardware selection with AND engine/family filters and stable URL round trips', () => {
    const query = {
      ...initialQuery,
      hardware: ['NVIDIA-H100-80GB-HBM3', 'NVIDIA-B300-SXM6-AC'],
      family: 'glm',
      engine: 'sglang',
    };
    const q = parseQuery(queryHref(query).split('?')[1], baseline);
    const rs = queryRecipes(baseline, q);
    expect(rs.total).toBe(6);
    expect(rs.all.map((r) => r.key).sort()).toEqual([
      'glm-5.3-flash/sglang-tp8-b300-baseline',
      'glm-5.3-flash/sglang-tp8-b300-optimized',
      'glm-5.3-flash/sglang-tp8-h100-baseline',
      'glm-5.3-flash/sglang-tp8-h100-optimized',
      'glm5.3/sglang-tp4-b300-optimized',
      'glm5.3/sglang-tp8-b300-baseline',
    ]);
    expect(
      rs.all.every(
        (r) => r.model.family === 'glm' && r.variant.engine === 'sglang',
      ),
    ).toBe(true);
    expect(q.hardware).toEqual(query.hardware);
  });
  it('matches actual image and hardware fields, deduplicates model view, preserves missing values last', () => {
    expect(
      queryRecipes(baseline, {
        ...initialQuery,
        q: 'vllm/vllm-openai',
      }).all.every((r) => r.variant.image?.repository === 'vllm/vllm-openai'),
    ).toBe(true);
    const models = queryRecipes(baseline, {
      ...initialQuery,
      view: 'models',
      hardware: ['NVIDIA-H100-80GB-HBM3'],
    });
    expect(new Set(models.all.map((r) => r.model.name)).size).toBe(
      models.total,
    );
    const all = queryRecipes(baseline, initialQuery).all;
    const firstMissing = all.findIndex((r) => r.quotedGain == null);
    expect(all.slice(firstMissing).every((r) => r.quotedGain == null)).toBe(
      true,
    );
    expect(all[0].quotedGain).toBe(195.3);
    expect(compare(all[0], all[0], 'improvement-desc')).toBe(0);
  });
  it('normalizes invalid parameters and keeps report selection out of list state', () => {
    const q = parseQuery(
      '?engine=nope&hardware=missing&page=-2&layout=bad&benchmark=mimo-v2.5%2Fx',
      baseline,
    );
    expect(q.engine).toBe('');
    expect(q.page).toBe(1);
    expect(q.layout).toBe('cards');
    expect(q).not.toHaveProperty('benchmark');
    expect(queryHref(q)).not.toContain('benchmark');
    expect(queryRecipes(baseline, { ...q, page: 999 }).page).toBe(6);
  });
  it('supports new source records without adding site routes and processes 5000 recipes', () => {
    const large: Catalog = {
      ...baseline,
      count: 1,
      models: [
        {
          ...baseline.models[0],
          name: 'capacity-test',
          variants: Array.from({ length: 5000 }, (_, i) => ({
            ...baseline.models[0].variants[0],
            id: `recipe-${i}`,
            path: `models/capacity-test/recipe-${i}.yaml`,
            history: `models/capacity-test/recipe-${i}.history.json`,
          })),
        },
      ],
    };
    expect(
      queryRecipes(parseCatalog(large), { ...initialQuery, q: 'recipe-4999' })
        .total,
    ).toBe(1);
  });
});
describe('configuration integrity and history ownership', () => {
  it('checks downloaded bytes before showing or copying a configuration', async () => {
    const r = recipesOf(baseline).find(
        (r) => r.key === 'mimo-v2.5/sglang-tp8-h100-optimized',
      )!,
      text = readFileSync('tests/fixtures/catalog/mimo.yaml', 'utf8');
    expect('sha256:' + createHash('sha256').update(text).digest('hex')).toBe(
      r.variant.digest,
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text)));
    await expect(loadYaml(r.variant)).resolves.toBe(text);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(text + '\n')),
    );
    await expect(loadYaml(r.variant)).rejects.toThrow('校验值');
  });
  it('trims newer revisions and rejects histories belonging to a different model', async () => {
    const r = recipesOf(baseline)[0],
      revision = {
        version: r.variant.version,
        digest: r.variant.digest,
        subject: 'fixture',
        commit: r.variant.commit,
      };
    const h = {
      model: r.model.name,
      id: r.variant.id,
      path: r.variant.path,
      revisions: [
        { ...revision, digest: 'sha256:' + 'a'.repeat(64) },
        revision,
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(h))),
    );
    expect((await loadHistory(r)).revisions).toHaveLength(1);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ...h, model: 'different-model' })),
        ),
    );
    await expect(loadHistory(r)).rejects.toThrow('不属于');
  });
});

describe('unified recipe navigation', () => {
  const recipe = recipesOf(baseline).find(
    (r) => r.key === 'mimo-v2.5/sglang-tp8-h100-optimized',
  )!;
  it('keeps the report snapshot separate from the original list query', () => {
    const returnTo =
      '/models?q=mimo&layout=table&page=2&hardware=NVIDIA-H100-80GB-HBM3';
    const url = new URL(
      reportHref(recipe, baseline.commit, returnTo),
      'https://site.test',
    );
    expect(url.pathname).toBe('/models/recipe');
    expect(url.searchParams.get('tab')).toBe('performance');
    expect(url.searchParams.get('modelId')).toBe(recipe.model.name);
    expect(url.searchParams.get('recipeId')).toBe(recipe.variant.id);
    expect(url.searchParams.get('dataVersion')).toBe(baseline.commit);
    expect(url.searchParams.get('returnTo')).toBe(returnTo);
    expect(url.searchParams.has('benchmark')).toBe(false);
  });
  it('only restores catalog queries and removes legacy report selection', () => {
    expect(catalogReturnTo('/models?q=mimo&benchmark=old#benchmark')).toBe(
      '/models?q=mimo',
    );
    for (const value of [
      null,
      '',
      'https://evil.test/models',
      '//evil.test/models',
      '/models/report',
      '/models-extra',
      '/models\\evil',
      '/models?x=\n',
    ])
      expect(catalogReturnTo(value)).toBe('/models');
  });
  it('redirects old catalog report links while preserving their list context', () => {
    const url = new URL(
      legacyCatalogReportHref(
        '?q=mimo&page=2&benchmark=mimo-v2.5%2Fsglang-tp8-h100-optimized&dataVersion=' +
          baseline.commit,
      )!,
      'https://site.test',
    );
    expect(url.pathname).toBe('/models/recipe');
    expect(url.searchParams.get('tab')).toBe('performance');
    expect(url.searchParams.get('recipeId')).toBe(recipe.variant.id);
    expect(url.searchParams.get('returnTo')).toBe(
      '/models?q=mimo&page=2&dataVersion=' + baseline.commit,
    );
    expect(legacyCatalogReportHref('?q=mimo')).toBeNull();
    const missing = new URL(
      legacyCatalogReportHref('?benchmark=unknown')!,
      'https://site.test',
    );
    expect(missing.searchParams.get('modelId')).toBe('unknown');
    expect(missing.searchParams.get('recipeId')).toBe('');
  });
  it('redirects legacy recipe report anchors while retaining the selected configuration version', () => {
    const search =
      '?modelId=mimo-v2.5&recipeId=sglang-tp8-h100-optimized&version=1.0.0&dataVersion=' +
      baseline.commit;
    const url = new URL(
      legacyRecipeReportHref(search, '#benchmark')!,
      'https://site.test',
    );
    expect(url.pathname).toBe('/models/recipe');
    expect(url.searchParams.get('tab')).toBe('performance');
    expect(url.searchParams.get('dataVersion')).toBe(baseline.commit);
    expect(url.searchParams.get('version')).toBe('1.0.0');
    expect(legacyRecipeReportHref(search, '')).toBeNull();
  });
  it('round trips tabs without losing recipe, configuration or catalog context', () => {
    const params = new URLSearchParams({
      modelId: recipe.model.name,
      recipeId: recipe.variant.id,
      version: '1.0.0',
      dataVersion: baseline.commit,
      returnTo: '/models?q=mimo&layout=table&page=2',
    });
    for (const tab of ['deployment', 'performance', 'history'] as const) {
      const url = new URL(
        recipeTabHref(params.toString(), tab),
        'https://site.test',
      );
      expect(recipeTab(url.searchParams.get('tab'))).toBe(tab);
      for (const [key, value] of params)
        expect(url.searchParams.get(key)).toBe(value);
    }
    expect(recipeTab('unknown')).toBe('deployment');
    expect(recipeTab(null)).toBe('deployment');
    const unsafe = new URL(
      recipeTabHref('?returnTo=https://evil.test', 'history'),
      'https://site.test',
    );
    expect(unsafe.searchParams.get('returnTo')).toBe('/models');
  });
});
