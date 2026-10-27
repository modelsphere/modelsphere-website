import { test, expect, devices } from '@playwright/test';
const release = process.env.TEST_DOCS_MODE === 'none';
const title = '从请求到 Token：理解大模型推理的基础设施协作';
test('blog navigation, empty release state and real 404 responses', async ({
  page,
  request,
}) => {
  await page.goto('/blog');
  await expect(
    page.getByRole('heading', { level: 1, name: '博客洞见' }),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole('navigation', { name: '主导航', exact: true })
      .getByRole('link', { name: '博客', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page
      .getByRole('contentinfo')
      .getByRole('link', { name: '架构演进内幕', exact: true }),
  ).toHaveAttribute('href', '/blog');
  await expect(
    page
      .getByRole('contentinfo')
      .getByRole('link', { name: '量化实战案例', exact: true }),
  ).toHaveAttribute('href', '/blog');
  if (release) {
    await expect(
      page.getByRole('heading', { name: '尚无公开文章' }),
    ).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await expect(page.locator('[data-post-id]')).toHaveCount(0);
  } else {
    await expect(
      page.locator('#featured').getByRole('heading', { level: 2 }),
    ).toHaveText(title);
    await expect(page.locator('#posts [data-post-id]')).toHaveCount(7);
  }
  await expect(
    page.getByRole('complementary', { name: '社区交流渠道' }),
  ).toHaveCount(0);
  expect((await request.get('/blog/unknown-article')).status()).toBe(404);
  expect((await request.get('/blog/example-blog-external')).status()).toBe(404);
  if (release)
    expect((await request.get('/blog/example-blog-platform')).status()).toBe(
      404,
    );
});
test.describe('mock blog interaction and reading', () => {
  test.skip(release, 'Fixtures are intentionally absent from release');
  test('hovering card padding highlights its title and animates the reading cue', async ({
    page,
  }, testInfo) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' });
      await page.goto('/blog');
      const card = page.locator('#posts [data-post-id]').first();
      const titleLink = card.getByRole('heading').getByRole('link');
      const arrow = card
        .getByRole('link', { name: /阅读全文/ })
        .locator('[aria-hidden]');
      const originalColor = await titleLink.evaluate(
        (el) => getComputedStyle(el).color,
      );
      const accentColor = await card
        .getByRole('link', { name: /阅读全文/ })
        .evaluate((el) => getComputedStyle(el).color);
      await card.scrollIntoViewIfNeeded();
      await card.hover({ position: { x: 12, y: 12 } });
      await expect(titleLink).toHaveCSS('color', accentColor);
      expect(originalColor).not.toBe(accentColor);
      await expect(card).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)');
      await expect(arrow).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 3, -3)');
      await page.screenshot({
        path: testInfo.outputPath(`card-hover-${colorScheme}.png`),
      });
      await page.mouse.move(0, 0);
      await expect(titleLink).toHaveCSS('color', originalColor);
      await expect(card).toHaveCSS('transform', 'none');
      await card.getByRole('link', { name: /^阅读：/ }).focus();
      await expect(titleLink).toHaveCSS('color', accentColor);
      await expect(card).toHaveCSS('transform', 'none');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await card.hover({ position: { x: 12, y: 12 } });
      await expect(card).toHaveCSS('transform', 'none');
      await expect(arrow).toHaveCSS('transform', 'none');
      await expect(titleLink).toHaveCSS('color', accentColor);
    }
  });
  test('list summaries have enough space and remain complete across breakpoints', async ({
    page,
  }) => {
    await page.goto('/blog');
    for (const width of [320, 390, 767, 768, 1024, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      const summaries = await page
        .locator('#posts [data-post-id] p')
        .evaluateAll((elements) =>
          elements.map((el) => ({
            height: el.getBoundingClientRect().height,
            lineHeight: parseFloat(getComputedStyle(el).lineHeight),
            complete: el.scrollHeight <= el.clientHeight + 1,
          })),
        );
      expect(summaries.length).toBe(7);
      for (const summary of summaries) {
        expect(summary.complete).toBe(true);
        expect(summary.height).toBeGreaterThanOrEqual(
          summary.lineHeight * 2 - 1,
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  });
  test('explicit search, draft composition and featured matching', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/blog');
    const search = page.getByRole('searchbox', { name: '搜索文章' });
    await search.fill('Token');
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.locator('#featured')).toBeVisible();
    await search.dispatchEvent('compositionstart');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/blog$/);
    await search.dispatchEvent('compositionend');
    await search.press('Enter');
    await expect(page).toHaveURL(/q=Token/);
    await expect(page.locator('#featured')).toHaveCount(0);
    await expect(page.locator('#posts [data-post-id]')).toHaveCount(1);
    await expect(
      page.locator('#posts').getByRole('heading', { name: title }),
    ).toBeVisible();
    await expect(search).toBeFocused();
    await page.reload();
    await expect(search).toHaveValue('Token');
    await expect(page.locator('#posts [data-post-id]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
  test('category and tag use AND; history and theme preserve query and draft', async ({
    page,
  }) => {
    await page.goto('/blog');
    await page.getByRole('button', { name: /系统架构解析/ }).click();
    await expect(page).toHaveURL(/category=architecture/);
    await page
      .getByRole('button', { name: '#Kubernetes', exact: true })
      .click();
    await expect(page).toHaveURL(/tag=kubernetes/);
    await expect(page.locator('#posts [data-post-id]')).toHaveCount(2);
    const search = page.getByRole('searchbox');
    await search.fill('尚未提交的草稿');
    const before = page.url();
    await page.locator('.theme-toggle').click();
    await expect(search).toHaveValue('尚未提交的草稿');
    expect(page.url()).toBe(before);
    await page.goBack();
    await expect(
      page.getByRole('button', { name: '#Kubernetes', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(search).toHaveValue('');
    await page.goForward();
    await expect(
      page.getByRole('button', { name: '#Kubernetes', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: '#Kubernetes', exact: true })
      .click();
    await expect(page).not.toHaveURL(/tag=/);
  });
  test('direct query is canonicalized and reports corrections', async ({
    page,
  }) => {
    await page.goto(
      '/blog?q=Token&q=ignored&category=invalid&tag=missing&page=-1&unknown=x',
    );
    await expect(page).toHaveURL(/\/blog\?q=Token$/);
    await expect(page.getByRole('searchbox')).toHaveValue('Token');
    await expect(
      page.getByText('无效分类已清除；无效标签已清除；无效页码已重置'),
    ).toBeVisible();
    await expect(page.locator('#posts [data-post-id]')).toHaveCount(1);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-blog-query-pending',
      '',
    );
  });
  test('empty query results can be cleared without losing focus', async ({
    page,
  }) => {
    await page.goto('/blog?q=no-matching-article');
    await expect(
      page.getByRole('heading', { name: '未找到匹配内容' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '清除筛选' }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole('searchbox')).toBeFocused();
    await expect(page.locator('#featured')).toBeVisible();
  });
  test('no JavaScript retains every summary and the complete article', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${baseURL}/blog?q=Token`);
    await expect(page.locator('[data-post-id]')).toHaveCount(8);
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await expect(
      page.getByRole('link', {
        name: '站外阅读示例：Docusaurus 的 Markdown 博客',
        exact: true,
      }),
    ).toHaveAttribute('href', 'https://docusaurus.io/docs/blog');
    await page.goto(`${baseURL}/blog/example-blog-platform`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('article pre')).toContainText(
      'example-inference',
    );
    await expect(
      page.getByRole('button', { name: '复制文章链接' }),
    ).toBeHidden();
    await context.close();
  });
  test('failed scripts restore the full static baseline on a direct query', async ({
    page,
  }) => {
    await page.route('**/*.js', (route) => route.abort());
    await page.goto('/blog?q=Token');
    await expect(page.locator('[data-post-id]').first()).toBeVisible({
      timeout: 8000,
    });
    await expect(page.locator('[data-post-id]')).toHaveCount(8);
  });
  test('detail layout, theme stability and visual snapshots', async ({
    page,
  }, testInfo) => {
    await page.goto('/blog/example-blog-platform');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('article table')).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    for (const width of [390, 1440])
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.goto('/blog/example-blog-platform');
        await page.screenshot({
          path: testInfo.outputPath(`article-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.goto('/blog');
        await page.screenshot({
          path: testInfo.outputPath(`blog-${width}-${colorScheme}.png`),
          fullPage: true,
        });
      }
  });
  test('chapter navigation, breakpoint focus and canonical copy feedback', async ({
    page,
    baseURL,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            (window as Window & { copied?: string }).copied = text;
          },
        },
      });
    });
    await page.goto('/blog/example-blog-platform');
    const toc = page.getByRole('navigation', { name: '文章章节目录' });
    await toc
      .getByRole('link', { name: '明确组件的责任边界', exact: true })
      .click();
    await expect(page.locator('#明确组件的责任边界')).toBeInViewport();
    await expect(toc.locator('[aria-current="location"]')).toHaveCount(1);
    const hash = new URL(page.url()).hash;
    await page.getByRole('button', { name: '复制文章链接' }).click();
    await expect(
      page.getByRole('button', { name: '已复制链接' }),
    ).toBeVisible();
    const canonical = await page
      .locator('link[rel="canonical"]')
      .last()
      .getAttribute('href');
    expect(
      await page.evaluate(
        () => (window as Window & { copied?: string }).copied,
      ),
    ).toBe(canonical + hash);
    expect(canonical).toBe(`${baseURL}/blog/example-blog-platform`);
    await toc.getByRole('link', { name: '接入与路由', exact: true }).focus();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page
        .locator('details')
        .filter({ has: page.locator('summary', { hasText: '本页目录' }) })
        .locator('summary'),
    ).toBeFocused();
  });
  test('copy failure and long code remain usable on mobile', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('Denied')) },
      });
    });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/blog/example-blog-runtime');
    await page.getByRole('button', { name: '复制文章链接' }).click();
    await expect(
      page.getByText('复制失败，请手动复制地址栏链接'),
    ).toBeVisible();
    await page.getByRole('button', { name: '复制代码', exact: true }).click();
    await expect(page.getByText('复制失败，请手动选择代码')).toBeVisible();
    const code = page.getByRole('region', { name: '代码，可横向滚动查看' });
    await expect(code).toHaveAttribute('tabindex', '0');
    expect(await code.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
  test('image failure preserves cover ratio and readable alternatives', async ({
    page,
  }) => {
    await page.route('**/blog-media/**', (route) => route.abort());
    await page.goto('/blog');
    await expect(page.locator('#featured').getByRole('img')).toHaveAttribute(
      'aria-label',
      /示意封面/,
    );
    await expect(
      page.locator('#featured').getByText(/图片暂不可用/),
    ).toBeVisible();
    await expect(
      page.locator('#featured').getByRole('heading', { name: title }),
    ).toBeVisible();
  });
  test('touch device emulation preserves draft on rotation and target sizes', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      baseURL,
    });
    const page = await context.newPage();
    await page.goto('/blog');
    await page.getByRole('searchbox').fill('未提交草稿');
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByRole('searchbox')).toHaveValue('未提交草稿');
    for (const button of await page
      .getByRole('group', { name: '热门标签' })
      .getByRole('button')
      .all()) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await context.close();
  });
});
