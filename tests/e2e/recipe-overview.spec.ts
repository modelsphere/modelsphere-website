import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import baseline from '../../content/catalog/baseline.json';
import { parseCatalog, type Catalog } from '../../src/features/catalog/data';

const id = 'sglang-tp4-b300-optimized';
const yaml = readFileSync('tests/fixtures/catalog/glm53.yaml', 'utf8');
const oldYaml = yaml.replace('version: 1.0.4', 'version: 0.9.0');
const digest = (text: string) =>
  `sha256:${createHash('sha256').update(text).digest('hex')}`;
const href = `/models/recipe?modelId=glm5.3&recipeId=${id}&dataVersion=${baseline.commit}`;

async function mount(page: Page, catalog = parseCatalog(baseline)) {
  const recipe = catalog.models
    .find((m) => m.name === 'glm5.3')!
    .variants.find((v) => v.id === id)!;
  await page.route(
    'https://modelsphere.github.io/model-catalog/**',
    (route) => {
      if (route.request().url().endsWith('index-v2.json'))
        return route.fulfill({ json: catalog });
      if (route.request().url().endsWith('.history.json'))
        return route.fulfill({
          json: {
            model: 'glm5.3',
            id,
            path: recipe.path,
            revisions: [
              {
                version: recipe.version,
                releaseDate: recipe.releaseDate,
                commit: recipe.commit,
                digest: recipe.digest,
                subject: 'Current recipe',
              },
              {
                version: '0.9.0',
                releaseDate: '2026-09-01',
                commit: 'a'.repeat(40),
                digest: digest(oldYaml),
                subject: 'Old recipe',
              },
            ],
          },
        });
      return route.abort();
    },
  );
  await page.route(
    'https://raw.githubusercontent.com/modelsphere/model-catalog/**',
    (route) => {
      if (route.request().url().endsWith('.yaml'))
        return route.fulfill({
          body: route
            .request()
            .url()
            .includes('/' + 'a'.repeat(40) + '/')
            ? oldYaml
            : yaml,
          contentType: 'text/plain',
        });
      return route.abort();
    },
  );
}

const overview = (page: Page) => page.locator('header[aria-label="配方概览"]');
const fact = (page: Page, label: string) =>
  overview(page)
    .locator('dl > div')
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole('definition');

