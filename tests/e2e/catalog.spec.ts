import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import baseline from '../../content/catalog/baseline.json';
import { parseCatalog } from '../../src/features/catalog/data';
import report from '../fixtures/catalog/mimo-report.json';
const yaml = readFileSync('tests/fixtures/catalog/mimo.yaml', 'utf8');
const m = baseline.models.find((m) => m.name === 'mimo-v2.5')!;
const variant = m.variants.find((v) => v.id === 'sglang-tp8-h100-optimized')!;
async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

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
  const statistics = page.getByRole('region', { name: '目录统计' });
  await expect(statistics.locator(':scope > div')).toHaveCount(5);
  const pairs = statistics.locator(':scope > div').nth(2);
  await expect(pairs).toContainText('OPTIMIZED PAIRS');
  await expect(pairs.locator('strong')).toHaveText('23');
  await expect(pairs).toContainText('覆盖 79% 模型');
  const median = statistics.locator(':scope > div').nth(3);
  await expect(median).toContainText('MEDIAN IMPROVEMENT');
  await expect(median.locator('strong')).toHaveText('+32.4%');
  await expect(median).toContainText('范围 +5.3% 至 +195.3%');
  const best = statistics.locator(':scope > div').nth(4);
  await expect(best).toContainText('BEST IMPROVEMENT');
  await expect(best.locator('strong')).toHaveText('+195.3%');
  await expect(best.getByRole('link')).toHaveText(
    'glm5.3 · sglang-tp4-b300-optimized',
  );
  await expect(best.getByRole('link')).toHaveAttribute(
    'href',
    /recipe\?.*modelId=glm5.3.*tab=performance/,
  );
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
  await choose(page, '内容视图', '模型视角');
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});
for (const width of [320, 390, 768, 1280, 1440])
  for (const colorScheme of ['light', 'dark'] as const)
    test(`distinct model and recipe cards at ${width}px in ${colorScheme}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/models?q=mimo-v2.5');
      const recipe = page.locator(`[data-recipe-id="${m.name}/${variant.id}"]`);
      const title = recipe.getByRole('heading', { level: 2 }).getByRole('link');
      await expect(title).toHaveText(variant.id);
      const recipeWidth = (await recipe.boundingBox())!.width;
      const recipeUrl = new URL(
        (await title.getAttribute('href'))!,
        'http://localhost',
      );
      expect(recipeUrl.pathname).toBe('/models/recipe');
      expect(recipeUrl.searchParams.get('recipeId')).toBe(variant.id);
      expect(recipeUrl.searchParams.get('dataVersion')).toBe(baseline.commit);
      expect(recipeUrl.searchParams.has('tab')).toBe(false);
      const modelLink = recipe
        .locator('dl')
        .filter({ has: page.getByText('模型', { exact: true }) })
        .getByRole('link');
      await expect(modelLink).toHaveText(m.displayName!);
      await expect(modelLink).toHaveAttribute('href', /\/models\/detail\?/);
      await title.click();
      await expect(
        page.getByRole('tab', { name: '部署配置', selected: true }),
      ).toBeVisible();
      await page.goBack();
      await modelLink.click();
      await expect(page).toHaveURL(/\/models\/detail\?/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        m.displayName!,
      );
      await expect(
        page
          .getByRole('heading', { level: 3 })
          .getByRole('link', { name: variant.id, exact: true }),
      ).toHaveAttribute('href', /\/models\/recipe\?/);

      const catalog = '/models?q=glm-5.3-flash&view=models';
      await page.goto(catalog);
      const model = baseline.models.find(
        (model) => model.name === 'glm-5.3-flash',
      )!;
      const card = page.locator(`[data-model-id="${model.name}"]`);
      await expect(page.locator('[data-recipe-id]')).toHaveCount(0);
      await expect(card.getByRole('heading', { level: 2 })).toHaveText(
        model.displayName!,
      );
      expect((await card.boundingBox())!.width).toBeCloseTo(recipeWidth, 0);
      await expect(card).toContainText(model.description!);
      await expect(card).toContainText('调优配方最佳提升+12.5%');
      await expect(
        card
          .getByRole('definition')
          .filter({ hasText: 'sglang-tp8-b300-baseline@' }),
      ).toHaveCount(1);
      await expect(
        card.getByText(`可用配方 ${model.variants.length}`, { exact: true }),
      ).toBeVisible();
      const count = card.getByText(`可用配方 ${model.variants.length}`, {
        exact: true,
      });
      const centers = await count.evaluate((element) => {
        const middle = (node: Element) => {
          const box = node.getBoundingClientRect();
          return box.top + box.height / 2;
        };
        return {
          label: middle(element.querySelector('span')!),
          number: middle(element.querySelector('strong')!),
          family: middle(element.closest('article')!.querySelector('p')!),
        };
      });
      expect(Math.abs(centers.label - centers.number)).toBeLessThanOrEqual(1);
      expect(Math.abs(centers.label - centers.family)).toBeLessThanOrEqual(1);
      const countStyle = await count.evaluate((element) => {
        const label = getComputedStyle(element);
        const number = getComputedStyle(element.querySelector('strong')!);
        return {
          labelSize: parseFloat(label.fontSize),
          numberSize: parseFloat(number.fontSize),
          color: label.color,
          background: getComputedStyle(element.closest('article')!)
            .backgroundColor,
        };
      });
      expect(countStyle.labelSize).toBeGreaterThanOrEqual(12);
      expect(countStyle.labelSize).toBeLessThanOrEqual(14);
      expect(countStyle.numberSize).toBeGreaterThan(countStyle.labelSize);
      expect(countStyle.numberSize).toBeLessThan(
        await card
          .getByRole('heading', { level: 2 })
          .evaluate((element) =>
            parseFloat(getComputedStyle(element).fontSize),
          ),
      );
      expect((await count.boundingBox())!.height).toBeLessThanOrEqual(24);
      expect(countStyle.color).not.toBe(
        await card.evaluate((element) => getComputedStyle(element).color),
      );
      const luminance = (color: string) => {
        const channels = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map((n) => Number(n) / 255);
        const linear = channels.map((n) =>
          n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
        );
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      };
      const colors = [
        luminance(countStyle.color),
        luminance(countStyle.background),
      ].sort((a, b) => a - b);
      expect((colors[1] + 0.05) / (colors[0] + 0.05)).toBeGreaterThanOrEqual(
        4.5,
      );
      const view = page.getByRole('combobox', {
        name: '内容视图',
        exact: true,
      });
      await expect(view).toHaveText('模型视角');
      const family = page.getByRole('combobox', {
        name: '全部模型家族',
        exact: true,
      });
      const [viewBox, familyBox] = await Promise.all([
        view.boundingBox(),
        family.boundingBox(),
      ]);
      expect(viewBox).not.toBeNull();
      expect(familyBox).not.toBeNull();
      const hardwareHeight = (await page
        .getByRole('button', { name: /^全部硬件/ })
        .boundingBox())!.height;
      expect(hardwareHeight).toBe(width < 768 ? 44 : 32);
      const searchHeight = await page
        .getByRole('textbox', { name: '搜索模型目录' })
        .evaluate(
          (element) => element.parentElement!.getBoundingClientRect().height,
        );
      expect(searchHeight).toBe(width < 768 ? 48 : 40);
      const viewToggleHeight = await page
        .getByRole('button', { name: '卡片视图', exact: true })
        .evaluate(
          (element) => element.parentElement!.getBoundingClientRect().height,
        );
      expect(viewToggleHeight).toBe(hardwareHeight);
      for (const name of [
        '内容视图',
        '全部模型家族',
        '全部推理引擎',
        '全部技术标签',
        '排序方式',
      ]) {
        const box = await page
          .getByRole('combobox', { name, exact: true })
          .boundingBox();
        expect(box!.height).toBeCloseTo(hardwareHeight, 0);
      }
      if (width < 768) expect(viewBox!.y).toBeLessThan(familyBox!.y);
      else {
        expect(viewBox!.x).toBeLessThan(familyBox!.x);
        expect(viewBox!.y).toBeCloseTo(familyBox!.y, 0);
      }
      await expect(
        page.getByRole('search').getByRole('combobox').first(),
      ).toHaveAccessibleName('内容视图');
      await expect(card.getByRole('list')).toHaveCount(0);
      await expect(
        card.getByRole('link', {
          name: '查看 sglang-tp8-b300-optimized 性能对照',
        }),
      ).toHaveAttribute('href', /tab=performance/);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await card.screenshot({
        path: info.outputPath(`model-card-${width}-${colorScheme}.png`),
      });
      await page.getByRole('search').evaluate((element) =>
        window.scrollTo({
          top: window.scrollY + element.getBoundingClientRect().top - 80,
          behavior: 'instant',
        }),
      );
      await page.screenshot({
        path: info.outputPath(
          `catalog-perspective-count-${width}-${colorScheme}.png`,
        ),
      });
      await card.getByRole('heading', { level: 2 }).getByRole('link').click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        model.displayName!,
      );
      const recipes = page.getByRole('region', { name: '可用部署配方' });
      await expect(recipes.locator('[data-recipe-id]')).toHaveCount(
        model.variants.length,
      );
      for (const v of model.variants) {
        const link = recipes
          .getByRole('heading', { level: 3 })
          .getByRole('link', { name: v.id, exact: true });
        const url = new URL(
          (await link.getAttribute('href'))!,
          'http://localhost',
        );
        expect(url.pathname).toBe('/models/recipe');
        expect(url.searchParams.get('recipeId')).toBe(v.id);
        expect(url.searchParams.get('modelId')).toBe(model.name);
        expect(url.searchParams.get('dataVersion')).toBe(baseline.commit);
        expect(url.searchParams.get('returnTo')).toBe(catalog);
      }
      await page.goBack();
      await expect(page).toHaveURL(catalog);
      await expect(card).toBeVisible();
    });

test('model cards default missing fields and include models without recipes', async ({
  page,
}) => {
  const catalog = structuredClone(parseCatalog(baseline));
  const model = catalog.models[0];
  catalog.models = [model];
  catalog.count = 1;
  model.displayName = '';
  model.description = '';
  model.variants = [];
  model.tuning = [];
  await page.route('**/index-v2.json', (route) =>
    route.fulfill({ json: catalog }),
  );
  await page.goto('/models?view=models');
  const card = page.locator('[data-model-id]');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText(model.name);
  await expect(card).toContainText('暂无模型说明。');
  await expect(card.getByText('可用配方 0', { exact: true })).toBeVisible();
  await expect(card.getByRole('list')).toHaveCount(0);
  await expect(card.getByText('未提供', { exact: true })).toHaveCount(3);
  await expect(card).not.toContainText('0.0%');
  await expect(card.locator('a[href*="/models/recipe?"]')).toHaveCount(0);
});

test('model cards preserve measured zero without a report or baseline reference', async ({
  page,
}) => {
  const catalog = structuredClone(parseCatalog(baseline));
  const model = catalog.models.find((model) => model.name === m.name)!;
  catalog.models = [model];
  catalog.count = 1;
  model.variants = model.variants.filter((v) => v.id === variant.id);
  model.tuning = [
    {
      baseline: '',
      optimized: `${variant.id}@${variant.version}`,
      uplift: 0,
      workloads: [],
    },
  ];
  await page.route('**/index-v2.json', (route) =>
    route.fulfill({ json: catalog }),
  );
  await page.goto('/models?view=models');
  const card = page.locator('[data-model-id]');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('+0.0%');
  await expect(card).toContainText('负载未提供');
  await expect(card.getByText('未提供', { exact: true })).toHaveCount(1);
  await expect(card.locator('a[href*="tab=performance"]')).toHaveCount(0);
});

test('model pagination and recipe filters keep complete model summaries', async ({
  page,
}) => {
  await page.goto('/models?view=models');
  await expect(page.locator('[data-model-id]')).toHaveCount(12);
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page).toHaveURL(/view=models&page=2/);
  await page.reload();
  await expect(page.locator('[data-model-id]')).toHaveCount(12);
  await page.goto(
    '/models?view=models&q=glm-5.3-flash&hardware=NVIDIA-H100-80GB-HBM3',
  );
  const card = page.locator('[data-model-id="glm-5.3-flash"]');
  await expect(card.getByText('可用配方 4', { exact: true })).toBeVisible();
  await expect(card.getByRole('listitem')).toHaveCount(0);
  await expect(card).toContainText('+12.5%');
  await page.getByRole('button', { name: '表格视图', exact: true }).click();
  const table = page.getByRole('table', { name: '模型目录', exact: true });
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table).toContainText('+12.5%');
  await expect(table.getByRole('listitem')).toHaveCount(4);
});

for (const width of [390, 1440])
  for (const colorScheme of ['light', 'dark'] as const)
    test(`catalog dropdown keyboard, selection and dismissal at ${width}px in ${colorScheme}`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/models?family=glm');
      const perspective = page.getByRole('combobox', {
        name: '内容视图',
        exact: true,
      });
      await expect(perspective).toBeVisible();
      await expect(perspective).toHaveText('配方视角');
      await choose(page, '内容视图', '模型视角');
      await expect(page).toHaveURL(/family=glm&view=models/);
      await expect(page.locator('[data-model-id]').first()).toBeVisible();
      await choose(page, '内容视图', '配方视角');
      await expect(page).toHaveURL(/\/models\?family=glm$/);
      await expect(page.locator('[data-recipe-id]').first()).toBeVisible();
      const trigger = page.getByRole('combobox', {
        name: '全部模型家族',
        exact: true,
      });
      await expect(trigger).toHaveText('glm');
      await trigger.focus();
      await page.keyboard.press('Enter');
      const list = page.getByRole('listbox');
      await expect(list).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'glm', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      const box = (await list.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      await page.screenshot({
        path: info.outputPath(`catalog-dropdown-${width}-${colorScheme}.png`),
      });
      await page.keyboard.press('/');
      await expect(list).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(list).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      // A modal select makes outside elements inert; use a real pointer click
      // in the visible page gutter to exercise outside dismissal.
      await page.mouse.click(width - 4, 450);
      await expect(list).toBeHidden();
      await trigger.focus();
      await page.keyboard.press('Space');
      await expect(
        page.getByRole('option', { name: 'glm', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Home');
      await expect(
        page.getByRole('option', { name: '全部模型家族', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/models$/);
      await expect(trigger).toHaveText('全部模型家族');
      await expect(trigger).toBeFocused();
      await page.getByText('视图与更多筛选', { exact: true }).click();
      await choose(page, '配方角色', '基线');
      await expect(page).toHaveURL(/role=baseline/);
      await choose(page, '部署拓扑', '单节点');
      await expect(page).toHaveURL(/topology=single-node/);
      await page.getByRole('button', { name: '重置筛选' }).click();
      await expect(page).toHaveURL(/\/models$/);
      await expect(page.getByRole('combobox', { name: '配方角色' })).toHaveText(
        '全部角色',
      );
      await expect(page.getByRole('combobox', { name: '部署拓扑' })).toHaveText(
        '全部拓扑',
      );
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
    await staysPut(() => choose(page, '全部模型家族', 'glm'), /family=glm/);
    await expect(
      page.getByLabel('全部模型家族', { exact: true }),
    ).toBeFocused();
    await staysPut(
      () => choose(page, '全部推理引擎', 'sglang'),
      /engine=sglang/,
    );
    await staysPut(() => choose(page, '全部技术标签', 'moe'), /tag=moe/);
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
      () => choose(page, '排序方式', '按模型名称 A–Z'),
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
      await expect(page.getByLabel('排序方式', { exact: true })).toHaveText(
        '按模型名称 A–Z',
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
    await choose(page, '全部模型家族', 'glm');
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
for (const recipeRole of ['baseline', 'recipe'])
  test(`${recipeRole} recipe cards open deployment configuration`, async ({
    page,
  }) => {
    await page.goto(`/models?role=${recipeRole}`);
    await expect(page.getByText('公开目录 ·', { exact: false })).toBeVisible();
    const cards = page.locator('[data-recipe-id]');
    await expect(cards.first()).toBeVisible();
    await expect(
      cards.getByRole('link', { name: '查看部署配置', exact: true }),
    ).toHaveCount(await cards.count());
    await expect(
      cards.getByRole('link', { name: '查看对照报告', exact: true }),
    ).toHaveCount(0);
    await cards
      .first()
      .getByRole('link', { name: '查看部署配置', exact: true })
      .click();
    await expect(
      page.getByRole('tab', { name: '部署配置', selected: true }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get('tab')).toBeNull();
  });

for (const layout of ['cards', 'table'])
  test(`recipe details consolidate deployment, performance and history from ${layout}`, async ({
    page,
  }) => {
    const catalog = `/models?q=mimo-v2.5&sort=name-asc&layout=${layout}`;
    await page.goto(catalog);
    await expect(page.locator('[data-catalog-enhanced="true"]')).toBeVisible();
    if (layout === 'cards') {
      await expect(
        page.getByRole('link', { name: '查看部署配置', exact: true }),
      ).toHaveCount(1);
      await expect(
        page.getByRole('link', { name: '查看对照报告', exact: true }),
      ).toHaveCount(1);
    } else {
      await expect(
        page.getByRole('link', { name: '查看配方详情', exact: true }),
      ).toHaveCount(2);
    }
    await expect(
      page.getByRole('link', { name: '查看对照报告', exact: true }),
    ).toHaveCount(layout === 'cards' ? 1 : 0);
    const recipe =
      layout === 'cards'
        ? page.locator(`[data-recipe-id="${m.name}/${variant.id}"]`)
        : page.getByRole('row').filter({ hasText: variant.id });
    await recipe
      .getByRole('link', {
        name: layout === 'cards' ? '查看对照报告' : '查看配方详情',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/models\/recipe\?/);
    expect(new URL(page.url()).searchParams.get('dataVersion')).toBe(
      baseline.commit,
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      variant.id,
    );
    if (layout === 'cards') {
      await expect(
        page.getByRole('tab', { name: '性能对照', selected: true }),
      ).toBeVisible();
      await page.getByRole('tab', { name: '部署配置' }).click();
    }
    await expect(
      page.getByRole('tab', { name: '部署配置', selected: true }),
    ).toBeVisible();
    await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
    await page.getByRole('tab', { name: '版本历史' }).click();
    await expect(
      page.getByRole('tabpanel', { name: '版本历史' }),
    ).toContainText('Published source revision');
    await page.getByRole('tab', { name: '性能对照' }).click();
    await expect(page).toHaveURL(/tab=performance/);
    await expect(page.getByRole('search')).toHaveCount(0);
    await expect(page.locator('#benchmark')).toContainText(
      'NVIDIA H100 80GB HBM3',
    );
    await expect(page.locator('#benchmark')).toContainText('50000');
    await expect(page.locator('#benchmark')).toContainText('119.9%');
    expect(await page.evaluate(() => 'upstreamScriptExecuted' in window)).toBe(
      false,
    );
    await page.reload();
    await expect(
      page.getByRole('tab', { name: '性能对照', selected: true }),
    ).toBeVisible();
    await expect(page.locator('#benchmark')).toContainText('119.9%');
    await page.getByRole('link', { name: '返回模型目录', exact: true }).click();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
      catalog,
    );
    await expect(page.locator('#benchmark')).toHaveCount(0);
    await expect(page.getByLabel('搜索模型目录', { exact: true })).toHaveValue(
      'mimo-v2.5',
    );
    await page.goBack();
    await expect(page).toHaveURL(/\/models\/recipe\?.*tab=performance/);
  });

test('model recipe entries and performance gains lead into the same recipe details', async ({
  page,
}) => {
  const catalog = '/models?q=mimo-v2.5&sort=name-asc';
  await page.goto(catalog);
  await expect(page.locator('[data-recipe-id]')).toHaveCount(2);
  await page
    .getByRole('link', { name: 'MiMo-V2.5', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/models\/detail\?/);
  await page
    .getByRole('link', { name: `查看 ${variant.id} 性能对照`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/models\/recipe\?.*tab=performance/);
  await expect(page.locator('#benchmark')).toContainText('119.9%');
  await page.getByRole('tab', { name: '部署配置' }).click();
  await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
  await expect(page.locator('#benchmark')).toBeHidden();
  await page.getByRole('tab', { name: '性能对照' }).click();
  await expect(page.locator('#benchmark')).toContainText('119.9%');
  await page.getByRole('link', { name: '返回模型目录', exact: true }).click();
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
    catalog,
  );
});

test('returning from a report restores pagination and hardware filters', async ({
  page,
}) => {
  const catalog = '/models?hardware=NVIDIA-H100-80GB-HBM3&sort=name-asc&page=2';
  await page.goto(catalog);
  await expect(
    page.getByRole('navigation', { name: '目录分页' }),
  ).toContainText('第 2 /');
  await page
    .getByRole('link', { name: /性能对照$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/models\/recipe\?.*tab=performance/);
  await page.getByRole('link', { name: '返回模型目录', exact: true }).click();
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
    catalog,
  );
  await expect(
    page.getByRole('navigation', { name: '目录分页' }),
  ).toContainText('第 2 /');
});

for (const legacy of [
  `/models?q=mimo-v2.5&benchmark=mimo-v2.5%2F${variant.id}&dataVersion=${baseline.commit}#benchmark`,
  `/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}&dataVersion=${baseline.commit}#benchmark`,
  `/models/report?modelId=mimo-v2.5&recipeId=${variant.id}&dataVersion=${baseline.commit}`,
])
  test(`legacy report link redirects: ${legacy.split('?')[0]}`, async ({
    page,
  }) => {
    await page.goto('/community');
    await page.goto(legacy);
    await expect(page).toHaveURL(/\/models\/recipe\?.*tab=performance/);
    await expect(page.locator('#benchmark')).toContainText('119.9%');
    await page.goBack();
    await expect(page).toHaveURL(/\/community$/);
  });

