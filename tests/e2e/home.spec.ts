import { test, expect, type Page } from '@playwright/test';

const sectionIds = [
  'hero',
  'comparison',
  'fault-tolerance',
  'qos-scaling',
  'autotune-evolution',
  'get-started',
] as const;
const mechanismIds = [
  'fault-tolerance',
  'qos-scaling',
  'autotune-evolution',
] as const;
const home = 'main[data-home-page]#main-content';
const reveal = `${home} [data-home-reveal]`;
const heroText = `${home} [data-home-hero]`;
const architecture = `${home} [data-home-architecture]`;
const intro = `${home} [data-home-intro]`;

type RevealSample = { opacity: number; x: number; y: number };
type RevealRun = {
  section: string;
  kind: string;
  childIndex: number;
  mode: 'horizontal' | 'stacked' | 'single';
  duration: number;
  delay: number;
  easing: string;
  startedAt: number;
  triggerTop: number;
  viewportHeight: number;
  frames: RevealSample[];
  samples: RevealSample[];
  before: number[];
  layouts: number[][];
  completed: boolean;
  overflowed: boolean;
};
type HeroStyle = {
  opacity: number;
  x: number;
  y: number;
  scaleX: number;
  rotationX: number;
  transform: string;
};
type HeroRun = {
  kind: string;
  duration: number;
  delay: number;
  fill: FillMode;
  easing: string;
  frames: HeroStyle[];
  samples: HeroStyle[];
  before: { text: string | null; html: string; box: number[] };
  completed: boolean;
  overflowed: boolean;
};
type ArchitectureSample = {
  clipPath: string;
  y: number;
  opacity: number;
  transform: string;
  box: number[];
  comparisonTop: number;
  staticBoxes: number[][];
  childBoxes: number[][];
  childAnimations: number;
};
type ArchitectureRun = {
  duration: number;
  delay: number;
  fill: FillMode;
  frames: { clipPath?: string; y: number; opacity: number }[];
  before: ArchitectureSample;
  samples: ArchitectureSample[];
  completed: boolean;
};
type MotionWindow = Window & {
  __homeTestAnimations?: Animation[];
  __homeRevealRuns?: RevealRun[];
  __homeIntroRuns?: RevealRun[];
  __homeVisibility?: 'hidden' | 'visible';
  __homeHeroRuns?: HeroRun[];
  __homeHeroAnimations?: Animation[];
  __homeArchitectureRuns?: ArchitectureRun[];
  __homeArchitectureAnimations?: Animation[];
  __homeArchitectureSamplers?: (() => void)[];
};

