import { expect, test } from '@playwright/test';

const cardsSelector = '#comparison [data-home-pair] > article';

test('four capability cards restore the selected Stitch copy, icons, colors and chart', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const cards = page.locator(cardsSelector);
  await expect(cards).toHaveCount(4);
  await expect(cards.locator('h3')).toHaveText([
    '开箱即用，面向生产',
    '统一支持多种异构加速器',
    '第一时间性能调优和部署',
    '性能优化持续演进',
  ]);
  for (const text of [
    '自动弹性伸缩 (Auto-Scaling)',
    'ENABLED: 4-32 Pods',
    '基于服务质量的动态限流算法',
    'TTFT < 10s, OPTS > 20',
  ])
    await expect(cards.nth(0).getByText(text, { exact: true })).toBeVisible();
  for (const text of ['华为昇腾', '天数智芯', '摩尔线程', '海光 DCU', '...'])
    await expect(cards.nth(1).getByText(text, { exact: true })).toBeVisible();
  for (const text of [
    '即日认证模型库',
    '100% 官方适配通过',
    'DeepSeek-V4-Pro',
    'DeepSeek-V4-Flash-0731',
    'Qwen3.8-2.4T-A95B',
    'Kimi-K3',
    'MiniMax-M3',
    'GLM-5.3-Flash',
  ])
    await expect(cards.nth(2).getByText(text, { exact: true })).toBeVisible();
  for (const text of [
    '相对吞吐（优化后=100%）',
    '较基准提升约285%',
    '常规基准产能',
    '26%',
    '优化后产能',
    '100% 满血',
  ])
    await expect(cards.nth(3).getByText(text, { exact: true })).toBeVisible();
  await expect(
    cards.nth(2).getByRole('link', { name: '推理性能优化社区' }),
  ).toHaveAttribute('href', '#benchmarks');
  const measured = await cards.evaluateAll((elements) =>
    elements.map((card) => {
      const glyph = card.querySelector<HTMLElement>('[aria-hidden="true"]')!;
      const style = getComputedStyle(card);
      return {
        glyph: glyph.textContent,
        iconColor: getComputedStyle(glyph).color,
        fontLoaded: document.fonts.check(
          '20px "ModelSphere Capability Symbols"',
          glyph.textContent!,
        ),
        padding: style.padding,
        radius: style.borderRadius,
        titleSize: getComputedStyle(card.querySelector('h3')!).fontSize,
        bodySize: getComputedStyle(card.querySelector('p')!).fontSize,
      };
    }),
  );
  expect(measured.map((card) => card.glyph)).toEqual([
    'settings',
    'bolt',
    'rocket_launch',
    'science',
  ]);
  expect(measured.map((card) => card.iconColor)).toEqual([
    'rgb(2, 132, 199)',
    'rgb(5, 150, 105)',
    'rgb(5, 150, 105)',
    'rgb(217, 119, 6)',
  ]);
  for (const card of measured)
    expect(card).toMatchObject({
      fontLoaded: true,
      padding: '24px',
      radius: '16px',
      titleSize: '20px',
      bodySize: '14px',
    });
  const chart = cards.nth(3).locator('div[aria-description]');
  const widths = await chart.evaluate((element) =>
    Array.from(element.querySelectorAll<HTMLElement>('div > span:only-child'))
      .filter((e) => getComputedStyle(e.parentElement!).height === '8px')
      .map(
        (e) =>
          e.getBoundingClientRect().width /
          e.parentElement!.getBoundingClientRect().width,
      ),
  );
  expect(widths[0]).toBeCloseTo(0.26, 2);
  expect(widths[1]).toBe(1);
});

test('complete capability cards stay readable at narrow widths in both themes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator(cardsSelector)).toHaveCount(4);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      for (const card of await page.locator(cardsSelector).all()) {
        const bounds = await card.evaluate((element) => ({
          box: element.getBoundingClientRect().width,
          content: element.scrollWidth,
        }));
        expect(bounds.content).toBeLessThanOrEqual(Math.ceil(bounds.box));
      }
    }
  }
});