for (const width of [320, 1440])
  test(`recipe tabs keep keyboard focus, URL history and loaded data at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const counts = { yaml: 0, history: 0, report: 0, catalog: 0 };
    page.on('request', (request) => {
      const url = request.url();
      if (url.endsWith('.yaml')) counts.yaml++;
      if (url.endsWith('.history.json')) counts.history++;
      if (url.endsWith('mimo-v2.5-h100-report.html')) counts.report++;
      if (url.endsWith('index-v2.json')) counts.catalog++;
    });
    await page.goto(
      `/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}&dataVersion=${baseline.commit}`,
    );
    await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
    await expect(page.getByText('公开目录 ·', { exact: false })).toBeVisible();
    const version = page.getByRole('combobox', { name: '配方版本' });
    await expect(version).toHaveText(`当前版本 ${variant.version}`);
    await version.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(version).toBeFocused();
    const before = { ...counts };
    expect(before.report).toBe(0);
    const deployment = page.getByRole('tab', { name: '部署配置' });
    const performance = page.getByRole('tab', { name: '性能对照' });
    const history = page.getByRole('tab', { name: '版本历史' });
    await deployment.focus();
    await page.keyboard.press('ArrowRight');
    await expect(performance).toBeFocused();
    await expect(deployment).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(performance).toBeFocused();
    await expect(page.locator('#benchmark')).toContainText('119.9%');
    await expect(performance).toHaveAttribute('aria-selected', 'true');
    expect(counts.report).toBe(1);
    const top = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('End');
    await expect(history).toBeFocused();
    await page.keyboard.press('Space');
    await expect(history).toBeFocused();
    await expect(
      page.getByRole('tabpanel', { name: '版本历史' }),
    ).toContainText('Published source revision');
    await expect(page).toHaveURL(/tab=history/);
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(top, 0);
    await page.goBack();
    await expect(performance).toHaveAttribute('aria-selected', 'true');
    await page.goForward();
    await expect(history).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await expect(history).toHaveAttribute('aria-selected', 'true');
    // Reload starts a new page lifecycle; verify tab reuse within that lifecycle.
    await history.focus();
    await page.keyboard.press('Home');
    await expect(deployment).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
    const afterReload = { ...counts };
    await performance.click();
    await expect(page.locator('#benchmark')).toContainText('119.9%');
    await history.click();
    await deployment.click();
    await performance.click();
    expect(counts).toEqual({ ...afterReload, report: afterReload.report + 1 });
    expect(new URL(page.url()).searchParams.get('dataVersion')).toBe(
      baseline.commit,
    );
  });

test('history opens the exact configuration and keeps reports bound to their measured version', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const oldVersion = '0.9.0';
  const oldCommit = 'c'.repeat(40);
  const oldYaml = yaml.replace(
    `version: ${variant.version}`,
    `version: ${oldVersion}`,
  );
  const oldDigest =
    'sha256:' + createHash('sha256').update(oldYaml).digest('hex');
  await page.route('**/*.history.json', (route) =>
    route.fulfill({
      json: {
        model: m.name,
        id: variant.id,
        path: variant.path,
        revisions: [
          {
            version: variant.version,
            commit: variant.commit,
            digest: variant.digest,
            subject: 'Current revision',
          },
          {
            version: oldVersion,
            commit: oldCommit,
            digest: oldDigest,
            subject: 'Historical revision',
          },
        ],
      },
    }),
  );
  await page.route(`**/${oldCommit}/**/*.yaml`, (route) =>
    route.fulfill({ body: oldYaml, contentType: 'text/plain' }),
  );
  const returnTo = '/models?q=mimo&layout=table&page=2';
  await page.goto(
    `/models/recipe?modelId=${m.name}&recipeId=${variant.id}&dataVersion=${baseline.commit}&tab=history&returnTo=${encodeURIComponent(returnTo)}`,
  );
  await page
    .getByRole('link', { name: `查看 v${oldVersion} 配置 →`, exact: true })
    .click();
  await expect(
    page.getByRole('tab', { name: '部署配置', selected: true }),
  ).toBeVisible();
  await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
  await expect(page.getByRole('combobox', { name: '配方版本' })).toHaveText(
    `${oldVersion} · 日期未提供`,
  );
  await page.getByRole('button', { name: '复制完整配方' }).click();
  await expect(page.getByText('已复制', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    oldYaml,
  );
  await page.getByRole('tab', { name: '性能对照' }).click();
  await expect(page.locator('#benchmark')).toContainText('119.9%');
  await expect(page.getByRole('tabpanel', { name: '性能对照' })).toContainText(
    `报告对应测量版本：${variant.id}@${variant.version}`,
  );
  expect(new URL(page.url()).searchParams.get('version')).toBe(oldVersion);
  await page.reload();
  await expect(
    page.getByRole('tab', { name: '性能对照', selected: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '部署配置' }).click();
  await expect(
    page.getByRole('tabpanel', { name: '部署配置' }).locator('pre').first(),
  ).toHaveText(oldYaml);
  await choose(page, '配方版本', `当前版本 ${variant.version}`);
  expect(new URL(page.url()).searchParams.has('version')).toBe(false);
  await expect(
    page.getByRole('tabpanel', { name: '部署配置' }).locator('pre').first(),
  ).toHaveText(yaml);
  await choose(page, '配方版本', `${oldVersion} · 日期未提供`);
  await expect(page).toHaveURL(new RegExp(`version=${oldVersion}`));
  await expect(
    page.getByRole('tabpanel', { name: '部署配置' }).locator('pre').first(),
  ).toHaveText(oldYaml);
  await page.getByRole('link', { name: '返回模型目录', exact: true }).click();
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
    returnTo,
  );
});

test('configuration and history failures leave performance available and support retry', async ({
  page,
}) => {
  let historyFailed = true;
  await page.route('**/*.history.json', async (route) => {
    if (historyFailed) return route.abort();
    await route.fallback();
  });
  await page.goto(
    `/models/recipe?modelId=${m.name}&recipeId=${variant.id}&version=99.0.0&tab=history`,
  );
  const history = page.getByRole('tabpanel', { name: '版本历史' });
  await expect(history).toContainText('版本历史暂时不可用');
  historyFailed = false;
  await history.getByRole('button', { name: '重试' }).click();
  await expect(history).toContainText('Published source revision');
  await page.getByRole('tab', { name: '部署配置' }).click();
  await expect(page.getByRole('alert')).toContainText('不在所选目录');
  await page.getByRole('tab', { name: '性能对照' }).click();
  await expect(page.locator('#benchmark')).toContainText('119.9%');
  await expect(page.getByRole('alert')).toBeHidden();
});

test('an unknown tab falls back to deployment without discarding the configuration version', async ({
  page,
}) => {
  await page.goto(
    `/models/recipe?modelId=${m.name}&recipeId=${variant.id}&version=${variant.version}&tab=unknown`,
  );
  await expect(
    page.getByRole('tab', { name: '部署配置', selected: true }),
  ).toBeVisible();
  await expect(page.getByText('原始 YAML · SHA-256 校验通过')).toBeVisible();
  await expect(page.getByRole('combobox', { name: '配方版本' })).toHaveText(
    `${variant.version} · ${variant.releaseDate ?? '日期未提供'}`,
  );
});

test('report routes distinguish incomplete, missing, unassociated and unavailable records', async ({
  page,
}) => {
  await page.goto('/models/report');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '详情参数不完整',
  );
  await page.goto('/models/report?modelId=mimo-v2.5&recipeId=missing');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '未找到模型或配方',
  );
  await page.goto(
    '/models/report?modelId=mimo-v2.5&recipeId=sglang-tp8-h100-baseline',
  );
  await expect(
    page.getByRole('status').filter({ hasText: '该配方暂无可用对照报告' }),
  ).toBeVisible();
  await expect(page.locator('#benchmark')).toHaveCount(0);
  await page.goto(
    `/models/report?modelId=mimo-v2.5&recipeId=${variant.id}&dataVersion=${'a'.repeat(40)}`,
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '目录版本不可用',
  );
  await expect(page.locator('#benchmark')).toHaveCount(0);
  await page.goto('/models?benchmark=missing');
  await expect(page).toHaveURL(/\/models\/recipe\?.*tab=performance/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '详情参数不完整',
  );
});

test('a report keeps its marked baseline when the catalog is offline and rejects external return links', async ({
  page,
}) => {
  await page.route('**/index-v2.json', (r) => r.abort());
  await page.goto(
    `/models/report?modelId=mimo-v2.5&recipeId=${variant.id}&dataVersion=${baseline.commit}&returnTo=https%3A%2F%2Fevil.test%2Fmodels`,
  );
  await expect(
    page.getByText('公开数据暂时不可达', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('#benchmark')).toContainText('119.9%');
  await expect(
    page.getByRole('link', { name: '返回模型目录', exact: true }),
  ).toHaveAttribute('href', '/models');
});

for (const width of [320, 390, 768, 1440])
  for (const colorScheme of ['light', 'dark'] as const)
    test(`recipe tabs stay readable at ${width}px in ${colorScheme}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(
        `/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}&tab=performance`,
      );
      await expect(page.locator('#benchmark')).toContainText('119.9%');
      for (const [tab, name] of [
        ['performance', '性能对照'],
        ['deployment', '部署配置'],
        ['history', '版本历史'],
      ]) {
        await page.getByRole('tab', { name, exact: true }).click();
        await expect(
          page.getByRole('tabpanel', { name, exact: true }),
        ).toBeVisible();
        if (tab === 'deployment') {
          await expect(
            page.getByText('原始 YAML · SHA-256 校验通过'),
          ).toBeVisible();
          await page.getByRole('combobox', { name: '配方版本' }).click();
          const list = page.getByRole('listbox');
          await expect(list).toBeVisible();
          const box = (await list.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          await page.screenshot({
            path: info.outputPath('recipe-version-dropdown.png'),
          });
          await page.keyboard.press('Escape');
        }
        if (tab === 'history')
          await expect(
            page.getByText('Published source revision'),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`recipe-${tab}-${width}-${colorScheme}.png`),
          fullPage: true,
        });
      }
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
  await page.getByRole('tab', { name: '版本历史' }).click();
  await expect(page.getByText('Published source revision')).toBeVisible();
  await page.goto(
    `/models/recipe?modelId=mimo-v2.5&recipeId=${variant.id}&version=99.0.0`,
  );
  await expect(page.getByRole('alert')).toContainText('不在所选目录');
});
for (const width of [390, 1440])
  for (const colorScheme of ['light', 'dark'] as const)
    test(`model overview and recipe region preserve content at ${width}px in ${colorScheme}`, async ({
      page,
    }, info) => {
      const model = baseline.models.find((model) => model.name === 'glm5.3')!;
      const returnTo = '/models?family=glm&sort=name-asc&page=2';
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(
        `/models/detail?modelId=${model.name}&dataVersion=${baseline.commit}&returnTo=${encodeURIComponent(returnTo)}`,
      );
      const heading = page.getByRole('heading', {
        name: model.displayName,
        level: 1,
        exact: true,
      });
      await expect(heading).toBeVisible();
      await expect(heading.locator('..')).toContainText(model.description!);
      for (const tag of model.tags)
        await expect(
          heading.locator('..').getByText(tag, { exact: true }),
        ).toBeVisible();
      await expect(
        page.getByRole('link', { name: `Hugging Face：${model.source!.hf}` }),
      ).toHaveAttribute('href', `https://huggingface.co/${model.source!.hf}`);
      const recipes = page.getByRole('region', { name: '可用部署配方' });
      await expect(recipes.locator('[data-recipe-id]')).toHaveCount(
        model.variants.length,
      );
      await expect(recipes.getByRole('heading', { level: 3 })).toHaveCount(
        model.variants.length,
      );
      await expect(
        recipes.getByRole('button', { name: '复制部署配置' }),
      ).toHaveCount(model.variants.length);
      const copyButton = recipes
        .getByRole('button', { name: '复制部署配置', exact: true })
        .first();
      const copyTooltip = recipes.getByRole('tooltip').first();
      await expect(copyTooltip).toBeHidden();
      await copyButton.hover();
      await expect(copyTooltip).toHaveText('复制部署配置');
      await expect(copyTooltip).toBeVisible();
      await copyButton.press('Escape');
      await expect(copyTooltip).toBeHidden();
      await page.getByRole('button', { name: /切换到[深浅]色模式/ }).focus();
      await copyButton.focus();
      await expect(copyTooltip).toBeVisible();
      for (const link of await recipes
        .getByRole('link', { name: /^查看(部署配置|对照报告)$/, exact: true })
        .all()) {
        const url = new URL(
          (await link.getAttribute('href'))!,
          'http://localhost',
        );
        expect(url.searchParams.get('dataVersion')).toBe(baseline.commit);
        expect(url.searchParams.get('returnTo')).toBe(returnTo);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`model-detail-${width}-${colorScheme}.png`),
        fullPage: true,
      });
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
  const reportResponse = await page.goto(
    baseURL + '/models/report?modelId=mimo-v2.5&recipeId=' + variant.id,
  );
  expect(reportResponse?.status()).toBe(200);
  await expect(
    page.getByText('对照报告需要 JavaScript。', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '阅读原始目录', exact: true }),
  ).toHaveAttribute('href', 'https://modelsphere.github.io/model-catalog/');
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
  const statistics = page.getByRole('region', { name: '目录统计' });
  await expect(statistics.locator('strong').first()).toHaveText('29');
  await expect(statistics.locator(':scope > div').nth(2)).toContainText(
    '覆盖 76% 模型',
  );
  await page
    .getByRole('link', { name: 'New public model', exact: true })
    .click();
  await expect(page).toHaveURL(/\/models\/detail\?/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'New public model',
  );
  await expect(page.locator('main')).toContainText('可用部署配方 · 1');
});

