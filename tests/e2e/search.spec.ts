import { test, expect } from '@playwright/test';
const release = process.env.TEST_DOCS_MODE === 'none';
const docsContent = process.env.TEST_DOCS_MODE === 'content';
const docsHomeTitle = release
  ? '文档准备中'
  : docsContent
    ? '使用文档'
    : '认识 ModelSphere';
const indexPattern = '**/search-index.*.json';

test('global search is lazy, keyboard accessible, and restores focus', async ({
  page,
}) => {
  let requests = 0;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/search-index\..*\.json/.test(request.url())) requests++;
  });
  await page.goto('/');
  const trigger = page.getByRole('button', {
    name: '搜索文档和博客',
    exact: true,
  });
  await expect(trigger).toBeEnabled();
  expect(requests).toBe(0);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '搜索文档和博客' });
  const input = dialog.getByRole('searchbox');
  await expect(input).toBeFocused();
  await expect(dialog.getByRole('status')).not.toHaveText('正在加载搜索…');
  expect(requests).toBe(1);
  await dialog.getByRole('button', { name: '关闭搜索' }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+k');
  await expect(input).toBeFocused();
  await expect(dialog.getByRole('status')).not.toHaveText('正在加载搜索…');
  expect(requests).toBe(1);
  if (release)
    await expect(dialog.getByRole('status')).toHaveText(
      '暂无可搜索的已发布文档或博客。',
    );
  expect(errors).toEqual([]);
});

test('loading failures and invalid responses can be retried', async ({
  page,
}) => {
  let attempts = 0;
  await page.route(indexPattern, async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({ status: 503, body: 'unavailable' });
    else if (attempts === 2) await route.fulfill({ json: { invalid: true } });
    else await route.continue();
  });
  await page.goto('/docs');
  await page
    .getByRole('button', { name: '搜索文档和博客', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 2; i++) {
    await expect(dialog.getByRole('status')).toHaveText(
      '搜索暂时不可用，请重试。',
    );
    await dialog.getByRole('button', { name: '重新加载' }).click();
  }
  await expect(dialog.getByRole('status')).toHaveText(
    release ? '暂无可搜索的已发布文档或博客。' : '输入关键词，搜索文档和博客。',
  );
  expect(attempts).toBe(3);
});

for (const [width, height] of [
  [320, 700],
  [390, 844],
  [844, 320],
  [1280, 720],
  [1440, 1000],
  [1920, 1080],
])
  for (const colorScheme of ['light', 'dark'] as const)
    test(`search fits ${width}x${height} in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(width >= 1280 ? '/' : '/docs');
      const trigger = page.getByRole('button', {
        name: '搜索文档和博客',
        exact: true,
      });
      await expect(trigger).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('searchbox').fill('推理');
      await expect(dialog.getByRole('status')).not.toHaveText('正在加载搜索…');
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(height - bounds!.y - bounds!.height).toBeGreaterThanOrEqual(32);
      if (width >= 768) {
        expect(bounds!.width / width).toBeGreaterThanOrEqual(0.6);
        expect(bounds!.width / width).toBeLessThanOrEqual(0.7);
      }
      await expect(
        dialog.getByText('Esc 关闭', { exact: true }),
      ).toBeInViewport();
      expect(
        await dialog
          .getByRole('searchbox')
          .evaluate(
            (element) => getComputedStyle(element.parentElement!).outlineStyle,
          ),
      ).toBe('none');
      if (!release && height <= 420) {
        const title = dialog.locator('[data-search-result] strong').first();
        await title.scrollIntoViewIfNeeded();
        await expect(title).toBeInViewport();
      }
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await expect(
        dialog.getByRole('button', { name: '关闭搜索' }),
      ).toBeInViewport();
      await page.screenshot({
        path: testInfo.outputPath(`search-${width}-${colorScheme}.png`),
      });
      await page.keyboard.press('Escape');
    });

test('without JavaScript the search is clearly unavailable and content stays readable', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/docs`);
  await expect(
    page.getByRole('button', { name: '搜索文档和博客', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    docsHomeTitle,
  );
  await context.close();
});

test.describe('published preview content search', () => {
  test('searches code and headings, filters sources and navigates to the matched section', async ({
    page,
  }) => {
    test.skip(
      process.env.TEST_DOCS_MODE !== 'mock',
      'Fixed mock docs content only',
    );
    await page.goto('/blog');
    await page
      .getByRole('button', { name: '搜索文档和博客', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    const input = dialog.getByRole('searchbox');
    await input.fill('EXAMPLEONLY');
    await expect(dialog.locator('[data-search-result]')).toHaveCount(1);
    await expect(dialog.locator('mark').first()).toHaveText('exampleOnly');
    await dialog.getByRole('button', { name: '博客', exact: true }).click();
    await expect(dialog.locator('[data-search-result]')).toHaveCount(0);
    await dialog.getByRole('button', { name: '文档', exact: true }).click();
    await expect(dialog.locator('[data-search-result]')).toHaveCount(1);
    await input.fill('配置示例');
    await input.press('ArrowDown');
    await expect(dialog.locator('[data-search-result]').first()).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(input).toBeFocused();
    await input.press('Enter');
    await expect(page).toHaveURL(/\/docs\/quickstart#.*$/);
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#配置示例');
    await expect(page.locator('#配置示例')).toBeInViewport();
    await expect(dialog).toHaveCount(0);
  });
  test('searches blog body and tags, excludes external articles, and respects IME composition', async ({
    page,
  }) => {
    test.skip(release, 'Mock content is excluded from release');
    await page.goto('/docs');
    await page
      .getByRole('button', { name: '搜索文档和博客', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    const input = dialog.getByRole('searchbox');
    await input.dispatchEvent('compositionstart');
    await input.fill('Token');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/docs$/);
    await expect(dialog.locator('[data-search-result]')).toHaveCount(0);
    await input.dispatchEvent('compositionend');
    await expect(dialog.locator('[data-search-result]').first()).toBeVisible();
    await dialog.getByRole('button', { name: '博客', exact: true }).click();
    await input.fill('明确组件的责任边界');
    await expect(dialog.locator('[data-search-result]')).toHaveCount(1);
    await expect(dialog.locator('[data-search-result]')).toHaveAttribute(
      'href',
      /\/blog\/example-blog-platform#/,
    );
    await input.fill('缓存');
    await expect(dialog.locator('[data-search-result]').first()).toBeVisible();
    const hrefs = await dialog
      .locator('[data-search-result]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs.every((href) => href?.startsWith('/blog/'))).toBe(true);
    await input.fill('Docusaurus');
    await expect(dialog.locator('[data-search-result]')).toHaveCount(0);
    await dialog.getByRole('button', { name: '清空搜索' }).click();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
  });
});

test.describe('published docs search', () => {
  test('searches the published user guide and navigates to the matched section', async ({
    page,
  }) => {
    test.skip(!docsContent, 'Published content only');
    await page.goto('/');
    await page
      .getByRole('button', { name: '搜索文档和博客', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    const input = dialog.getByRole('searchbox');
    await input.fill('创建 API 密钥');
    await dialog.getByRole('button', { name: '文档', exact: true }).click();
    const result = dialog.locator('[data-search-result]').first();
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('href', /\/docs\/api#/);
    await result.click();
    await expect(page).toHaveURL(/\/docs\/api#.*$/);
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#创建-api-密钥');
    await expect(page.locator('#创建-api-密钥')).toBeInViewport();
    await expect(dialog).toHaveCount(0);
  });
});
