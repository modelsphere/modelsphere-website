import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import baseline from '../../content/catalog/baseline.json';
import { parseCatalog } from '../../src/features/catalog/data';
import report from '../fixtures/catalog/mimo-report.json';
const yaml = readFileSync('tests/fixtures/catalog/mimo.yaml', 'utf8');
const m = baseline.models.find((m) => m.name === 'mimo-v2.5')!;
const variant = m.variants.find((v) => v.id === 'sglang-tp8-h100-optimized')!;
test.beforeEach(async ({ page }) => {
  await page.route(
    'https://modelsphere.github.io/model-catalog/**',
    (route) => {
      const url = route.request().url();
      if (url.endsWith('index-v2.json'))
        return route.fulfill({ json: baseline });
      if (url.endsWith('.history.json'))
        return route.fulfill({
          json: {
            model: m.name,
            id: variant.id,
            path: variant.path,
            revisions: [
              {
                version: variant.version,
                commit: variant.commit,
                digest: variant.digest,
                releaseDate: variant.releaseDate,
                subject: 'Published source revision',
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
        return route.fulfill({ body: yaml, contentType: 'text/plain' });
      if (route.request().url().endsWith('mimo-v2.5-h100-report.html'))
        return route.fulfill({
          body: `<!doctype html><html><body><script>window.upstreamScriptExecuted=true</script><script type="application/json" id="autotune-report-data">${JSON.stringify(report)}</script></body></html>`,
          contentType: 'text/html',
        });
      return route.abort();
    },
  );
});
test('source-backed list, dynamic filters, shareable queries, model/table views and history navigation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/models');
  await expect(page.getByText('公开目录 ·', { exact: false })).toBeVisible();
  await expect(page.locator('[data-recipe-id]')).toHaveCount(12);
  await page
    .locator('label')
    .filter({ hasText: 'H100' })
    .filter({ has: page.locator('input[type=checkbox]') })
    .first()
    .click();
  await expect(page).toHaveURL(/hardware=NVIDIA-H100/);
  await expect(page.locator('[data-recipe-id]').first()).not.toContainText(
    'B300',
  );
  await page.getByRole('button', { name: '重置筛选' }).click();
  await page.getByRole('textbox', { name: '搜索模型目录' }).fill('mimo-v2.5');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.locator('[data-recipe-id]')).toHaveCount(2);
  await page.getByRole('button', { name: '表格视图' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByText('视图与更多筛选').click();
  await page.getByLabel('内容视图').selectOption('models');
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});
for (const width of [390, 1440])
  test(`catalog query changes preserve the viewport without a jump at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/models');
    await expect(page.getByText('公开目录 ·', { exact: false })).toBeVisible();
    const filters = page.getByRole('search');
    await filters.evaluate((element) =>
      window.scrollTo({
        top: window.scrollY + element.getBoundingClientRect().top - 90,
        behavior: 'instant',
      }),
    );
    const initialTop = await page.evaluate(() => window.scrollY);
    expect(initialTop).toBeGreaterThan(250);
    await page.getByLabel('全部模型家族', { exact: true }).focus();
    async function staysPut(action: () => Promise<unknown>, url: RegExp) {
      const samples = page.evaluate(async () => {
        const positions = [window.scrollY];
        for (let frame = 0; frame < 30; frame++) {
          await new Promise(requestAnimationFrame);
          positions.push(window.scrollY);
        }
        return positions;
      });
      await action();
      await expect(page).toHaveURL(url);
      const positions = await samples;
      await info.attach('scroll-position-samples', {
        body: JSON.stringify({ url: page.url(), initialTop, positions }),
        contentType: 'application/json',
      });
      expect(Math.min(...positions)).toBeGreaterThanOrEqual(initialTop - 2);
      expect(Math.max(...positions)).toBeLessThanOrEqual(initialTop + 2);
      expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(
        initialTop,
        0,
      );
    }
    await staysPut(
      () =>
        page.getByLabel('全部模型家族', { exact: true }).selectOption('glm'),
      /family=glm/,
    );
    await expect(
      page.getByLabel('全部模型家族', { exact: true }),
    ).toBeFocused();
    await staysPut(
      () =>
        page.getByLabel('全部推理引擎', { exact: true }).selectOption('sglang'),
      /engine=sglang/,
    );
    await staysPut(
      () =>
        page.getByLabel('全部技术标签', { exact: true }).selectOption('moe'),
      /tag=moe/,
    );
    await staysPut(
      () => page.getByRole('button', { name: '重置筛选' }).click(),
      /\/models$/,
    );
    await staysPut(
      () => page.getByRole('button', { name: /^全部硬件/ }).click(),
      /\/models$/,
    );
    await staysPut(
      () =>
        page
          .locator('label')
          .filter({ hasText: 'H100' })
          .filter({ has: page.locator('input[type=checkbox]') })
          .first()
          .click(),
      /hardware=NVIDIA-H100/,
    );
    await staysPut(
      () =>
        page.getByLabel('排序方式', { exact: true }).selectOption('name-asc'),
      /sort=name-asc/,
    );
    await staysPut(() => page.goBack(), /hardware=NVIDIA-H100[^#]*$/);
    await staysPut(() => page.goForward(), /sort=name-asc/);
    await page.screenshot({
      path: info.outputPath(`stationary-filters-${width}.png`),
    });
  });
for (const width of [390, 1440])
  test(`pagination brings filters below the header at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/models?hardware=NVIDIA-H100-80GB-HBM3&sort=name-asc');
    await expect(page.getByText('公开目录 ·', { exact: false })).toBeVisible();
    await expect(page.locator('[data-recipe-id]')).toHaveCount(12);
    const filters = page.getByRole('search');
    const pager = page.getByRole('navigation', { name: '目录分页' });
    async function expectFiltersAtTop() {
      await expect(filters).toBeFocused();
      await expect
        .poll(() =>
          filters.evaluate(
            (element) =>
              element.getBoundingClientRect().top -
              (document.querySelector('.site-header')?.getBoundingClientRect()
                .bottom ?? 0),
          ),
        )
        .toBeCloseTo(16, 0);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(250);
    }
    const firstRecipe = await page
      .locator('[data-recipe-id]')
      .first()
      .getAttribute('data-recipe-id');
    for (const number of [2, 3, 4]) {
      await pager.getByRole('button', { name: '下一页', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`page=${number}$`));
      await expectFiltersAtTop();
      expect(
        await page
          .locator('[data-recipe-id]')
          .first()
          .getAttribute('data-recipe-id'),
      ).not.toBe(firstRecipe);
      await expect(page.getByLabel('排序方式', { exact: true })).toHaveValue(
        'name-asc',
      );
    }
    await expect(page.locator('[data-recipe-id]')).toHaveCount(6);
    await expect(
      pager.getByRole('button', { name: '下一页', exact: true }),
    ).toBeDisabled();
    await pager.getByRole('button', { name: '上一页', exact: true }).click();
    await expect(page).toHaveURL(/page=3$/);
    await expectFiltersAtTop();
    await page.screenshot({
      path: info.outputPath(`pagination-filters-${width}.png`),
    });
    const top = await page.evaluate(() => window.scrollY);
    await page.getByLabel('全部模型家族', { exact: true }).selectOption('glm');
    await expect(page).toHaveURL(/family=glm/);
    expect(new URL(page.url()).searchParams.has('page')).toBe(false);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(top, 0);
  });
test('skip-to-content still focuses main content and cross-page navigation starts at the top', async ({
  page,
}) => {
  await page.goto('/models');
  await expect(page.locator('[data-recipe-id]')).toHaveCount(12);
  const skip = page.getByRole('link', { name: '跳到主要内容', exact: true });
  await skip.focus();
  await skip.click();
  await expect(page.locator('main').first()).toBeFocused();
  await page.getByRole('search').evaluate((element) =>
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - 90,
      behavior: 'instant',
    }),
  );
  await page
    .getByRole('navigation', { name: '主导航', exact: true })
    .getByRole('link', { name: '文档指南', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await skip.focus();
  await skip.click();
  await expect(page.locator('main').first()).toBeFocused();
});
test('report selection reads structured records without executing upstream scripts and survives filters', async ({
  page,
}) => {
  await page.goto('/models?q=mimo-v2.5');
  await expect(page.locator('[data-recipe-id]')).toHaveCount(2);
  await page.getByRole('button', { name: '查看对照报告', exact: true }).click();
  await expect(page).toHaveURL(/benchmark=mimo/);
  await expect(page.locator('#benchmark')).toContainText(
    'NVIDIA H100 80GB HBM3',
  );
  await expect(page.locator('#benchmark')).toContainText('50000');
  await expect(page.locator('#benchmark')).toContainText('119.9%');
  expect(await page.evaluate(() => 'upstreamScriptExecuted' in window)).toBe(
    false,
  );
  await page.getByLabel('全部模型家族').selectOption('glm');
  await expect(page.locator('#benchmark')).toContainText('MiMo-V2.5');
});
test('recipe details validate YAML, expose history and report missing versions explicitly', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(
    `/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}&dataVersion=${baseline.commit}`,
  );
  await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
  await page.getByRole('button', { name: '复制完整配方', exact: true }).click();
  await expect(page.getByText('已复制', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(yaml);
  await page.getByText('查看历史提交').click();
  await expect(page.getByText('Published source revision')).toBeVisible();
  await page.goto(
    `/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}&version=99.0.0`,
  );
  await expect(page.getByRole('alert')).toContainText('不在所选目录');
});
test('network failure, invalid identities and unavailable data versions keep distinct states', async ({
  page,
}) => {
  await page.route('**/index-v2.json', (r) => r.abort());
  await page.goto('/models');
  await expect(
    page.getByText('公开数据暂时不可达', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('[data-recipe-id]')).toHaveCount(12);
  await page.goto('/models/detail?modelId=missing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '来源不可用',
  );
  await page.goto(
    '/models/detail?modelId=mimo-v2.5&dataVersion=' + 'a'.repeat(40),
  );
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '目录版本不可用',
  );
  await page.goto('/models/recipe');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '参数不完整',
  );
});
for (const width of [320, 390, 768, 1280, 1440])
  for (const colorScheme of ['light', 'dark'] as const)
    test(`catalog stays readable at ${width}px in ${colorScheme}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/models');
      await expect(page.locator('[data-recipe-id]')).toHaveCount(12);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`catalog-${width}-${colorScheme}.png`),
        fullPage: true,
      });
    });
test('source confidence disclosure remains accessible at its own route', async ({
  page,
}) => {
  await page.goto('/models/evidence');
  await expect(
    page.getByRole('heading', { name: '当前源数据没有，页面不补造' }),
  ).toBeVisible();
});
test('static HTML contains the entire baseline and parameter detail routes work through Nginx', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto(baseURL + '/models');
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-recipe-id]')).toHaveCount(72);
  await page.goto(baseURL + '/models/recipe?modelId=mimo-v2.5');
  await expect(
    page.getByText('实时模型和配方详情需要 JavaScript。'),
  ).toBeVisible();
  await context.close();
});

test('a newly published model appears in fixed routes without rebuilding the website', async ({
  page,
}) => {
  const newer = structuredClone(parseCatalog(baseline));
  newer.commit = 'b'.repeat(40);
  newer.count++;
  const added = structuredClone(newer.models[0]);
  added.name = 'new-public-model';
  added.displayName = 'New public model';
  added.tuning = [];
  added.reports = [];
  added.variants = added.variants.slice(0, 1).map((v) => ({
    ...v,
    path: `models/new-public-model/${v.id}.yaml`,
    history: `models/new-public-model/${v.id}.history.json`,
  }));
  newer.models.push(added);
  await page.route('**/index-v2.json', (r) => r.fulfill({ json: newer }));
  await page.goto('/models?q=new-public-model');
  await expect(page.locator('[data-recipe-id]')).toHaveCount(1);
  await page
    .getByRole('link', { name: 'New public model', exact: true })
    .click();
  await expect(page).toHaveURL(/\/models\/detail\?/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'New public model',
  );
  await expect(page.locator('main')).toContainText('可用部署配方 · 1');
});

test('inconsistent configuration bytes and unreadable reports do not become verified facts', async ({
  page,
}) => {
  await page.route(
    'https://raw.githubusercontent.com/modelsphere/model-catalog/**',
    (r) =>
      r.fulfill({
        body: 'wrong configuration bytes',
        contentType: 'text/plain',
      }),
  );
  await page.goto(`/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}`);
  await expect(page.getByRole('alert')).toContainText('校验值与目录不一致');
  await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toHaveCount(0);
  await expect(page.locator('#benchmark')).toContainText(
    '结构化报告暂时不可用',
  );
  await expect(
    page.getByRole('link', { name: '打开完整原报告 ↗' }),
  ).toHaveAttribute('href', /mimo-v2.5-h100-report.html/);
});