test('statistics follow live measurements and show missing gains without invented percentages', async ({
  page,
}) => {
  const newer = structuredClone(parseCatalog(baseline));
  newer.commit = 'c'.repeat(40);
  for (const model of newer.models)
    for (const tuning of model.tuning) {
      tuning.workloads = [];
      delete tuning.uplift;
    }
  newer.models.find((model) => model.tuning.length)!.tuning[0].uplift = -2;
  await page.route('**/index-v2.json', (route) =>
    route.fulfill({ json: newer }),
  );
  await page.goto('/models');
  await expect(page.getByText('公开目录 · ccccccc')).toBeVisible();
  const statistics = page.getByRole('region', { name: '目录统计' });
  await expect(statistics.locator('strong').nth(3)).toHaveText('-2.0%');
  await expect(statistics.locator('strong').nth(4)).toHaveText('-2.0%');
  delete newer.models.find((model) => model.tuning.length)!.tuning[0].uplift;
  await page.reload();
  await expect(page.getByText('公开目录 · ccccccc')).toBeVisible();
  await expect(statistics.locator('strong').nth(3)).toHaveText('未提供');
  await expect(statistics.locator('strong').nth(4)).toHaveText('未提供');
  await expect(statistics.getByRole('link')).toHaveCount(0);
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
  await expect(page.locator('#benchmark')).toHaveCount(0);
  await page.goto(`/models/report?modelId=mimo-v2.5&recipeId=${variant.id}`);
  await expect(page.locator('#benchmark')).toContainText('报告数据加载失败');
  await expect(
    page.getByRole('link', { name: '查看完整报告 ↗' }),
  ).toHaveAttribute('href', /mimo-v2.5-h100-report.html/);
});