for (const width of [320, 1440])
  for (const theme of ['light', 'dark'] as const)
    test(`recipe overview includes upstream metadata and every workload at ${width}px in ${theme}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await mount(page);
      let reportRequests = 0;
      page.on('request', (request) => {
        if (request.url().endsWith('-report.html')) reportRequests++;
      });
      await page.goto(href);
      await expect(
        page.getByText('原始 YAML · SHA-256 校验通过'),
      ).toBeVisible();
      await expect(
        overview(page).getByText('默认配方', { exact: true }),
      ).toBeVisible();
      await expect(
        overview(page).getByText('已调优', { exact: true }),
      ).toBeVisible();
      await expect(fact(page, '版本')).toContainText('1.0.4');
      await expect(fact(page, '版本')).toContainText('2026-10-12');
      await expect(fact(page, '引擎')).toHaveText('sglang');
      await expect(fact(page, '硬件')).toContainText('4 × B300');
      await expect(fact(page, '硬件')).toContainText('NVIDIA-B300-SXM6-AC');
      await expect(fact(page, '拓扑')).toHaveText('单节点');
      await expect(fact(page, 'Chart')).toHaveText('sglang >=0.7.8');
      await expect(fact(page, '镜像')).toHaveText('lmsysorg/sglang:v0.5.19');
      await expect(fact(page, '服务名称')).toHaveText('glm-5.3');
      const comparison = page.getByRole('region', {
        name: '配方调优对照 1',
        exact: true,
      });
      await expect(comparison.getByRole('listitem')).toHaveCount(2);
      await expect(comparison.getByRole('listitem').nth(0)).toContainText(
        'Agent 长上下文50k + 1.5k tokens+195.3%',
      );
      await expect(comparison.getByRole('listitem').nth(1)).toContainText(
        '文档问答8k + 1k tokens+30.6%',
      );
      await expect(comparison).toContainText(`测量版本：${id}@1.0.4`);
      const baselineLink = comparison.getByRole('link', {
        name: 'sglang-tp8-b300-baseline@1.0.4',
        exact: true,
      });
      const target = new URL(
        (await baselineLink.getAttribute('href'))!,
        'http://localhost',
      );
      expect(target.searchParams.get('recipeId')).toBe(
        'sglang-tp8-b300-baseline',
      );
      expect(target.searchParams.get('version')).toBe('1.0.4');
      expect(target.searchParams.get('dataVersion')).toBe(baseline.commit);
      await expect(
        comparison.getByRole('link', { name: '完整对照报告 ↗' }),
      ).toHaveAttribute('href', /glm5\.3-1\.0\.3-b300-report\.html#en$/);
      expect(reportRequests).toBe(0);
      const meterAppearance = async (meter: ReturnType<Page['locator']>) =>
        meter.evaluate((element) => ({
          gradient: getComputedStyle(
            element.querySelector('[data-gain-bar] > span')!,
          ).backgroundImage,
          color: getComputedStyle(element.querySelector('strong')!).color,
        }));
      const detailMeter = comparison.locator('[data-gain-value="195.3"]');
      const appearance = await meterAppearance(detailMeter);
      expect(appearance.gradient).toContain('linear-gradient');
      expect(
        parseFloat(
          await comparison
            .locator('[data-gain-value="30.6"]')
            .evaluate((element) =>
              getComputedStyle(element).getPropertyValue('--gain-progress'),
            ),
        ),
      ).toBeCloseTo((30.6 / 195.3) * 100);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await overview(page).screenshot({
        path: info.outputPath(`recipe-overview-${width}-${theme}.png`),
      });
      await baselineLink.click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'sglang-tp8-b300-baseline',
      );
      await expect(
        overview(page).getByText('基线', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('region', { name: '配方调优对照 1', exact: true }),
      ).toHaveCount(0);
      await page.goto('/models?q=glm5.3');
      const recipeMeter = page.locator(
        `[data-recipe-id="glm5.3/${id}"] [data-gain-value="195.3"]`,
      );
      await expect(recipeMeter).toBeVisible();
      expect(await meterAppearance(recipeMeter)).toEqual(appearance);
      await page.goto('/models?q=glm5.3&view=models');
      const modelMeter = page.locator(
        '[data-model-id="glm5.3"] [data-gain-value="195.3"]',
      );
      await expect(modelMeter).toBeVisible();
      expect(await meterAppearance(modelMeter)).toEqual(appearance);
    });

test('missing fields stay missing and a measured zero or regression is preserved', async ({
  page,
}) => {
  const catalog = parseCatalog(baseline);
  const model = catalog.models.find((m) => m.name === 'glm5.3')!;
  const recipe = model.variants.find((v) => v.id === id)!;
  delete recipe.releaseDate;
  delete recipe.image;
  delete recipe.servedName;
  recipe.chart = {};
  model.tuning = [
    {
      baseline: 'deleted-baseline@0.8.0',
      optimized: `${id}@1.0.4`,
      workloads: [
        { name: 'zero', uplift: 0 },
        { name: 'regression', uplift: -5 },
      ],
    },
  ];
  await mount(page, catalog);
  await page.goto(href);
  await expect(fact(page, '版本')).toContainText('日期未提供');
  for (const label of ['镜像', '服务名称', 'Chart'])
    await expect(fact(page, label)).toHaveText('未提供');
  const comparison = page.getByRole('region', {
    name: '配方调优对照 1',
    exact: true,
  });
  await expect(comparison).toContainText('deleted-baseline@0.8.0');
  await expect(comparison.getByRole('link')).toHaveCount(0);
  await expect(comparison.getByRole('listitem').nth(0)).toContainText('+0.0%');
  await expect(comparison.getByRole('listitem').nth(1)).toContainText('-5.0%');
});

test('each comparison retains its own baseline and headline fallback', async ({
  page,
}) => {
  const catalog: Catalog = parseCatalog(baseline);
  const model = catalog.models.find((m) => m.name === 'glm5.3')!;
  const original = model.tuning[0];
  model.tuning.push({
    baseline: '',
    optimized: original.optimized,
    uplift: 7,
    workloads: [],
  });
  await mount(page, catalog);
  await page.goto(href);
  const second = page.getByRole('region', {
    name: '配方调优对照 2',
    exact: true,
  });
  await expect(second).toContainText('未提供的基线');
  await expect(second.getByRole('listitem')).toHaveCount(1);
  await expect(second.getByRole('listitem')).toContainText('记录提升+7.0%');
});

test('historical YAML does not replace current recipe metadata or measured comparisons', async ({
  page,
}) => {
  await mount(page);
  await page.goto(href + '&version=0.9.0');
  await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
  await expect(
    page.getByRole('tabpanel', { name: '部署配置' }).locator('pre').first(),
  ).toHaveText(oldYaml);
  await expect(
    page.getByText('当前查看配置版本：0.9.0', { exact: false }),
  ).toBeVisible();
  await expect(fact(page, '版本')).toContainText('1.0.4');
  await expect(fact(page, '版本')).toContainText('2026-10-12');
  await expect(
    page.getByRole('region', { name: '配方调优对照 1', exact: true }),
  ).toContainText(`测量版本：${id}@1.0.4`);
});
