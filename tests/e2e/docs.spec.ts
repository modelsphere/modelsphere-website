import { test, expect } from '@playwright/test';
const mock = process.env.TEST_DOCS_MODE !== 'none';
if (mock) {
  test('two docs, native navigation, anchors and direct refresh', async ({
    page,
  }) => {
    await page.goto('/docs');
    await expect(
      page.getByRole('heading', { name: '认识 ModelSphere', exact: true }),
    ).toHaveCount(1);
    await page.getByRole('link', { name: /下一页.*快速开始/ }).click();
    await expect(page).toHaveURL(/\/docs\/quickstart$/);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '快速开始（示例）', exact: true }),
    ).toBeVisible();
    await page.locator('.docs-toc a').filter({ hasText: '配置示例' }).click();
    await expect(page).toHaveURL(/#/);
    await expect(
      page.getByRole('heading', { name: /^配置示例/, level: 2 }),
    ).toBeInViewport();
    const headingBox = await page.locator('h2#配置示例').boundingBox();
    const headerBox = await page.locator('.site-header').boundingBox();
    expect(headingBox!.y).toBeGreaterThanOrEqual(
      headerBox!.y + headerBox!.height,
    );
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: '快速开始（示例）', exact: true }),
    ).toBeVisible();
  });
  test('clipboard success and failure both give finite feedback', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/docs/quickstart');
    const copyButton = page.getByRole('button', {
      name: '复制代码',
      exact: true,
    });
    const copyBounds = await copyButton.boundingBox();
    expect(copyBounds!.width).toBeGreaterThanOrEqual(44);
    expect(copyBounds!.height).toBeGreaterThanOrEqual(44);
    await copyButton.click();
    await expect(page.getByRole('status')).toHaveText('代码已复制');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      'exampleOnly: true',
    );
    await expect(page.getByRole('status')).toBeEmpty({ timeout: 4000 });
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('Denied')) },
      }),
    );
    await page.getByRole('button', { name: '复制代码', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(
      '复制失败，请手动选择代码',
    );
  });
  test('mobile navigation and reading stay within viewport', async ({
    page,
  }) => {
    for (const width of [320, 390, 767, 768, 1279, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/docs/quickstart');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await expect(page.locator('.docs-mobile-nav')).toBeVisible({
        visible: width < 1280,
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.mobile-menu summary').click();
    await expect(
      page.getByRole('button', { name: /切换到.+色模式/ }),
    ).toBeVisible();
    await page.locator('.mobile-menu summary').press('Escape');
    await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open', '');
  });
  test('responsive reading navigation keeps keyboard focus visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await page.locator('.docs-mobile-nav summary').click();
    await page.locator('.docs-mobile-nav a[href]').first().focus();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator('.docs-sidebar a[href]').first()).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.docs-mobile-nav summary')).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(page.locator('.docs-mobile-nav')).not.toHaveAttribute(
      'open',
      '',
    );
    await expect(page.locator('.docs-mobile-nav summary')).toBeFocused();
  });
  test('font failures, enlarged text and reduced motion preserve reading', async ({
    page,
  }) => {
    await page.route('**/*.woff2', (route) => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/quickstart');
    await page.addStyleTag({
      content:
        '.markdown p, .markdown li, .markdown td, .markdown th { font-size: 200%; line-height: 1.6; }',
    });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '快速开始（示例）',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.locator('.docs-mobile-nav summary').focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('navigation', { name: '移动文档导航' }),
    ).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page
        .getByRole('navigation', { name: '移动文档导航' })
        .getByRole('link', { name: '认识 ModelSphere' }),
    ).toBeFocused();
  });
  test('no-script documents and native collapsible navigation remain readable', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/docs/quickstart`);
    await expect(
      page.getByRole('heading', { name: '快速开始（示例）', exact: true }),
    ).toBeVisible();
    await page.locator('.docs-mobile-nav summary').click();
    await expect(
      page.getByRole('navigation', { name: '移动文档导航' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '复制代码' })).toBeHidden();
    expect(
      await page
        .locator('body')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe('rgb(16, 19, 26)');
    await context.close();
  });
} else {
  test('release preparation page excludes mock content and route', async ({
    page,
    request,
  }) => {
    await page.goto('/docs');
    await expect(
      page.getByRole('heading', { name: '文档准备中', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.status-label')).toHaveCount(0);
    expect((await request.get('/docs/quickstart')).status()).toBe(404);
    expect(await page.content()).not.toContain('example-overview');
  });
}
test('unknown static routes return real HTTP 404', async ({
  request,
  page,
}) => {
  expect((await request.get('/docs/not-a-real-page')).status()).toBe(404);
  await page.goto('/docs/not-a-real-page');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
test('runtime does not request external scripts, fonts or data', async ({
  page,
  baseURL,
}) => {
  const foreign: string[] = [];
  page.on('request', (req) => {
    if (
      ['font', 'script', 'fetch', 'xhr', 'stylesheet'].includes(
        req.resourceType(),
      ) &&
      !req.url().startsWith(new URL(baseURL!).origin)
    )
      foreign.push(req.url());
  });
  await page.goto('/docs');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});

if (process.env.TEST_DOCS_MODE === 'content') {
  test('local documentation images load without scripts and stay within the mobile viewport', async ({
    browser,
    baseURL,
  }) => {
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({
        javaScriptEnabled,
        viewport: { width: 390, height: 844 },
      });
      try {
        const page = await context.newPage();
        const address = new URL(
          'docs',
          baseURL!.endsWith('/') ? baseURL : `${baseURL}/`,
        );
        const response = await page.goto(address.href);
        expect(response?.status()).toBe(200);
        const image = page.getByRole('img', {
          name: 'ModelSphere 标识',
          exact: true,
        });
        await expect(image).toBeVisible();
        await expect
          .poll(() =>
            image.evaluate((node: HTMLImageElement) => node.naturalWidth),
          )
          .toBeGreaterThan(0);
        const src = await image.getAttribute('src');
        const asset = new URL(src!, page.url());
        expect(asset.pathname.startsWith(new URL(baseURL!).pathname)).toBe(
          true,
        );
        const result = await context.request.get(asset.href);
        expect(result.status()).toBe(200);
        expect(result.headers()['content-type']).toContain('image/png');
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
      } finally {
        await context.close();
      }
    }
  });
}
