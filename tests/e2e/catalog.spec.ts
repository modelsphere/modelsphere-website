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
  await choose(page, '内容视图', '模型');
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
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
      cards.getByRole('link', { name: '部署配置', exact: true }),
    ).toHaveCount(await cards.count());
    await expect(
      cards.getByRole('link', { name: '对比报告', exact: true }),
    ).toHaveCount(0);
    await cards
      .first()
      .getByRole('link', { name: '部署配置', exact: true })
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
        page.getByRole('link', { name: '部署配置', exact: true }),
      ).toHaveCount(1);
      await expect(
        page.getByRole('link', { name: '对比报告', exact: true }),
      ).toHaveCount(1);
    } else {
      await expect(
        page.getByRole('link', { name: '查看配方详情', exact: true }),
      ).toHaveCount(2);
    }
    await expect(
      page.getByRole('link', { name: '查看对照报告', exact: true }),
    ).toHaveCount(0);
    const recipe =
      layout === 'cards'
        ? page.locator(`[data-recipe-id="${m.name}/${variant.id}"]`)
        : page.getByRole('row').filter({ hasText: variant.id });
    await recipe
      .getByRole('link', {
        name: layout === 'cards' ? '对比报告' : '查看配方详情',
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
    await expect(
      page.getByRole('combobox', { name: '配方版本' }).getByRole('option'),
    ).toHaveCount(2);
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
  await expect(page.getByRole('combobox', { name: '配方版本' })).toHaveValue(
    oldVersion,
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
  await expect(page.getByRole('combobox', { name: '配方版本' })).toHaveValue(
    variant.version,
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
        if (tab === 'deployment')
          await expect(
            page.getByText('原始 YAML · SHA-256 校验通过'),
          ).toBeVisible();
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
        recipes.getByRole('button', { name: '复制完整配方' }),
      ).toHaveCount(model.variants.length);
      for (const link of await recipes
        .getByRole('link', { name: /^(部署配置|对比报告)$/, exact: true })
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
  await expect(page.locator('#benchmark')).toHaveCount(0);
  await page.goto(`/models/report?modelId=mimo-v2.5&recipeId=${variant.id}`);
  await expect(page.locator('#benchmark')).toContainText(
    '结构化报告暂时不可用',
  );
  await expect(
    page.getByRole('link', { name: '打开完整原报告 ↗' }),
  ).toHaveAttribute('href', /mimo-v2.5-h100-report.html/);
});
