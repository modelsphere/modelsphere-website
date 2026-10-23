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
      tunedModels: 22,
      reports: 23,
      hardware: 6,
    });
    expect(baseline.models.some((m) => m.name === 'mock-llm')).toBe(true);
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
  it('normalizes invalid parameters and clamps pages without dropping the independent report selection', () => {
    const q = parseQuery(
      '?engine=nope&hardware=missing&page=-2&layout=bad&benchmark=mimo-v2.5%2Fx',
      baseline,
    );
    expect(q.engine).toBe('');
    expect(q.page).toBe(1);
    expect(q.layout).toBe('cards');
    expect(q.benchmark).toBe('mimo-v2.5/x');
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
