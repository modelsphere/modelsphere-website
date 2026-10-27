import { expect, test, type Page } from '@playwright/test';

interface MotionRun {
  section: string;
  kind: string;
  index: number;
  duration: number;
  frames: ComputedKeyframe[];
}
declare global {
  interface Window {
    communityRuns: MotionRun[];
    communityAnimations: Animation[];
  }
}

async function observeMotion(page: Page) {
  await page.addInitScript(() => {
    const tracked = window;
    tracked.communityRuns = [];
    tracked.communityAnimations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = original.call(this, keyframes, options);
      if (this.closest('.community-motion')) {
        tracked.communityRuns.push({
          section: this.closest('section')?.id ?? '',
          kind:
            this.getAttribute('data-home-hero') ??
            (this.hasAttribute('data-home-intro') ? 'intro' : 'card'),
          index: Array.from(this.parentElement!.children).indexOf(this),
          duration: Number(animation.effect!.getTiming().duration),
          frames: (animation.effect as KeyframeEffect).getKeyframes(),
        });
        tracked.communityAnimations.push(animation);
      }
      return animation;
    };
  });
}

async function placeAtReadingLine(page: Page, selector: string, ratio: number) {
  await page.locator(selector).evaluate((element, fraction) => {
    window.scrollTo({
      top:
        window.scrollY +
        element.getBoundingClientRect().top -
        innerHeight * fraction,
      behavior: 'instant',
    });
  }, ratio);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test('community uses home hero timing and reveals each desktop row once at 85%', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeMotion(page);
  await page.goto('/community');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.communityRuns.filter((run) => run.kind === 'title').length,
      ),
    )
    .toBe(1);
  const hero = await page.evaluate(
    () => window.communityRuns.find((run) => run.kind === 'title')!,
  );
  expect(hero.duration).toBe(1050);
  expect(hero.frames[0].transform).toContain('48px');
  expect(hero.frames[0].transform).toContain('rotateX(18deg)');
  const cards = page.locator('#community-maintainers [data-home-pair] > *');
  await expect(cards.nth(0)).toHaveAttribute('data-home-pending', '');
  await placeAtReadingLine(
    page,
    '#community-maintainers [data-home-pair] > :first-child',
    0.86,
  );
  await expect(cards.nth(0)).toHaveAttribute('data-home-pending', '');
  await placeAtReadingLine(
    page,
    '#community-maintainers [data-home-pair] > :first-child',
    0.84,
  );
  const runs = () =>
    page.evaluate(() =>
      window.communityRuns.filter(
        (run) => run.section === 'community-maintainers' && run.kind === 'card',
      ),
    );
  await expect.poll(async () => (await runs()).length).toBe(3);
  const firstRow = await runs();
  expect(firstRow.map((run) => run.duration)).toEqual([900, 900, 900]);
  expect(firstRow.map((run) => run.frames[0].transform)).toEqual([
    'translateX(-60px)',
    'translateY(28px)',
    'translateX(60px)',
  ]);
  await expect(cards.nth(3)).toHaveAttribute('data-home-pending', '');
  await placeAtReadingLine(
    page,
    '#community-maintainers [data-home-pair] > :nth-child(4)',
    0.84,
  );
  await expect.poll(async () => (await runs()).length).toBe(5);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await placeAtReadingLine(
    page,
    '#community-maintainers [data-home-pair] > :first-child',
    0.7,
  );
  expect((await runs()).length).toBe(5);
});

test('mobile cards wait independently and enter upwards without moving page layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeMotion(page);
  await page.goto('/community');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.communityRuns.filter((run) => run.kind === 'title').length,
      ),
    )
    .toBe(1);
  const title = await page.evaluate(
    () => window.communityRuns.find((run) => run.kind === 'title')!,
  );
  expect(title.duration).toBe(850);
  expect(title.frames[0].transform).toContain('32px');
  expect(title.frames[0].transform).toContain('rotateX(12deg)');
  const first = page.locator(
    '#community-maintainers [data-home-pair] > :first-child',
  );
  const beforeHeight = await first.evaluate(
    (element) => (element as HTMLElement).offsetHeight,
  );
  await placeAtReadingLine(
    page,
    '#community-maintainers [data-home-pair] > :first-child',
    0.84,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.communityRuns.filter((run) => run.kind === 'card').length,
      ),
    )
    .toBe(1);
  const card = await page.evaluate(
    () => window.communityRuns.find((run) => run.kind === 'card')!,
  );
  expect(card.duration).toBe(700);
  expect(card.frames[0].transform).toBe('translateY(28px)');
  await expect(
    page.locator('#community-maintainers [data-home-pair] > :nth-child(2)'),
  ).toHaveAttribute('data-home-pending', '');
  const geometry = await first.evaluate((element) => ({
    height: (element as HTMLElement).offsetHeight,
    visualHeight: element.getBoundingClientRect().height,
    width: document.documentElement.scrollWidth,
  }));
  expect(geometry.height).toBe(beforeHeight);
  expect(geometry.visualHeight).toBeCloseTo(beforeHeight, 2);
  expect(geometry.width).toBe(390);
});

test('focus, direct anchors, history and reduced motion leave content readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeMotion(page);
  await page.goto('/community');
  const focused = page.getByRole('link', { name: '@lumianph', exact: true });
  await focused.focus();
  await expect(
    page.locator('#community-maintainers [data-home-pending]'),
  ).toHaveCount(0);
  await expect(focused).toBeFocused();
  // Navigate from another document to exercise a direct hash load, not a same-page hash change.
  await page.goto('/docs');
  await page.goto('/community#community-channels');
  await expect(
    page.locator('#community-channels [data-home-pending]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: '社区交流与连接渠道', exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => window.communityRuns.filter((run) => run.kind === 'title').length,
    ),
  ).toBe(0);
  await page.goto('/community');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-home-pending]')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.communityAnimations.every(
        (animation) => animation.playState === 'idle',
      ),
    ),
  ).toBe(true);
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: '首页', exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '让 AI 基础设施优化成为全社会的“公共资产”',
  );
  await expect(page.locator('[data-home-pending]')).toHaveCount(0);
});

test('without JavaScript every community section and native link remains available', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/community');
    await expect(page.locator('main section')).toHaveCount(5);
    await expect(page.locator('[data-home-pending]')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: '@imneov', exact: true }),
    ).toHaveAttribute('href', 'https://github.com/imneov');
    expect(
      await page
        .locator('main h2')
        .evaluateAll((headings) =>
          headings.every(
            (heading) => getComputedStyle(heading).opacity === '1',
          ),
        ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
