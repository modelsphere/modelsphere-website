import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import baseline from '../../content/catalog/baseline.json';
import report from '../fixtures/catalog/mimo-report.json';

const prefix = '/modelsphere-website/';
const mock = process.env.TEST_DOCS_MODE !== 'none';
const model = baseline.models.find((m) => m.name === 'mimo-v2.5')!;
const recipe = model.variants.find(
  (v) => v.id === 'sglang-tp8-h100-optimized',
)!;

test.beforeEach(async ({ page }) => {
  await page.route(
    'https://modelsphere.github.io/model-catalog/**',
    (route) => {
      if (route.request().url().endsWith('index-v2.json'))
        return route.fulfill({ json: baseline });
      if (route.request().url().endsWith('.history.json'))
        return route.fulfill({
          json: {
            model: model.name,
            id: recipe.id,
            path: recipe.path,
            revisions: [
              {
                version: recipe.version,
                commit: recipe.commit,
                digest: recipe.digest,
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
        return route.fulfill({
          body: readFileSync('tests/fixtures/catalog/mimo.yaml', 'utf8'),
          contentType: 'text/plain',
        });
      if (route.request().url().endsWith('mimo-v2.5-h100-report.html'))
        return route.fulfill({
          body: `<script type="application/json" id="autotune-report-data">${JSON.stringify(report)}</script>`,
          contentType: 'text/html',
        });
      return route.abort();
    },
  );
});

test('home loads its assets and all internal links under the project path', async ({
  page,
  request,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.url().includes('/modelsphere-website/') && r.status() >= 400)
      errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.site-brand')).toHaveAttribute('href', prefix);
  await expect(page.locator('.desktop-nav [aria-current="page"]')).toHaveText(
    '首页',
  );
  await expect(page.locator('.community-footer')).toBeVisible();
  expect(
    await page
      .locator('a[href^="/"]')
      .evaluateAll((links) =>
        links.every((link) =>
          link.getAttribute('href')!.startsWith('/modelsphere-website/'),
        ),
      ),
  ).toBe(true);
  expect(
    await page
      .locator('.site-brand img')
      .evaluateAll((images) =>
        images.every((img) => (img as HTMLImageElement).naturalWidth > 0),
      ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      document.fonts.check(
        '20px "ModelSphere Home Symbols"',
        'radar speed sync',
      ),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  const quickstart = page
    .locator('#get-started')
    .getByRole('link', { name: '立即部署', exact: true });
  const target = `${prefix}${mock ? 'docs/quickstart' : 'docs'}`;
  await expect(quickstart).toHaveAttribute('href', target);
  expect((await request.get(new URL(target, baseURL).href)).status()).toBe(200);
});

test('catalog filters, recipe tabs, legacy redirects and return links preserve the prefix', async ({
  page,
}) => {
  await page.goto('models?q=mimo-v2.5&sort=name-asc');
  await expect(page.locator('[data-catalog-enhanced="true"]')).toBeVisible();
  const input = page.getByRole('textbox', { name: '搜索模型目录' });
  await input.fill('mimo-v2.5');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page).toHaveURL(/\/modelsphere-website\/models\?/);
  const card = page.locator(`[data-recipe-id="${model.name}/${recipe.id}"]`);
  await card.getByRole('link', { name: '查看对照报告', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: '性能对照', selected: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '部署配置' }).click();
  await expect(page).toHaveURL(/\/modelsphere-website\/models\/recipe\?/);
  await expect(
    page.getByRole('tab', { name: '部署配置', selected: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(recipe.id);
  await page.getByRole('tab', { name: '版本历史' }).click();
  expect(new URL(page.url()).searchParams.get('tab')).toBe('history');
  await page.goBack();
  await expect(
    page.getByRole('tab', { name: '部署配置', selected: true }),
  ).toBeVisible();
  const params = new URLSearchParams({
    modelId: model.name,
    recipeId: recipe.id,
    dataVersion: baseline.commit,
    returnTo: '/models?q=mimo-v2.5',
  });
  await page.goto(`models/report?${params}`);
  await expect(page).toHaveURL(
    /\/modelsphere-website\/models\/recipe\?.*tab=performance/,
  );
  await expect(
    page.getByRole('tab', { name: '性能对照', selected: true }),
  ).toBeVisible();
  await expect(
    page.locator(`a[href="${prefix}models?q=mimo-v2.5"]`).first(),
  ).toBeVisible();
});

test('direct documents, blog routes, 404 responses and version metadata work under the prefix', async ({
  page,
  request,
  baseURL,
}) => {
  for (const route of [
    'docs',
    'blog',
    'models/detail?modelId=mimo-v2.5',
    'models/evidence',
    'community',
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeAttached();
    await page.reload();
    expect(new URL(page.url()).pathname.startsWith(prefix)).toBe(true);
  }
  const missing = await request.get(`${baseURL}missing-pages-route`);
  expect(missing.status()).toBe(404);
  const version = await (await request.get(`${baseURL}version.json`)).json();
  expect(version.baseUrl).toBe(prefix);
  expect(version.target).toBe(
    process.env.TEST_BUILD_TARGET ?? (mock ? 'preview' : 'release'),
  );
  expect(version.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(Array.isArray(version.docsRoutes)).toBe(true);
  if (mock) expect(version.docsRoutes).toContain('/docs');
  else expect(version.docsRoutes).toEqual([]);
  for (const route of version.docsRoutes as string[]) {
    const response = await request.get(new URL(route.slice(1), baseURL).href);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<h1');
  }
});

if (mock) {
  test('preview blog covers, filters, canonical links and search navigate within the project path', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('blog');
    await expect(page.locator('[data-blog-enhanced="true"]')).toBeVisible();
    await page
      .getByRole('searchbox', { name: '搜索文章', exact: true })
      .fill('平台');
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    expect(new URL(page.url()).pathname).toBe(prefix + 'blog');
    expect(new URL(page.url()).searchParams.get('q')).toBe('平台');
    await page.goto('blog/example-blog-platform');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]').last()).toHaveAttribute(
      'href',
      'https://modelsphere.github.io/modelsphere-website/blog/example-blog-platform',
    );
    expect(
      await page
        .locator('picture img')
        .first()
        .evaluate((img) => (img as HTMLImageElement).naturalWidth > 0),
    ).toBe(true);
    await page.getByRole('button', { name: /搜索/ }).first().click();
    await page.getByRole('searchbox', { name: '搜索文档和博客' }).fill('部署');
    await expect(page.locator('[data-search-result]').first()).toBeVisible();
    await page.locator('[data-search-result]').first().click();
    expect(new URL(page.url()).pathname.startsWith(prefix)).toBe(true);
    expect(errors).toEqual([]);
  });
}
