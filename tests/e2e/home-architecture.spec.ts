import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`home removes the architecture module and navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(
      page.locator('[data-home-diagram="architecture"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('.site-nav-link').filter({ hasText: '全景架构' }),
    ).toHaveCount(0);
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('#comparison')).toBeAttached();
    expect(
      await page
        .locator('#hero')
        .evaluate((hero) => hero.nextElementSibling?.id),
    ).toBe('comparison');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`community design opens in ${theme} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      if (width < 1280)
        await page.getByLabel('导航菜单', { exact: true }).click();
      const nav = page.getByRole('navigation', {
        name: width < 1280 ? '移动主导航' : '主导航',
        exact: true,
      });
      await nav.getByRole('link', { name: '社区生态', exact: true }).click();
      await expect(page).toHaveURL(/\/community\/?$/);
      await expect(
        page.getByRole('heading', {
          name: '让 AI 基础设施优化成为全社会的“公共资产”',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (width < 1280) {
        await expect(page.locator('.mobile-menu')).not.toHaveAttribute(
          'open',
          '',
        );
        await page.getByLabel('导航菜单', { exact: true }).click();
      }
      await expect(
        nav.getByRole('link', { name: '社区生态', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      if (width < 1280)
        await page.getByLabel('导航菜单', { exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.reload();
      await expect(
        page.getByRole('heading', {
          name: '让 AI 基础设施优化成为全社会的“公共资产”',
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator('.desktop-quickstart .header-primary-link'),
      ).toHaveAttribute(
        'href',
        process.env.TEST_DOCS_MODE === 'mock' ? '/docs/quickstart' : '/docs',
      );
      await page
        .getByRole('navigation', { name: 'Breadcrumb' })
        .getByRole('link', { name: '首页', exact: true })
        .click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('#hero')).toBeVisible();
    });
  }
}
