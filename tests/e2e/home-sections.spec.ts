import { expect, test } from '@playwright/test';
import source from '../../docs/design/sources/stitch-home-sections-copy.json';

for (const [id, expected] of Object.entries(source.modules)) {
  test(`${id} restores every source label, icon and desktop proportion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator(`#${id}`);
    if (id === 'benchmarks') {
      const current = await section.evaluate((element) => {
        const content = element.firstElementChild!.getBoundingClientRect();
        const scroller = element.querySelector('table')!.parentElement!;
        return {
          gutter: parseFloat(getComputedStyle(element).paddingLeft),
          left: content.left,
          right: innerWidth - content.right,
          scrollWidth: scroller.scrollWidth,
          clientWidth: scroller.clientWidth,
        };
      });
      expect(current.gutter).toBe(48);
      expect(current.left).toBe(current.gutter);
      expect(current.right).toBe(current.gutter);
      expect(current.scrollWidth).toBe(current.clientWidth);
      // The source uses 32px gutters; match its content width while retaining
      // the site's current 48px gutters and all original geometry assertions.
      await page.setViewportSize({
        width: source.viewport + 2 * (current.gutter - 32),
        height: 1100,
      });
    }
    const measured = await section.evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const text: string[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (
          !node.parentElement!.closest(
            '.material-symbols-outlined,.sr-only,script',
          )
        )
          text.push(node.textContent!);
      }
      return {
        text: text.join(' ').replace(/\s+/g, ' ').trim(),
        height: element.getBoundingClientRect().height,
        columns: Array.from(element.querySelectorAll('thead th')).map(
          (cell) => cell.getBoundingClientRect().width,
        ),
        headings: Array.from(element.querySelectorAll('h2,h3')).map(
          (heading) => ({
            text: heading.textContent!.replace(/\s+/g, ' ').trim(),
            size: getComputedStyle(heading).fontSize,
            line: getComputedStyle(heading).lineHeight,
            weight: getComputedStyle(heading).fontWeight,
            color: getComputedStyle(heading).color,
          }),
        ),
        icons: Array.from(
          element.querySelectorAll('.material-symbols-outlined'),
        ).map((icon) => icon.textContent!.trim()),
        font: document.fonts.check(
          '20px "ModelSphere Home Symbols"',
          'radar speed sync',
        ),
      };
    });
    expect(measured.text).toBe(expected.text);
    expect(measured.icons).toEqual(expected.icons);
    expect(measured.font).toBe(true);
    expect(Math.abs(measured.height - expected.height)).toBeLessThanOrEqual(1);
    expect(measured.headings).toEqual(
      expected.headings.map((heading) => ({
        text: heading.text,
        size: heading.size,
        line: heading.line,
        weight: heading.weight,
        color: heading.color,
      })),
    );
    if ('columns' in expected) {
      measured.columns.forEach((width, index) =>
        expect(width).toBeCloseTo(expected.columns[index], 1),
      );
    }
  });
}

test('source status and chart signals animate without affecting the existing entrance hooks', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(
    page.locator('#fault-tolerance [data-home-pair] > *'),
  ).toHaveCount(2);
  await expect(page.locator('#qos-scaling [data-home-pair] > *')).toHaveCount(
    2,
  );
  await expect(
    page.locator('#autotune-evolution [data-home-pair] > *'),
  ).toHaveCount(2);
  await expect(page.locator('[data-home-intro]')).toHaveCount(6);
  const signals = page.locator(
    '[data-home-design] .animate-pulse,[data-home-design] .animate-ping',
  );
  expect(await signals.count()).toBe(9);
  expect(
    await signals.evaluateAll((elements) =>
      elements.every(
        (element) => getComputedStyle(element).animationName !== 'none',
      ),
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await signals.evaluateAll((elements) =>
      elements.every(
        (element) => getComputedStyle(element).animationName === 'none',
      ),
    ),
  ).toBe(true);
});

test('restored modules contain narrow layouts and preserve working section links', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await expect(page.locator('#get-started > div')).toHaveCSS(
      'background-image',
      colorScheme === 'light'
        ? 'linear-gradient(135deg, rgb(29, 78, 216), rgb(37, 99, 235) 35%, rgb(59, 130, 246) 70%, rgb(67, 56, 202))'
        : 'linear-gradient(135deg, rgb(0, 54, 61), rgb(25, 27, 35) 35%, rgb(39, 42, 50) 70%, rgb(29, 31, 39))',
    );
    for (const width of [320, 390, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  const community = page.getByRole('link', {
    name: '推理性能优化社区',
    exact: true,
  });
  await community.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#benchmarks$/);
  await expect(page.locator('#benchmarks')).toBeFocused();
  await expect(
    page.getByRole('table', { name: '设计稿性能实测对照示例' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '立即部署', exact: true }),
  ).toHaveAttribute('href', '/docs/quickstart');
  await expect(
    page.getByRole('link', { name: '加入开发者交流群', exact: true }),
  ).toHaveAttribute('href', '#home-community');
});