async function observeRealReveals(
  page: Page,
  initiallyHidden = false,
  pauseHero = false,
  pauseArchitecture = false,
  pauseReveals = false,
) {
  await page.addInitScript(
    ({ initiallyHidden, pauseHero, pauseArchitecture, pauseReveals }) => {
      const tracked = window as MotionWindow;
      tracked.__homeRevealRuns = [];
      tracked.__homeIntroRuns = [];
      tracked.__homeTestAnimations = [];
      tracked.__homeHeroRuns = [];
      tracked.__homeHeroAnimations = [];
      tracked.__homeArchitectureRuns = [];
      tracked.__homeArchitectureAnimations = [];
      tracked.__homeArchitectureSamplers = [];
      tracked.__homeVisibility = initiallyHidden ? 'hidden' : 'visible';
      // Drive the platform lifecycle deterministically, without changing app code.
      Object.defineProperties(document, {
        hidden: { get: () => tracked.__homeVisibility === 'hidden' },
        visibilityState: { get: () => tracked.__homeVisibility },
      });
      const original = Element.prototype.animate;
      Element.prototype.animate = function (
        this: Element,
        ...args: Parameters<Element['animate']>
      ) {
        const triggerTop = this.getBoundingClientRect().top;
        const animation = original.apply(this, args);
        if (this.matches('main[data-home-page] [data-home-architecture]')) {
          const element = this as HTMLElement;
          const effect = animation.effect as KeyframeEffect;
          const timing = effect.getTiming();
          const box = (node: HTMLElement) => [
            node.offsetLeft,
            node.offsetTop,
            node.offsetWidth,
            node.offsetHeight,
          ];
          const measure = (): ArchitectureSample => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              clipPath: style.clipPath,
              y: new DOMMatrix(style.transform).m42,
              opacity: Number(style.opacity),
              transform: style.transform,
              box: box(element),
              comparisonTop: document.getElementById('comparison')!.offsetTop,
              staticBoxes: Array.from(element.parentElement!.children)
                .filter((node) => node !== element)
                .map((node) => box(node as HTMLElement)),
              childBoxes: Array.from(element.children).map((child) => {
                const childRect = child.getBoundingClientRect();
                return [
                  childRect.left - rect.left,
                  childRect.top - rect.top,
                  childRect.width,
                  childRect.height,
                ].map((value) => Math.round(value * 10) / 10);
              }),
              childAnimations: Array.from(
                element.querySelectorAll('*'),
              ).flatMap((child) => child.getAnimations()).length,
            };
          };
          const run: ArchitectureRun = {
            duration: Number(timing.duration),
            delay: timing.delay ?? 0,
            fill: timing.fill ?? 'auto',
            frames: effect.getKeyframes().map((frame) => ({
              clipPath: frame.clipPath as string | undefined,
              y: new DOMMatrix(String(frame.transform)).m42,
              opacity: Number(frame.opacity),
            })),
            before: measure(),
            samples: [],
            completed: false,
          };
          tracked.__homeArchitectureRuns!.push(run);
          tracked.__homeArchitectureAnimations!.push(animation);
          if (pauseArchitecture) animation.pause();
          const sample = () => {
            run.samples.push(measure());
            if (animation.playState === 'running')
              requestAnimationFrame(sample);
          };
          tracked.__homeArchitectureSamplers!.push(sample);
          requestAnimationFrame(sample);
          void animation.finished.then(
            () => {
              sample();
              run.completed = true;
            },
            () => {},
          );
          return animation;
        }
        if (this.matches('main[data-home-page] [data-home-hero]')) {
          const element = this as HTMLElement;
          const effect = animation.effect as KeyframeEffect;
          const timing = effect.getTiming();
          const styleValues = (
            opacity: number,
            transform: string,
          ): HeroStyle => {
            const matrix = new DOMMatrix(transform);
            return {
              opacity,
              x: matrix.m41,
              y: matrix.m42,
              scaleX: matrix.m11,
              rotationX: (Math.atan2(matrix.m23, matrix.m22) * 180) / Math.PI,
              transform,
            };
          };
          const run: HeroRun = {
            kind: element.getAttribute('data-home-hero')!,
            duration: Number(timing.duration),
            delay: timing.delay ?? 0,
            fill: timing.fill ?? 'auto',
            easing: timing.easing ?? 'linear',
            frames: effect
              .getKeyframes()
              .map((frame) =>
                styleValues(
                  Number(frame.opacity),
                  String(frame.transform ?? 'none'),
                ),
              ),
            samples: [],
            before: {
              text: element.textContent,
              html: element.innerHTML,
              box: [
                element.offsetLeft,
                element.offsetTop,
                element.offsetWidth,
                element.offsetHeight,
              ],
            },
            completed: false,
            overflowed: false,
          };
          tracked.__homeHeroRuns!.push(run);
          tracked.__homeHeroAnimations!.push(animation);
          if (pauseHero) animation.pause();
          const sample = () => {
            const style = getComputedStyle(element);
            run.samples.push(
              styleValues(Number(style.opacity), style.transform),
            );
            run.overflowed ||=
              document.documentElement.scrollWidth > innerWidth + 1;
            if (animation.playState === 'running')
              requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
          void animation.finished.then(
            () => {
              sample();
              run.completed = true;
            },
            () => {},
          );
          return animation;
        }
        if (
          !this.matches(
            'main[data-home-page] [data-home-intro], main[data-home-page] [data-home-reveal], main[data-home-page] [data-home-pair] > *',
          )
        )
          return animation;
        if (pauseReveals && !this.hasAttribute('data-home-intro')) {
          animation.pause();
          tracked.__homeTestAnimations!.push(animation);
        }
        const element = this as HTMLElement;
        const isIntro = element.hasAttribute('data-home-intro');
        const owner = element.parentElement?.hasAttribute('data-home-pair')
          ? element.parentElement
          : null;
        const group = owner ?? element.closest('[data-home-reveal]') ?? element;
        const siblings = owner
          ? Array.from(owner.children).filter(
              (child): child is HTMLElement => child instanceof HTMLElement,
            )
          : [];
        const sameRow = siblings.some(
          (sibling) =>
            sibling !== element &&
            sibling.offsetTop < element.offsetTop + element.offsetHeight &&
            element.offsetTop < sibling.offsetTop + sibling.offsetHeight &&
            sibling.offsetLeft !== element.offsetLeft,
        );
        const layout = () => [
          element.offsetLeft,
          element.offsetTop,
          element.offsetWidth,
          element.offsetHeight,
          (element.nextElementSibling as HTMLElement | null)?.offsetTop ?? -1,
        ];
        const run: RevealRun = {
          section: group.closest('section')!.id,
          kind: isIntro ? 'intro' : group.getAttribute('data-home-reveal')!,
          childIndex: isIntro
            ? Array.from(
                document.querySelectorAll('[data-home-intro]'),
              ).indexOf(element)
            : owner
              ? siblings.indexOf(element)
              : -1,
          mode: owner ? (sameRow ? 'horizontal' : 'stacked') : 'single',
          duration: Number(animation.effect!.getTiming().duration),
          delay: animation.effect!.getTiming().delay ?? 0,
          easing: animation.effect!.getTiming().easing ?? 'linear',
          startedAt: performance.now(),
          triggerTop: sameRow
            ? Math.min(
                ...siblings
                  .filter(
                    (sibling) =>
                      sibling.offsetTop <
                        element.offsetTop + element.offsetHeight &&
                      element.offsetTop <
                        sibling.offsetTop + sibling.offsetHeight,
                  )
                  .map((sibling) => sibling.getBoundingClientRect().top),
              )
            : triggerTop,
          viewportHeight: window.innerHeight,
          frames: (animation.effect as KeyframeEffect)
            .getKeyframes()
            .map((frame) => {
              const matrix = new DOMMatrix(
                frame.transform as string | undefined,
              );
              return {
                opacity: Number(frame.opacity),
                x: matrix.m41,
                y: matrix.m42,
              };
            }),
          samples: [],
          before: layout(),
          layouts: [],
          completed: false,
          overflowed: false,
        };
        tracked[isIntro ? '__homeIntroRuns' : '__homeRevealRuns']!.push(run);
        const sample = () => {
          const style = getComputedStyle(this);
          const matrix = new DOMMatrix(style.transform);
          run.samples.push({
            opacity: Number(style.opacity),
            x: matrix.m41,
            y: matrix.m42,
          });
          run.layouts.push(layout());
          run.overflowed ||=
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth;
          if (animation.playState === 'running') requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        void animation.finished.then(
          () => {
            sample();
            run.completed = true;
          },
          () => {},
        );
        return animation;
      };
    },
    { initiallyHidden, pauseHero, pauseArchitecture, pauseReveals },
  );
}

