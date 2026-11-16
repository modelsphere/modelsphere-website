import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  for (const locale of ['zh-CN', 'en']) {
    test(`home renders the approved architecture in ${locale} at ${width}px`, async ({
      page,
    }) => {
      const english = locale === 'en';
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({
        colorScheme: 'light',
        reducedMotion: 'reduce',
      });
      await page.goto(english ? '/en/' : '/');
      const diagram = page.locator('[data-home-diagram="architecture"]');
      await diagram.scrollIntoViewIfNeeded();
      await expect(diagram).toBeVisible();
      await expect(diagram.locator('figcaption')).toHaveCount(0);
      await expect(diagram.getByRole('heading', { level: 2 })).toHaveCount(0);

      const capabilities = diagram.locator(
        '[data-architecture-capabilities] > li',
      );
      await expect(capabilities).toHaveText(
        english
          ? [
              'Model deployment & tuning',
              'Cache-aware request routing',
              'Dynamic rate limiting',
              'PD disaggregation',
              'Three-tier KV cache',
              'QoS-based autoscaling',
              'Automatic stream resumption',
              'Tuning Agent optimization',
            ]
          : [
              '模型部署与调优',
              '请求缓存感知路由',
              '动态限流',
              'PD 分离部署',
              '三级 KV 缓存',
              '基于服务质量的自动扩缩容',
              '服务断流自动续写',
              'Tuning Agent 持续调优',
            ],
      );
      for (const name of ['claude', 'codex', 'openclaw']) {
        const logo = diagram.locator(`[data-architecture-logo="${name}"]`);
        await expect(logo).toHaveAttribute(
          'src',
          `${english ? '/en' : ''}/brand/${name}-icon.png`,
        );
        await expect
          .poll(() =>
            logo.evaluate(
              (image: HTMLImageElement) =>
                image.complete &&
                image.naturalWidth > 0 &&
                image.naturalHeight > 0,
            ),
          )
          .toBe(true);
      }
      const platform = diagram.locator('[data-architecture-platform]');
      await expect(platform.locator('header p')).toHaveText(
        english
          ? 'Open source platform for production deployment and inference optimization'
          : '生产级算力部署与推理优化开源平台',
      );
      await expect(
        platform.locator('[data-architecture-engines]'),
      ).toContainText('vLLM');
      await expect(
        platform.locator('[data-architecture-engines]'),
      ).toContainText('SGLang');
      await expect(
        platform.locator('[data-architecture-hardware]'),
      ).toHaveCount(0);
      await expect(
        diagram.locator('[data-architecture-hardware] li'),
      ).toHaveCount(6);

      const cells = await capabilities.evaluateAll((items) =>
        items.map((item) => {
          const rect = item.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width };
        }),
      );
      const columns = width >= 900 ? 4 : 2;
      for (let index = 0; index < cells.length; index++) {
        expect(cells[index].width).toBeCloseTo(cells[0].width, 0);
        expect(cells[index].top).toBeCloseTo(
          cells[Math.floor(index / columns) * columns].top,
          0,
        );
        if (index >= columns)
          expect(cells[index].left).toBeCloseTo(cells[index % columns].left, 0);
      }
      expect(cells[columns].top).toBeGreaterThan(cells[0].top);
      const axes = await diagram
        .locator('[data-architecture-connector] svg')
        .evaluateAll((arrows) =>
          arrows.map((arrow) => {
            const rect = arrow.getBoundingClientRect();
            return rect.left + rect.width / 2;
          }),
        );
      expect(axes).toHaveLength(3);
      for (const axis of axes) expect(axis).toBeCloseTo(axes[0], 0);
      expect(
        await diagram.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left >= 0 &&
            rect.right <= innerWidth &&
            document.documentElement.scrollWidth <= innerWidth &&
            Array.from(element.querySelectorAll('li')).every(
              (item) => item.scrollWidth <= item.clientWidth,
            )
          );
        }),
      ).toBe(true);
      await expect(page.locator('#hero')).toBeVisible();
      expect(
        await page
          .locator('#hero')
          .evaluate((hero) => hero.nextElementSibling?.id),
      ).toBe('comparison');
      await diagram.screenshot({
        path: `reports/architecture-${locale}-${width}.png`,
      });
    });
  }

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
        process.env.TEST_DOCS_MODE !== 'none' ? '/docs/quickstart' : '/docs',
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
