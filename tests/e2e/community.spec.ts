import { expect, test } from '@playwright/test';
import source from '../../docs/design/sources/stitch-community.json';

// User deferred the official account until certification; retain the source snapshot.
const deferredAccountCopy = new Set([
  '权威发布',
  '官方微信公众号',
  '公众号:「模域 ModelSphere」',
  '第一时间获取最新版本发布动态、深度内核架构长文推送及线下沙龙活动一手资讯。',
  '微信扫码关注公众号',
  '双周刊载 ｜ 深度技术沉淀',
]);

test('community preserves approved copy, empty activities and the five-section order', async ({
  page,
}) => {
  await page.goto('/community');
  await expect(page.locator('main section')).toHaveCount(5);
  expect(
    await page
      .locator('main section')
      .evaluateAll((sections) => sections.map((section) => section.id)),
  ).toEqual(source.sectionIds);
  for (const [index, id] of source.sectionIds.entries()) {
    if (id === 'community-calendar') continue;
    const text = (await page.locator(`#${id}`).textContent())!
      .replace(/\s+/g, ' ')
      .trim();
    for (const copy of source.sectionCopy[index].filter(
      (copy) => id !== 'community-channels' || !deferredAccountCopy.has(copy),
    ))
      expect(text, `${id}: ${copy}`).toContain(copy);
  }
  for (const [selector, fragments] of [
    ['header[data-community-design]', source.headerCopy],
    ['footer[data-community-design]', source.footerCopy],
  ] as const) {
    const text = (await page.locator(selector).textContent())!
      .replace(/\s+/g, ' ')
      .trim();
    for (const fragment of fragments) expect(text).toContain(fragment);
  }
  for (const handle of [
    'lumianph',
    'zhanghaohit',
    'aceforeverd',
    'remotego',
    'imneov',
  ]) {
    await expect(
      page.getByRole('link', { name: `@${handle}`, exact: true }),
    ).toHaveAttribute('href', `https://github.com/${handle}`);
  }
  await expect(page.locator('main a[href="#"]')).toHaveCount(0);
  const channels = page.locator('#community-channels');
  await expect(channels.getByRole('heading', { level: 3 })).toHaveText([
    '微信技术交流群',
    'GitHub 开源社区',
  ]);
  await expect(channels).not.toContainText('公众号');
  const qr = channels.getByRole('img', { name: '微信技术交流群入群二维码' });
  await expect(qr).toHaveAttribute('src', '/community/wechat-group-qr.png');
  expect(
    await qr.evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBe(500);
  await expect(
    channels.getByRole('link', { name: '扫码加入技术交流微信群', exact: true }),
  ).toHaveAttribute('href', '/community/wechat-group-qr.png');
  await expect(
    page.getByRole('link', { name: '申请加入生态共建', exact: true }),
  ).toHaveAttribute('href', 'mailto:contact@modelsphere.org');
  await expect(page.locator('[data-event-id]')).toHaveCount(0);
  const empty = page.locator('[data-community-empty]');
  await expect(
    empty.getByRole('heading', { name: '暂无活动', exact: true }),
  ).toBeVisible();
  await expect(
    empty.getByRole('link', { name: '加入技术交流群', exact: true }),
  ).toHaveAttribute('href', '#community-channels');
  await expect(page.locator('#community-calendar')).not.toContainText(
    '829-411-903',
  );
  await expect(page.getByRole('button', { name: /预约.*提醒/ })).toHaveCount(0);
});

test('community preserves desktop layout, colors, typography and local assets', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (
      /fonts\.googleapis|fonts\.gstatic|cdn\.tailwindcss|googleusercontent/.test(
        request.url(),
      )
    )
      external.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/community');
  await page.evaluate(() => document.fonts.ready);
  const actual = await page.evaluate(() => ({
    sections: Array.from(document.querySelectorAll('main section')).map(
      (section) => ({
        top: section.getBoundingClientRect().top,
        height: section.getBoundingClientRect().height,
      }),
    ),
    titleSize: getComputedStyle(document.querySelector('h1')!).fontSize,
    titleWeight: getComputedStyle(document.querySelector('h1')!).fontWeight,
    accent: getComputedStyle(document.querySelector('h1 span')!).color,
    canvas: getComputedStyle(document.querySelector('main')!).backgroundColor,
    maintainerSize: getComputedStyle(
      document.querySelector('#community-maintainers h4')!,
    ).fontSize,
    maintainerColumns: getComputedStyle(
      document.querySelector('#community-maintainers .grid')!,
    ).gridTemplateColumns.split(' ').length,
    font: getComputedStyle(document.querySelector('h1')!).fontFamily,
    icon: getComputedStyle(
      document.querySelector('.material-symbols-outlined')!,
    ).fontFamily,
    fontsLoaded: [
      '400 16px "ModelSphere Community Geist"',
      '700 44px "ModelSphere Community Space Grotesk"',
      '400 12px "ModelSphere Community JetBrains Mono"',
    ].every((font) => document.fonts.check(font)),
  }));
  for (const [index, section] of actual.sections.entries()) {
    if (index < 2) {
      expect(section.top).toBeCloseTo(source.sourceMeasurements[index].top, 0);
      expect(section.height).toBeCloseTo(
        source.sourceMeasurements[index].height,
        0,
      );
    } else {
      expect(section.top).toBeCloseTo(
        actual.sections[index - 1].top + actual.sections[index - 1].height,
        0,
      );
    }
  }
  expect(actual.titleSize).toBe('44px');
  expect(actual.titleWeight).toBe('700');
  expect(actual.accent).toBe('rgb(2, 132, 199)');
  expect(actual.canvas).toBe('rgb(250, 248, 255)');
  expect(actual.maintainerSize).toBe('18px');
  expect(actual.maintainerColumns).toBe(3);
  expect(actual.font).toContain('Space Grotesk');
  expect(actual.icon).toContain('ModelSphere Community Symbols');
  expect(actual.fontsLoaded).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('community-1280-light.png'),
    fullPage: true,
  });
});

test('community stays readable on mobile, tablet and desktop in both themes', async ({
  page,
}, testInfo) => {
  for (const width of [320, 390, 768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/community');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page
          .locator('.community-channels-grid')
          .evaluate(
            (grid) =>
              getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          ),
      ).toBe(width >= 768 ? 2 : 1);
      if (width === 390 || width === 1280)
        await page.screenshot({
          path: testInfo.outputPath(`community-${width}-${theme}.png`),
          fullPage: true,
        });
    }
  }
});