async function expectArchitectureRemoved(page: Page) {
  await expect(page.locator(architecture)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as MotionWindow).__homeArchitectureRuns ?? [],
    ),
  ).toEqual([]);
}

async function expectHeroSettled(page: Page) {
  expect(
    await page.locator(heroText).evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform);
        return {
          opacity: Number(style.opacity),
          x: matrix.m41,
          y: matrix.m42,
          scaleX: matrix.m11,
          rotationX: (Math.atan2(matrix.m23, matrix.m22) * 180) / Math.PI,
          transform: style.transform,
          active: element
            .getAnimations()
            .some((animation) =>
              ['running', 'paused'].includes(animation.playState),
            ),
        };
      }),
    ),
  ).toEqual(
    Array.from({ length: 3 }, () => ({
      opacity: 1,
      x: 0,
      y: 0,
      scaleX: 1,
      rotationX: 0,
      transform: 'none',
      active: false,
    })),
  );
}

async function setHomeVisibility(page: Page, visibility: 'hidden' | 'visible') {
  await page.evaluate((value) => {
    (window as MotionWindow).__homeVisibility = value;
    document.dispatchEvent(new Event('visibilitychange'));
  }, visibility);
}

async function expectFinishedReveal(
  page: Page,
  section: string,
  childIndex?: number,
) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ id, index }) =>
          (window as MotionWindow).__homeRevealRuns!.some(
            (run) =>
              run.section === id &&
              (index === undefined || run.childIndex === index) &&
              run.completed,
          ),
        { id: section, index: childIndex },
      ),
    )
    .toBe(true);
}

async function enterEveryCard(page: Page, section: string) {
  const cards = page.locator(`#${section} [data-home-pair] > *`);
  for (let index = 0; index < (await cards.count()); index++) {
    await cards.nth(index).evaluate((element) =>
      window.scrollTo({
        top: scrollY + element.getBoundingClientRect().top - innerHeight * 0.68,
        behavior: 'instant',
      }),
    );
    await expectFinishedReveal(page, section, index);
  }
}

async function expectReadableHome(page: Page): Promise<void> {
  await expect(page.locator(home)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '模域 ModelSphere',
  );
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '生产级算力部署与推理优化开源平台',
  );
  for (const id of sectionIds)
    await expect(page.locator(`${home} section#${id}`)).toBeVisible();
  await expect(page.locator(`${home} #benchmarks table`)).toHaveCount(1);
  await expect(page.locator(reveal)).not.toHaveCount(0);
  expect(
    await page.locator(reveal).evaluateAll((elements) =>
      elements.every((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return (
          style.visibility === 'visible' &&
          Number(style.opacity) >= 0.85 &&
          box.width > 0 &&
          box.height > 0
        );
      }),
    ),
  ).toBe(true);
}

async function expectAnchorClearOfHeader(
  page: Page,
  id: string,
): Promise<void> {
  await expect(page.locator(`${home} #${id}`)).toBeInViewport();
  await expect
    .poll(() =>
      page.evaluate((targetId) => {
        const target = document.getElementById(targetId);
        const header = document.querySelector('.site-header');
        if (!target || !header) return false;
        return (
          target.getBoundingClientRect().top + 1 >=
          header.getBoundingClientRect().bottom
        );
      }, id),
    )
    .toBe(true);
}

