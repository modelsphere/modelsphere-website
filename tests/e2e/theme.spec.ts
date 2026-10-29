import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('docs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    process.env.TEST_DOCS_MODE === 'none' ? '文档准备中' : '认识 ModelSphere',
  );
});
test('first visit follows system; icon toggle persists a manual choice', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('docs');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.theme-icon-sun')).toBeVisible();
  await expect(page.locator('.theme-icon-moon')).toBeHidden();
  await page.getByRole('button', { name: '切换到浅色模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.theme-icon-moon')).toBeVisible();
  await page.getByRole('button', { name: '切换到深色模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});
test('system changes apply until an explicit icon toggle', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('theme persists across client navigation without moving reading position', async ({
  page,
}) => {
  await page.goto('docs');
  await page.evaluate(() => window.scrollTo(0, 400));
  const before = await page.evaluate(() => scrollY);
  await page.locator('.theme-toggle').evaluate((button) => {
    (button as HTMLButtonElement).focus({ preventScroll: true });
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(before, 0);
  await page
    .getByRole('link', { name: '模域 ModelSphere', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('storage denied still permits a session theme choice', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.goto('docs');
  await page.getByRole('button', { name: '切换到深色模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('header keeps full navigation and a compact theme control across layouts', async ({
  page,
}, testInfo) => {
  await expect(page.getByRole('combobox')).toHaveCount(1);
  await expect(
    page.getByRole('combobox', { name: '切换语言', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: /^切换到[浅深]色模式$/ }),
  ).toHaveClass(/theme-toggle/);
  const nav = page.getByRole('navigation', { name: '主导航', exact: true });
  await expect(nav.locator('.site-nav-link')).toHaveText([
    '首页',
    '模型目录',
    '文档指南',
    '博客',
    '社区生态',
  ]);
  await expect(nav.getByRole('link', { name: '文档指南' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.header-actions .header-github')).toHaveAttribute(
    'href',
    'https://github.com/modelsphere',
  );
  await expect(page.locator('.header-search')).toBeEnabled();
  for (const width of [
    320, 390, 639, 640, 767, 768, 1024, 1279, 1280, 1440, 1600, 1920,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.theme-toggle')).toBeVisible();
    const bounds = await page.locator('.theme-toggle').boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '切换到深色模式' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.theme-toggle')).toBeFocused();
  await page.locator('.mobile-menu summary').click();
  await expect(
    page.getByRole('navigation', { name: '移动主导航' }),
  ).toBeVisible();
  await page.locator('.mobile-menu summary').press('Escape');
  await expect(
    page.getByRole('navigation', { name: '移动主导航' }),
  ).toBeHidden();
  await expect(page.locator('.mobile-menu summary')).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('header-mobile-dark.png'),
  });
});
test('light and dark desktop/mobile reading screenshots', async ({
  page,
}, testInfo) => {
  for (const width of [390, 1440, 1920])
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('docs');
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: testInfo.outputPath(`docs-${width}-${colorScheme}.png`),
        fullPage: true,
      });
      await page.locator('.site-header').screenshot({
        path: testInfo.outputPath(`header-${width}-${colorScheme}.png`),
      });
      await page.locator('.community-footer').screenshot({
        path: testInfo.outputPath(`footer-${width}-${colorScheme}.png`),
        style: '.site-header { visibility: hidden; }',
      });
    }
});
