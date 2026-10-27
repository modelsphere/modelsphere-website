import { expect, test } from '@playwright/test';

const tags = [
  '先进推理服务架构',
  '新模型首日高性能部署',
  '广泛异构算力统一纳管',
  '性能持续自演进',
];
const lead =
  '让大模型推理从“能跑”到“生产好用”，让每张 GPU 化身高效 Token 产线。';
const description =
  '基于 Kubernetes 构建，将模型部署、缓存感知路由、按 SLO 弹性伸缩、全维可观测性、挂起故障秒级自愈与 AutoTune 闭环组织成一套工业级推理调度系统，帮助开发者在复杂异构算力上稳定承载大规模生产流量。';

test('home restores the selected Stitch screen copy, gradient and desktop proportions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole('list', { name: '首页能力速览' }).getByRole('listitem'),
  ).toHaveText(tags);
  await expect(page.locator('[data-home-hero="lead"]')).toHaveText(lead);
  await expect(page.locator('[data-home-hero="description"]')).toHaveText(
    description,
  );
  await expect(
    page.getByRole('link', { name: '快速开始 Quickstart', exact: true }),
  ).toBeVisible();
  const catalogLink = page.getByRole('link', {
    name: '模型调优库 (Model Catalog)',
    exact: true,
  });
  await expect(catalogLink).toBeVisible();
  await expect(catalogLink).toHaveAttribute('href', '/models');
  await expect(catalogLink).not.toHaveAttribute('target', '_blank');

  const measured = await page.evaluate(() => {
    const hero = document.getElementById('hero')!;
    const title = document.querySelector<HTMLElement>(
      '[data-home-hero="title"]',
    )!;
    const intro = document.querySelector<HTMLElement>(
      '[data-home-hero="description"]',
    )!;
    const pills = Array.from(
      document.querySelectorAll<HTMLElement>('[data-home-tag]'),
    );
    const gradient = getComputedStyle(title.querySelector('span')!);
    const top = hero.getBoundingClientRect().top;
    return {
      headerHeight: document
        .querySelector('.site-header')!
        .getBoundingClientRect().height,
      tagTop: pills[0].getBoundingClientRect().top - top,
      tagHeights: pills.map((pill) => pill.getBoundingClientRect().height),
      dots: pills.map(
        (pill) => getComputedStyle(pill, '::before').backgroundColor,
      ),
      titleTop: title.getBoundingClientRect().top - top,
      titleSize: getComputedStyle(title).fontSize,
      titleWeight: getComputedStyle(title).fontWeight,
      descriptionWidth: intro.getBoundingClientRect().width,
      descriptionSize: getComputedStyle(intro).fontSize,
      gradient: gradient.backgroundImage,
      clipped: gradient.backgroundClip,
      background: getComputedStyle(hero).backgroundImage,
      architectureTop:
        document
          .querySelector('[data-home-architecture]')!
          .getBoundingClientRect().top - top,
      cardTitleSize: getComputedStyle(document.querySelector('#comparison h3')!)
        .fontSize,
      mechanismTitleSize: getComputedStyle(
        document.querySelector('#qos-scaling h2')!,
      ).fontSize,
    };
  });
  // Measurements come from the selected source at 1280 CSS pixels, excluding its separate header.
  // The independent header has a 64px inner row and a 1px border.
  expect(measured.headerHeight).toBe(65);
  expect(measured.tagTop).toBe(24);
  expect(measured.tagHeights).toEqual([26, 26, 26, 26]);
  expect(measured.dots).toEqual([
    'rgb(16, 185, 129)',
    'rgb(2, 132, 199)',
    'rgb(6, 182, 212)',
    'rgb(2, 132, 199)',
  ]);
  expect(measured.titleTop).toBeCloseTo(130, 0);
  expect(measured.titleSize).toBe('48px');
  expect(measured.titleWeight).toBe('800');
  expect(measured.descriptionWidth).toBe(896);
  expect(measured.descriptionSize).toBe('16px');
  expect(measured.gradient).toContain('rgb(2, 132, 199)');
  expect(measured.gradient).toContain('rgb(8, 145, 178)');
  expect(measured.gradient).toContain('rgb(13, 148, 136)');
  expect(measured.clipped).toBe('text');
  expect(measured.background).toContain('rgba(240, 249, 255, 0.4)');
  await expect(page.locator('[data-home-diagram="architecture"]')).toHaveCount(
    1,
  );
  expect(measured.architectureTop).toBeCloseTo(532, 0);
  expect(measured.cardTitleSize).toBe('20px');
  expect(measured.mechanismTitleSize).toBe('36px');
});

test('only the two source tag dots animate and reduced motion keeps both static', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const signals = () =>
    page.locator('[data-home-tag]').evaluateAll((pills) =>
      pills.map((pill) => {
        const style = getComputedStyle(pill, '::before');
        const animation = pill
          .getAnimations({ subtree: true })
          .find(
            (candidate) =>
              candidate instanceof CSSAnimation &&
              candidate.animationName === style.animationName,
          );
        return {
          name: style.animationName,
          duration: style.animationDuration,
          frames:
            (animation?.effect as KeyframeEffect | null)?.getKeyframes() ?? [],
        };
      }),
    );
  const active = await signals();
  expect(active[0].name).not.toBe('none');
  expect(active[0].duration).toBe('2s');
  expect(active[0].frames.some((frame) => Number(frame.opacity) === 0.5)).toBe(
    true,
  );
  expect(active[1].name).toBe('none');
  expect(active[2].name).toBe('none');
  expect(active[3].name).not.toBe('none');
  expect(active[3].name).not.toBe(active[0].name);
  expect(active[3].duration).toBe('1s');
  expect(
    active[3].frames.some(
      (frame) => frame.transform === 'scale(2)' && Number(frame.opacity) === 0,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect((await signals()).every((signal) => signal.name === 'none')).toBe(
    true,
  );
});