test('home serves its complete reading structure before hydration', async ({
  request,
  page,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toMatch(/<main\b[^>]*\bdata-home-page(?:\s|=|>)/);
  expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
  for (const id of sectionIds) expect(html).toContain(`id="${id}"`);
  expect(html).toContain('模域 ModelSphere');
  expect(html).toContain('id="benchmarks"');
  await page.goto('/');
  await expectReadableHome(page);
});

test('light and dark home layouts stay within every supported viewport', async ({
  page,
  baseURL,
}) => {
  const foreign: string[] = [];
  const errors: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin)
      foreign.push(request.url());
  });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      colorScheme,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    for (const width of [320, 390, 767, 768, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expectReadableHome(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${colorScheme} home overflows at ${width}px`,
      ).toBe(true);
    }
  }
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
});

test('no-script home keeps its content, native links and anchor offsets', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    colorScheme: 'dark',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expectReadableHome(page);
    await expectHeroSettled(page);
    await expectArchitectureRemoved(page);
    await expect(page.locator('.theme-toggle')).toBeHidden();
    await expect(
      page.locator(`${home} a[href^="https://github.com/modelsphere"]`).first(),
    ).toBeVisible();
    const hrefs = await page
      .locator(`${home} a`)
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
      expect(href).not.toMatch(/^(?:javascript|data):/i);
    }
    const link = page.locator('#hero a[href="#fault-tolerance"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/#fault-tolerance$/);
    await expectAnchorClearOfHeader(page, 'fault-tolerance');
    await page.reload();
    await expectAnchorClearOfHeader(page, 'fault-tolerance');
  } finally {
    await context.close();
  }
});

for (const width of [390, 1440]) {
  test(`hero title and introductory copy enter without waiting for fonts or moving their layout at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page);
    let releaseFonts!: () => void;
    let delayedFonts = 0;
    const fontGate = new Promise<void>((resolve) => {
      releaseFonts = resolve;
    });
    await page.route(/\.(?:woff2?|ttf|otf)(?:\?|$)/, async (route) => {
      delayedFonts++;
      await fontGate;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute(
        'data-has-hydrated',
        'true',
      );
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as MotionWindow).__homeHeroRuns!.filter(
                (run) => run.completed,
              ).length,
          ),
        )
        .toBe(3);
      expect(delayedFonts).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.fonts.status)).toBe('loading');
      const runs = await page.evaluate(
        () => (window as MotionWindow).__homeHeroRuns!,
      );
      await testInfo.attach(`hero-${width}-native-animation-samples`, {
        body: Buffer.from(JSON.stringify({ width, runs }, null, 2)),
        contentType: 'application/json',
      });
      expect(runs.map((run) => run.kind)).toEqual([
        'title',
        'lead',
        'description',
      ]);
      expect(runs.map((run) => run.delay)).toEqual([0, 0, 0]);
      for (const run of runs) {
        const title = run.kind === 'title';
        const compact = width < 768;
        expect(run.duration).toBe(title ? (compact ? 850 : 1050) : 700);
        expect(run.duration + run.delay).toBeLessThanOrEqual(
          compact ? 1120 : 1280,
        );
        expect(run.easing.replace(/\s/g, '')).toBe(
          title
            ? 'cubic-bezier(0.22,1,0.36,1)'
            : 'cubic-bezier(0.333333,1,0.666667,1)',
        );
        expect(['backwards', 'both']).toContain(run.fill);
        expect(run.frames).toHaveLength(2);
        const [start, end] = run.frames;
        expect(start.opacity).toBe(0);
        expect(start.x).toBe(0);
        expect(start.y).toBe(title ? (compact ? 32 : 48) : 16);
        expect(start.scaleX).toBeCloseTo(title ? 0.96 : 1, 4);
        expect(start.rotationX).toBeCloseTo(title ? (compact ? 12 : 18) : 0, 4);
        if (title) {
          expect(start.transform).toContain('perspective(900px)');
          expect(start.transform).toContain(`rotateX(${compact ? 12 : 18}deg)`);
          expect(run.samples.some((sample) => sample.y > 0)).toBe(true);
          expect(run.samples.some((sample) => sample.rotationX > 0)).toBe(true);
          expect(run.samples.some((sample) => sample.scaleX < 0.9999)).toBe(
            true,
          );
          expect(run.samples.every((sample) => sample.x === 0)).toBe(true);
        } else {
          expect(start.transform).not.toMatch(/perspective|rotate/i);
          expect(run.samples.every((sample) => sample.x === 0)).toBe(true);
          expect(run.samples.some((sample) => sample.y > 0)).toBe(true);
          expect(run.samples.every((sample) => sample.rotationX === 0)).toBe(
            true,
          );
          expect(run.samples.every((sample) => sample.scaleX === 1)).toBe(true);
        }
        expect(end).toMatchObject({
          opacity: 1,
          x: 0,
          y: 0,
          scaleX: 1,
          rotationX: 0,
        });
        expect(
          run.samples.some(
            (sample) => sample.opacity > 0 && sample.opacity < 0.99,
          ),
        ).toBe(true);
        expect(run.samples.at(-1)).toEqual({
          opacity: 1,
          x: 0,
          y: 0,
          scaleX: 1,
          rotationX: 0,
          transform: 'none',
        });
        expect(run.overflowed).toBe(false);
      }
      const settled = await page.locator(heroText).evaluateAll((elements) =>
        elements.map((element) => {
          const text = element as HTMLElement;
          return {
            text: text.textContent,
            html: text.innerHTML,
            box: [
              text.offsetLeft,
              text.offsetTop,
              text.offsetWidth,
              text.offsetHeight,
            ],
          };
        }),
      );
      expect(settled).toEqual(runs.map((run) => run.before));
      await expectHeroSettled(page);
      await expectReadableHome(page);
    } finally {
      releaseFonts();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}

for (const interruption of [
  'reduced motion',
  'background',
  'focus',
  'history restore',
] as const) {
  test(`hero text immediately settles on ${interruption} and never replays`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page, false, true, true);
    await page.goto('/');
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as MotionWindow).__homeHeroAnimations!.length,
        ),
      )
      .toBe(3);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as MotionWindow).__homeArchitectureAnimations!.length,
        ),
      )
      .toBe(0);
    if (interruption === 'reduced motion') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } else if (interruption === 'background') {
      await setHomeVisibility(page, 'hidden');
    } else if (interruption === 'history restore') {
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent('pageshow', { persisted: true }),
        ),
      );
    } else {
      await page.locator('#hero a').first().focus();
    }
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as MotionWindow).__homeHeroAnimations!.every(
            (animation) => animation.playState === 'idle',
          ),
        ),
      )
      .toBe(true);
    await expectHeroSettled(page);
    await expectArchitectureRemoved(page);
    if (interruption === 'reduced motion')
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    await setHomeVisibility(page, 'visible');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    expect(
      await page.evaluate(
        () => (window as MotionWindow).__homeHeroRuns!.length,
      ),
    ).toBe(3);
    expect(
      await page.evaluate(
        () => (window as MotionWindow).__homeArchitectureRuns!.length,
      ),
    ).toBe(0);
    await expectHeroSettled(page);
    await expectArchitectureRemoved(page);
  });
}

test('a direct mechanism link skips hero entrance and preserves its native anchor', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page);
  await page.goto('/#fault-tolerance');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await expectAnchorClearOfHeader(page, 'fault-tolerance');
  expect(
    await page.evaluate(() => (window as MotionWindow).__homeHeroRuns),
  ).toEqual([]);
  await expectHeroSettled(page);
});

test('returning from the docs with browser history does not replay the hero entrance', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page);
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as MotionWindow).__homeHeroRuns!.filter(
            (run) => run.completed,
          ).length,
      ),
    )
    .toBe(3);
  await expectHeroSettled(page);
  const documentOrigin = await page.evaluate(() => performance.timeOrigin);
  await page
    .locator('#hero a')
    .filter({ hasText: '快速开始 Quickstart' })
    .first()
    .click();
  await expect(page).toHaveURL(/\/docs\/?$/);
  await expect(page.locator(home)).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const restored = await page.evaluate(() => ({
    origin: performance.timeOrigin,
    runs: (window as MotionWindow).__homeHeroRuns!.length,
  }));
  expect(restored.runs).toBe(restored.origin === documentOrigin ? 3 : 0);
  await expectHeroSettled(page);
  await expectReadableHome(page);
});

