import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`home restores the architecture display at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const diagram = page.locator('[data-home-diagram="architecture"]');
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();
    for (const title of [
      '上层应用生态',
      '模域 ModelSphere 核心底座',
      '下层多元异构算力',
    ])
      await expect(diagram.getByText(title, { exact: true })).toBeVisible();
    await expect(
      diagram.locator('strong').filter({
        hasText: '系统分层架构与算力调度拓扑',
      }),
    ).toBeVisible();
    const image = diagram.getByRole('img');
    await expect(image).toHaveAttribute(
      'src',
      '/diagrams/modelsphere-architecture.png',
    );
    await expect
      .poll(() =>
        image.evaluate(
          (img: HTMLImageElement) =>
            img.complete &&
            img.naturalWidth === 2675 &&
            img.naturalHeight === 744,
        ),
      )
      .toBe(true);
    expect(
      await diagram.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= innerWidth &&
          document.documentElement.scrollWidth <= innerWidth
        );
      }),
    ).toBe(true);
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