for (const width of [390, 1440]) {
  test(`module introductions wait for their reading line, fade upward together and never replay at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 600 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await page.evaluate(() => document.fonts.ready);
    const headings = page.locator(intro);
    await expect(headings).toHaveCount(6);
    await headings.first().evaluate((element) =>
      window.scrollTo({
        top:
          scrollY +
          element.getBoundingClientRect().top -
          innerHeight * 0.88 -
          24,
        behavior: 'instant',
      }),
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    expect(
      await page.evaluate(() => (window as MotionWindow).__homeIntroRuns),
    ).toEqual([]);
    await expect(headings.first()).toHaveCSS('opacity', '0');
    for (let index = 0; index < 6; index++) {
      await headings.nth(index).evaluate((element) =>
        window.scrollTo({
          top:
            scrollY + element.getBoundingClientRect().top - innerHeight * 0.65,
          behavior: 'instant',
        }),
      );
      await expect
        .poll(() =>
          page.evaluate(
            (ordinal) =>
              (window as MotionWindow).__homeIntroRuns!.some(
                (run) => run.childIndex === ordinal && run.completed,
              ),
            index,
          ),
        )
        .toBe(true);
    }
    const runs = await page.evaluate(
      () => (window as MotionWindow).__homeIntroRuns!,
    );
    await testInfo.attach(`introductions-${width}-native-animation-samples`, {
      body: Buffer.from(JSON.stringify(runs, null, 2)),
      contentType: 'application/json',
    });
    expect(runs).toHaveLength(6);
    expect([...new Set(runs.map((run) => run.section))]).toEqual(
      sectionIds.slice(1),
    );
    for (const run of runs) {
      expect(run.duration).toBe(700);
      expect(run.delay).toBe(0);
      expect(run.easing.replace(/\s/g, '')).toBe(
        'cubic-bezier(0.333333,1,0.666667,1)',
      );
      expect(run.frames).toEqual([
        { opacity: 0, x: 0, y: 16 },
        { opacity: 1, x: 0, y: 0 },
      ]);
      expect(
        run.samples.some(
          (sample) => sample.opacity > 0 && sample.opacity < 1 && sample.y > 0,
        ),
      ).toBe(true);
      expect(run.samples.at(-1)).toEqual({ opacity: 1, x: 0, y: 0 });
      expect(
        run.layouts.every(
          (layout) =>
            layout[2] === run.before[2] && layout[3] === run.before[3],
        ),
      ).toBe(true);
      expect(run.overflowed).toBe(false);
    }
    for (const index of [0, 5, 1, 4])
      await headings.nth(index).scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => (window as MotionWindow).__homeIntroRuns!.length,
      ),
    ).toBe(6);
    await expect(page.locator(`${intro}[data-home-pending]`)).toHaveCount(0);
  });
}

for (const width of [390, 1440]) {
  test(`removed architecture leaves no pending motion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as MotionWindow).__homeHeroRuns!.filter(
              (run) => run.completed,
            ).length,
        ),
      )
      .toBe(3);
    await expectHeroSettled(page);
    await expectArchitectureRemoved(page);
    await page.locator('#comparison').scrollIntoViewIfNeeded();
    await expect(page.locator('#comparison')).toBeVisible();
    await expect(page.locator('#hero [data-home-pending]')).toHaveCount(0);
  });
}

test('backgrounding and breakpoint changes do not schedule the removed architecture', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page, true);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await setHomeVisibility(page, 'visible');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as MotionWindow).__homeHeroRuns!.filter(
            (run) => run.completed,
          ).length,
      ),
    )
    .toBe(3);
  await expectHeroSettled(page);
  await setHomeVisibility(page, 'hidden');
  await setHomeVisibility(page, 'visible');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectArchitectureRemoved(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectArchitectureRemoved(page);
});

for (const width of [390, 768, 1024, 1440]) {
  test(`scrolling plays every actual card once with the rendered layout direction at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => (window as MotionWindow).__homeRevealRuns),
    ).toEqual([]);
    for (const id of ['comparison', ...mechanismIds])
      await enterEveryCard(page, id);
    await page
      .locator('#get-started [data-home-reveal]')
      .evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'instant' }),
      );
    await expectFinishedReveal(page, 'get-started', -1);
    const runs = await page.evaluate(
      () => (window as MotionWindow).__homeRevealRuns!,
    );
    expect(runs).toHaveLength(11);
    for (const id of ['comparison', ...mechanismIds]) {
      const cards = runs.filter((run) => run.section === id);
      expect(cards.map((run) => run.childIndex).sort()).toEqual(
        id === 'comparison' ? [0, 1, 2, 3] : [0, 1],
      );
    }
    for (const run of runs) {
      const horizontal =
        width >= 768 &&
        (['comparison', 'qos-scaling'].includes(run.section) ||
          (width >= 1280 &&
            mechanismIds.includes(
              run.section as (typeof mechanismIds)[number],
            )));
      const mode =
        run.childIndex < 0 ? 'single' : horizontal ? 'horizontal' : 'stacked';
      expect(run.mode).toBe(mode);
      expect(run.duration).toBe(
        mode === 'horizontal'
          ? 900
          : mode === 'stacked'
            ? 700
            : width < 768
              ? 240
              : 320,
      );
      expect(run.frames[0].opacity).toBe(mode === 'single' ? 0.85 : 0);
      expect(
        Math.min(...run.samples.map((sample) => sample.opacity)),
      ).toBeLessThan(0.99);
      expect(run.samples.at(-1)).toEqual({ opacity: 1, x: 0, y: 0 });
      expect(run.overflowed).toBe(false);
      if (mode === 'horizontal') {
        expect(
          run.frames[0].x * (run.childIndex % 2 === 0 ? -1 : 1),
        ).toBeGreaterThan(0);
        expect(Math.abs(run.frames[0].x)).toBe(60);
        expect(run.frames[0].y).toBe(0);
        expect(run.samples.some((sample) => Math.abs(sample.x) > 0.1)).toBe(
          true,
        );
        if (run.childIndex % 2 === 0) {
          const sibling = runs.find(
            (other) =>
              other.section === run.section &&
              other.childIndex === run.childIndex + 1,
          )!;
          expect(Math.abs(sibling.startedAt - run.startedAt)).toBeLessThan(34);
        }
      } else {
        expect(run.frames[0].x).toBe(0);
        expect(run.frames[0].y).toBe(
          mode === 'stacked' ? 28 : width < 768 ? 4 : 8,
        );
        expect(run.samples.some((sample) => sample.y > 0.1)).toBe(true);
      }
    }
    await page.locator('#hero').scrollIntoViewIfNeeded();
    for (const id of ['comparison', ...mechanismIds]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    }
    await expectReadableHome(page);
    await expect(page.locator('[data-home-pending]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as MotionWindow).__homeRevealRuns!.length,
      ),
    ).toBe(11);
  });
}

for (const width of [390, 1440]) {
  test(`each visual row waits for its own 85% reading line at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await page.evaluate(() => document.fonts.ready);
    for (const id of ['comparison', ...mechanismIds]) {
      const cards = page.locator(`#${id} [data-home-pair] > *`);
      const rows = await cards.evaluateAll((elements) => {
        const grouped: number[][] = [];
        const ordered = elements
          .map((element, index) => ({ element: element as HTMLElement, index }))
          .sort((a, b) => a.element.offsetTop - b.element.offsetTop);
        for (const { index, element } of ordered) {
          const row = grouped.find((indices) => {
            const first = elements[indices[0]] as HTMLElement;
            return (
              first.offsetTop < element.offsetTop + element.offsetHeight &&
              element.offsetTop < first.offsetTop + first.offsetHeight
            );
          });
          if (row) row.push(index);
          else grouped.push([index]);
        }
        return grouped;
      });
      for (const row of rows) {
        const scrollTo = async (fraction: number) => {
          const target = cards.nth(row[0]);
          const delta = await target.evaluate(
            (element, ratio) =>
              element.getBoundingClientRect().top - innerHeight * ratio,
            fraction,
          );
          await page.mouse.wheel(0, delta);
          // The wheel rounds to physical pixels while layout retains fractions.
          await expect
            .poll(() =>
              target.evaluate(
                (element, ratio) =>
                  Math.abs(
                    element.getBoundingClientRect().top - innerHeight * ratio,
                  ),
                fraction,
              ),
            )
            .toBeLessThanOrEqual(1);
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
        };
        for (const fraction of [0.95, 0.87]) {
          await scrollTo(fraction);
          for (const index of row) {
            const card = cards.nth(index);
            await expect(card).toHaveCSS('opacity', '0');
          }
          expect(
            await page.evaluate(
              ({ section, indices }) =>
                (window as MotionWindow).__homeRevealRuns!.filter(
                  (run) =>
                    run.section === section && indices.includes(run.childIndex),
                ).length,
              { section: id, indices: row },
            ),
          ).toBe(0);
        }
        await scrollTo(0.83);
        for (const index of row) {
          await expectFinishedReveal(page, id, index);
          const run = await page.evaluate(
            ({ section, childIndex }) =>
              (window as MotionWindow).__homeRevealRuns!.find(
                (item) =>
                  item.section === section && item.childIndex === childIndex,
              )!,
            { section: id, childIndex: index },
          );
          expect(run.triggerTop).toBeLessThanOrEqual(run.viewportHeight * 0.85);
        }
      }
    }
  });
}

test('319px QoS reveals each stacked card only when that card reaches its own reading line', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 319, height: 580 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await page.evaluate(() => document.fonts.ready);
  const cards = page.locator('#qos-scaling [data-home-pair] > *');
  await expect(cards).toHaveCount(2);
  for (const index of [0, 1]) {
    const card = cards.nth(index);
    for (const fraction of [0.95, 0.87, 0.83]) {
      const delta = await card.evaluate(
        (element, ratio) =>
          element.getBoundingClientRect().top - innerHeight * ratio,
        fraction,
      );
      await page.mouse.wheel(0, delta);
      await expect
        .poll(() =>
          card.evaluate(
            (element, ratio) =>
              Math.abs(
                element.getBoundingClientRect().top - innerHeight * ratio,
              ),
            fraction,
          ),
        )
        .toBeLessThanOrEqual(1);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      if (fraction > 0.85) {
        await expect(card).toHaveAttribute('data-home-pending', '');
        await expect(card).toHaveCSS('opacity', '0');
        expect(
          await page.evaluate(
            (childIndex) =>
              (window as MotionWindow).__homeRevealRuns!.filter(
                (run) =>
                  run.section === 'qos-scaling' &&
                  run.childIndex === childIndex,
              ).length,
            index,
          ),
        ).toBe(0);
      }
    }
    await expectFinishedReveal(page, 'qos-scaling', index);
    if (index === 0) {
      expect(
        await cards
          .nth(1)
          .evaluate((element) => element.getBoundingClientRect().top),
      ).toBeGreaterThan(580 * 0.85);
      expect(
        await page.evaluate(() =>
          (window as MotionWindow).__homeRevealRuns!.filter(
            (run) => run.section === 'qos-scaling' && run.childIndex === 1,
          ),
        ),
      ).toEqual([]);
      await expect(cards.nth(1)).toHaveCSS('opacity', '0');
      await expect(cards.nth(1)).toHaveCSS('transform', 'none');
    }
  }
  const runs = await page.evaluate(() =>
    (window as MotionWindow).__homeRevealRuns!.filter(
      (run) => run.section === 'qos-scaling',
    ),
  );
  await testInfo.attach('qos-319x580-native-card-animation-samples', {
    body: Buffer.from(JSON.stringify(runs, null, 2)),
    contentType: 'application/json',
  });
  expect(runs.map((run) => run.childIndex)).toEqual([0, 1]);
  for (const run of runs) {
    expect(run.mode).toBe('stacked');
    expect(run.duration).toBe(700);
    expect(run.frames[0]).toEqual({ opacity: 0, x: 0, y: 28 });
    expect(
      run.samples.some(
        (sample) =>
          sample.y > 1 &&
          sample.y < 28 &&
          sample.opacity > 0 &&
          sample.opacity < 0.99,
      ),
    ).toBe(true);
    expect(run.samples.at(-1)).toEqual({ opacity: 1, x: 0, y: 0 });
    expect(run.triggerTop).toBeLessThanOrEqual(580 * 0.85);
    expect(run.overflowed).toBe(false);
    expect(
      run.layouts.every(
        (layout) => JSON.stringify(layout) === JSON.stringify(run.before),
      ),
    ).toBe(true);
  }
  await page.locator('#hero').scrollIntoViewIfNeeded();
  await cards.nth(0).scrollIntoViewIfNeeded();
  await cards.nth(1).scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () =>
        (window as MotionWindow).__homeRevealRuns!.filter(
          (run) => run.section === 'qos-scaling',
        ).length,
    ),
  ).toBe(2);
});

test('319px waiting blocks stay blank before entry, including background and layout changes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 319, height: 804 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  const targets = page.locator('[data-home-pair] > *');
  const expectBlank = async () => {
    await expect(targets).toHaveCount(10);
    for (const target of await targets.all()) {
      await expect(target).toHaveAttribute('data-home-pending', '');
      await expect(target).toHaveCSS('opacity', '0');
    }
    expect(
      await page.evaluate(() => (window as MotionWindow).__homeRevealRuns),
    ).toEqual([]);
  };
  await expectBlank();
  await setHomeVisibility(page, 'hidden');
  await expectBlank();
  await setHomeVisibility(page, 'visible');
  await expectBlank();
  await page.setViewportSize({ width: 1440, height: 804 });
  await expectBlank();
  await page.setViewportSize({ width: 319, height: 804 });
  await expectBlank();
  const first = targets.first();
  await first.evaluate((element) =>
    window.scrollTo({
      top: scrollY + element.getBoundingClientRect().top - innerHeight * 0.9,
      behavior: 'instant',
    }),
  );
  await expect(first).toHaveCSS('opacity', '0');
  await page.screenshot({
    path: testInfo.outputPath('319-before-entry-blank.png'),
  });
  await first.evaluate((element) =>
    window.scrollTo({
      top: scrollY + element.getBoundingClientRect().top - innerHeight * 0.8,
      behavior: 'instant',
    }),
  );
  await expectFinishedReveal(page, 'comparison', 0);
  await expect(first).toHaveCSS('opacity', '1');
  await expect(first).not.toHaveAttribute('data-home-pending');
  await expect(targets.nth(1)).toHaveCSS('opacity', '0');
  await page.screenshot({ path: testInfo.outputPath('319-after-entry.png') });
});

test('home opened in a background tab enables unread reveals on its first visible visit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page, true);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  expect(
    await page.evaluate(() => (window as MotionWindow).__homeHeroRuns),
  ).toEqual([]);
  await setHomeVisibility(page, 'hidden');
  await setHomeVisibility(page, 'visible');
  await expect
    .poll(() =>
      page.evaluate(() => (window as MotionWindow).__homeHeroRuns!.length),
    )
    .toBe(3);
  await enterEveryCard(page, 'comparison');
  await expectReadableHome(page);
});

for (const interruption of [
  'focus',
  'anchor',
  'background',
  'breakpoint',
] as const) {
  test(`both sides of a paired reveal settle on ${interruption} without replaying`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await observeRealReveals(page, false, false, false, true);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    const panel = page.locator('#fault-tolerance [data-home-pair]');
    await panel.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await expect
      .poll(() =>
        panel.evaluate(
          (element) =>
            element
              .getAnimations({ subtree: true })
              .filter((animation) => !(animation instanceof CSSAnimation))
              .length,
        ),
      )
      .toBe(2);
    if (interruption === 'focus') {
      await panel
        .locator('a')
        .first()
        .evaluate((element) => element.focus({ preventScroll: true }));
    } else if (interruption === 'anchor') {
      await page.evaluate(() => {
        window.location.hash = '#fault-tolerance';
      });
    } else if (interruption === 'background') {
      await setHomeVisibility(page, 'hidden');
      await setHomeVisibility(page, 'visible');
    } else {
      await page.setViewportSize({ width: 1024, height: 900 });
    }
    await expect
      .poll(() =>
        panel.evaluate((element) =>
          Array.from(element.children).map((child) => {
            const style = getComputedStyle(child);
            return {
              opacity: style.opacity,
              transform: style.transform,
              active: child.getAnimations().length,
            };
          }),
        ),
      )
      .toEqual(
        Array.from({ length: 2 }, () => ({
          opacity: '1',
          transform: 'none',
          active: 0,
        })),
      );
    await page.locator('#hero').scrollIntoViewIfNeeded();
    await panel.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () =>
          (window as MotionWindow).__homeRevealRuns!.filter(
            (run) => run.section === 'fault-tolerance',
          ).length,
      ),
    ).toBe(2);
  });
}

test('returning to a visible home preserves unread reveals without replaying consumed sections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await enterEveryCard(page, 'comparison');
  await setHomeVisibility(page, 'hidden');
  await setHomeVisibility(page, 'visible');
  await enterEveryCard(page, 'fault-tolerance');
  await page.locator('#comparison').scrollIntoViewIfNeeded();
  await expectReadableHome(page);
  expect(
    await page.evaluate(
      () =>
        (window as MotionWindow).__homeRevealRuns!.filter(
          (run) => run.section === 'comparison',
        ).length,
    ),
  ).toBe(4);
});

test('crossing a layout breakpoint preserves the first reveal of unread sections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeRealReveals(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await enterEveryCard(page, 'comparison');
  await expectReadableHome(page);
});

test('first visit with reduced motion leaves every diagram and section readable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await observeRealReveals(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  expect(
    await page.evaluate(() => (window as MotionWindow).__homeHeroRuns),
  ).toEqual([]);
  expect(
    await page.evaluate(() => (window as MotionWindow).__homeArchitectureRuns),
  ).toEqual([]);
  await expectHeroSettled(page);
  await expectArchitectureRemoved(page);
  for (const id of sectionIds) {
    await page.locator(`${home} #${id}`).scrollIntoViewIfNeeded();
    await expectReadableHome(page);
  }
  expect(
    await page.locator(home).evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) =>
          ['running', 'paused'].includes(animation.playState),
        )
        .map((animation) => animation.playState),
    ),
  ).toEqual([]);
});

test('changing to reduced motion cancels an active reveal without hiding content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    (window as MotionWindow).__homeTestAnimations = [];
    Element.prototype.animate = function (
      this: Element,
      ...args: Parameters<Element['animate']>
    ) {
      const animation = original.apply(this, args);
      if (
        this.matches(
          'main[data-home-page] [data-home-reveal], main[data-home-page] [data-home-pair] > *',
        )
      ) {
        // Hold a real reveal so the preference change cannot miss its lifetime.
        animation.pause();
        (window as MotionWindow).__homeTestAnimations!.push(animation);
      }
      return animation;
    };
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-has-hydrated',
    'true',
  );
  const panel = page.locator(`${home} [data-home-reveal="panel"]`).first();
  await panel.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as MotionWindow).__homeTestAnimations?.length ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await expectReadableHome(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as MotionWindow).__homeTestAnimations!.every(
          (animation) => animation.playState === 'idle',
        ),
      ),
    )
    .toBe(true);
  await page.locator(reveal).last().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-home-pending]')).toHaveCount(0);
  await expectReadableHome(page);
  expect(
    await page
      .locator(home)
      .evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .some((animation) =>
            ['running', 'paused'].includes(animation.playState),
          ),
      ),
  ).toBe(false);
});

for (const width of [390, 1440]) {
  test(`theme toggle preserves middle-page layout and keyboard focus at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    await page
      .locator('#qos-scaling')
      .evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'instant' }),
      );
    const before = await page.evaluate(
      (ids) => ({
        scrollY,
        boxes: ids.map((id) => {
          const { x, y, width, height } = document
            .getElementById(id)!
            .getBoundingClientRect();
          return { x, y, width, height };
        }),
      }),
      [...sectionIds],
    );
    expect(before.scrollY).toBeGreaterThan(0);
    await page
      .locator('.theme-toggle')
      .evaluate((button) =>
        (button as HTMLButtonElement).focus({ preventScroll: true }),
      );
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.theme-toggle')).toBeFocused();
    const after = await page.evaluate(
      (ids) => ({
        scrollY,
        boxes: ids.map((id) => {
          const { x, y, width, height } = document
            .getElementById(id)!
            .getBoundingClientRect();
          return { x, y, width, height };
        }),
      }),
      [...sectionIds],
    );
    expect(after.scrollY).toBeCloseTo(before.scrollY, 0);
    for (let i = 0; i < before.boxes.length; i++)
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(after.boxes[i][key]).toBeCloseTo(before.boxes[i][key], 0);
  });
}

test('hero mechanism links preserve native hashes and move keyboard focus below the header', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const id of mechanismIds) {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-has-hydrated',
      'true',
    );
    const link = page.locator(`#hero a[href="#${id}"]`).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', `#${id}`);
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/#${id}$`));
    await expect(page.locator(`${home} #${id}`)).toBeFocused();
    await expectAnchorClearOfHeader(page, id);
    await expectReadableHome(page);
  }
});

for (const width of [390, 1440])
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`home screenshots cover ${width}px in ${colorScheme} theme`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        colorScheme,
      );
      await page.waitForLoadState('networkidle');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expectReadableHome(page);
      await page.screenshot({
        path: testInfo.outputPath(`home-${width}-${colorScheme}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page.locator('#hero').screenshot({
        path: testInfo.outputPath(`home-${width}-${colorScheme}-hero.png`),
        animations: 'disabled',
      });
    });
  }

test('enlarged text and unavailable fonts preserve home reading and controls', async ({
  page,
}) => {
  await page.route('**/*.woff2', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator(`${home} *`).evaluateAll((elements) => {
    const sizes = elements
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .map((element) => ({
        element,
        size: Number.parseFloat(getComputedStyle(element).fontSize),
      }));
    for (const { element, size } of sizes)
      element.style.fontSize = `${size * 2}px`;
  });
  await expectReadableHome(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const link = page.locator('#hero a[href="#qos-scaling"]');
  await link.focus();
  await page.keyboard.press('Enter');
  await expectAnchorClearOfHeader(page, 'qos-scaling');
  await expect(page.locator('#qos-scaling')).toBeFocused();
});
