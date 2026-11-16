import { expect, test } from '@playwright/test';
import source from '../../docs/design/sources/stitch-home-sections-copy.json';
import communitySource from '../../docs/design/sources/stitch-community.json';
import continuationSource from '../../docs/design/sources/stitch-continuation.json';
import qosSource from '../../docs/design/sources/stitch-qos-scaling.json';

// Approved changes reserve loop-arrow gaps and remove the CTA metadata row.
const modules = {
  ...Object.fromEntries(
    Object.entries(source.modules).filter(([id]) => id !== 'qos-scaling'),
  ),
  'autotune-evolution': {
    ...source.modules['autotune-evolution'],
    height: 720,
  },
  'get-started': {
    ...source.modules['get-started'],
    text: 'Production Ready Infrastructure 准备好让你的大模型推理集群提速了吗？ 全套源码完全开源，加入顶尖 AI Infra 工程师共建的下一代推理基础设施。 立即部署 加入开发者交流群',
    height: 392,
  },
};

for (const [id, expected] of Object.entries(modules)) {
  test(`${id} restores every source label, icon and desktop proportion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    // The shared footer now uses the approved community design.
    if (id === 'home-footer') {
      const footer = page.locator('footer.community-footer');
      await expect(footer).toBeVisible();
      for (const fragment of [
        ...communitySource.footerCopy.slice(0, 3),
        communitySource.footerCopy.find((copy) => copy.startsWith('©'))!,
      ])
        await expect(footer).toContainText(fragment);
      await expect(
        footer.locator('a[href*="#community-calendar"]'),
      ).toHaveCount(0);
      const links = footer
        .getByRole('navigation', { name: '页脚导航' })
        .getByRole('link');
      await expect(footer.locator('a')).toHaveCount(8);
      await expect(links).toHaveText([
        '首页',
        '模型与调优',
        '博客',
        '文档指南',
        '快速开始',
        '社区生态',
        'GitHub',
        '技术交流群',
      ]);
      expect(
        await links.evaluateAll((items) =>
          items.map((item) => item.getAttribute('href')),
        ),
      ).toEqual([
        '/',
        '/models',
        '/blog',
        '/docs',
        process.env.TEST_DOCS_MODE === 'none' ? '/docs' : '/docs/quickstart',
        '/community',
        'https://github.com/modelsphere',
        '/community#community-channels',
      ]);
      const layout = await footer.evaluate((element) => {
        const inner = element.firstElementChild!.getBoundingClientRect();
        return {
          width: element.getBoundingClientRect().width,
          left: inner.left,
          right: inner.right,
          padding: getComputedStyle(element.firstElementChild!).paddingLeft,
        };
      });
      expect(layout.width).toBe(1280);
      expect(layout.left).toBe(1280 - layout.right);
      expect(layout.padding).toBe('32px');
      return;
    }
    const section = page.locator(`#${id}`);
    if (id === 'benchmarks') {
      await expect(section.getByRole('heading', { level: 2 })).toHaveText(
        '性能调优模型 Day-0 部署',
      );
      await expect(section.getByRole('table')).toHaveCount(0);
      const screenshot = section.getByRole('img');
      await screenshot.scrollIntoViewIfNeeded();
      await expect(screenshot).toBeVisible();
      await expect(section.locator('.home-console-sort-label')).toHaveCount(0);
      await expect(screenshot).toHaveAttribute(
        'src',
        '/screenshots/console-model-catalog.png',
      );
      await expect
        .poll(() =>
          screenshot.evaluate(
            (image: HTMLImageElement) =>
              image.complete &&
              image.naturalWidth === 2566 &&
              image.naturalHeight === 1522,
          ),
        )
        .toBe(true);
      await expect(section.locator('figcaption')).toHaveCount(0);
      await expect(section.getByRole('link')).toHaveCount(0);
      await expect(section).not.toContainText('Console 实际界面');
      expect(
        await page
          .locator('main > section[id]')
          .evaluateAll((sections) => sections.map((element) => element.id)),
      ).toEqual([
        'hero',
        'comparison',
        'benchmarks',
        'fault-tolerance',
        'qos-scaling',
        'dynamic-scaling',
        'autotune-evolution',
        'get-started',
      ]);
      return;
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
    if (id === 'fault-tolerance') {
      expect(measured.text.replace(/\s/g, '')).toBe(
        continuationSource.text.replace(/\s/g, ''),
      );
      expect(measured.icons).toEqual(continuationSource.icons);
      await expect(section.locator('.continuation-icon').first()).toHaveCSS(
        'font-family',
        '"ModelSphere Continuation Symbols Filled"',
      );
      await expect(section.locator('.continuation-feature')).toHaveCount(3);
      await expect(section.locator('.continuation-step')).toHaveCount(4);
      const semanticColors = await section.evaluate((element) => ({
        expected: getComputedStyle(element)
          .getPropertyValue('--color-home-success')
          .trim(),
        actual: getComputedStyle(element.querySelector('.continuation-step-4')!)
          .color,
      }));
      const expectedSuccess = await page.evaluate((color) => {
        const probe = document.createElement('span');
        probe.style.color = color;
        document.body.append(probe);
        const result = getComputedStyle(probe).color;
        probe.remove();
        return result;
      }, semanticColors.expected);
      expect(semanticColors.actual).toBe(expectedSuccess);
      await expect(section.locator('.continuation-title a')).toHaveAttribute(
        'href',
        'https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/docs/deploy-a-model.md#continuation-gateway-optional',
      );
      const layout = await section
        .locator('.continuation-layout')
        .evaluate((element) => {
          const [left, right] = Array.from(element.children).map((child) =>
            child.getBoundingClientRect(),
          );
          return {
            left: left.right,
            right: right.left,
            topDelta: Math.abs(left.top - right.top),
            height: element.getBoundingClientRect().height,
          };
        });
      expect(layout.left).toBeLessThan(layout.right);
      expect(layout.topDelta).toBeLessThan(1);
      expect(layout.height).toBeLessThan(950);
      return;
    }
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
    if ('columns' in expected && Array.isArray(expected.columns)) {
      const columns: number[] = expected.columns;
      measured.columns.forEach((width, index) =>
        expect(width).toBeCloseTo(columns[index], 1),
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
    page.locator('#dynamic-scaling [data-home-pair] > *'),
  ).toHaveCount(2);
  await expect(
    page.locator('#autotune-evolution [data-home-pair] > *'),
  ).toHaveCount(2);
  await expect(page.locator('[data-home-intro]')).toHaveCount(7);
  const signals = page.locator(
    '[data-home-design] .animate-pulse,[data-home-design] .animate-ping',
  );
  expect(await signals.count()).toBe(14);
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
    const surfaces = await page
      .locator(
        '#comparison,#benchmarks,#fault-tolerance,#qos-scaling,#autotune-evolution',
      )
      .evaluateAll((sections) =>
        sections.map((section) => getComputedStyle(section).backgroundColor),
      );
    expect(surfaces[0]).toBe(surfaces[2]);
    expect(surfaces[2]).toBe(surfaces[4]);
    expect(surfaces[1]).toBe(surfaces[3]);
    expect(surfaces[0]).not.toBe(surfaces[1]);
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
      const preview = page.locator('.home-console-scroller');
      const dimensions = await preview.evaluate((element) => ({
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(dimensions.scrollWidth > dimensions.width).toBe(width < 1024);
      if (width < 1024) {
        await preview.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        expect(
          await preview.evaluate((element) => element.scrollLeft),
        ).toBeGreaterThan(0);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(
    page.getByRole('link', {
      name: '推理性能优化社区',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator('#comparison')).toContainText('推理性能优化社区');
  const deployment = page.locator('#comparison').getByRole('link', {
    name: '性能调优模型 Day-0 部署',
    exact: true,
  });
  await deployment.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#benchmarks$/);
  await expect(page.locator('#benchmarks')).toBeFocused();
  await expect(page.locator('#benchmarks').getByRole('img')).toBeVisible();
  await expect(
    page.getByRole('link', { name: '立即部署', exact: true }),
  ).toHaveAttribute(
    'href',
    process.env.TEST_DOCS_MODE !== 'none' ? '/docs/quickstart' : '/docs',
  );
  const destination = await page
    .getByRole('link', { name: '立即部署', exact: true })
    .getAttribute('href');
  expect((await page.request.get(destination!)).status()).toBe(200);
  await expect(
    page.getByRole('link', { name: '加入开发者交流群', exact: true }),
  ).toHaveAttribute('href', '/community#community-wechat-group');
  await page
    .getByRole('link', { name: '加入开发者交流群', exact: true })
    .click();
  await expect(page).toHaveURL(/\/community#community-wechat-group$/);
  await expect(
    page.locator('#community-wechat-group').getByRole('heading', {
      name: '微信技术交流群',
      exact: true,
    }),
  ).toBeInViewport();
});

for (const [id, source] of Object.entries(qosSource)) {
  test(`${id} follows the selected source copy, icons and chart geometry`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator(`#${id}`);
    const measured = await section.evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const text: string[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (
          !node.parentElement!.closest(
            '.material-symbols-outlined,[aria-hidden="true"],script',
          )
        )
          text.push(node.textContent!);
      }
      return {
        text: text.join(' ').replace(/\s+/g, ' ').trim(),
        icons: Array.from(
          element.querySelectorAll('.material-symbols-outlined'),
        ).map((icon) => icon.textContent!.trim()),
        paths: Array.from(
          element.querySelectorAll('svg path,svg polygon,svg polyline'),
        ).map((path) =>
          (path.getAttribute('d') ?? path.getAttribute('points') ?? '')
            .replace(/\s+/g, ' ')
            .trim(),
        ),
      };
    });
    expect(measured.text.replace(/\s/g, '')).toBe(
      source.text.replace(/\s/g, ''),
    );
    expect(measured.icons).toEqual(source.icons);
    for (const path of source.svgPaths)
      expect(measured.paths).toContain(path.replace(/\s+/g, ' ').trim());
    if (id === 'dynamic-scaling') {
      for (const count of [8, 6, 2]) {
        const scenario = section.locator(`[data-gpu-scenario="${count}"]`);
        await expect(scenario.locator('[data-model="glm"]')).toHaveCount(count);
        await expect(scenario.locator('[data-model="minimax"]')).toHaveCount(
          10 - count,
        );
      }
      await expect(
        section.locator('.material-symbols-outlined').first(),
      ).toHaveCSS('font-family', '"ModelSphere Scaling Symbols"');
    }
    await section.screenshot({
      path: `reports/${id}-desktop.png`,
      style: '.site-header { visibility: hidden; }',
    });
  });
}

test('QoS sections fit both themes and supported widths, including English and no-script rendering', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const id of ['qos-scaling', 'dynamic-scaling']) {
        const section = page.locator(`#${id}`);
        const box = await section.evaluate((element) => ({
          width: element.clientWidth,
          scroll: element.scrollWidth,
        }));
        expect(box.scroll).toBeLessThanOrEqual(box.width + 1);
        if (width === 390 || width === 1280)
          await section.screenshot({
            path: `reports/${id}-${theme}-${width}.png`,
            style: '.site-header { visibility: hidden; }',
          });
      }
    }
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    locale: 'en-US',
  });
  const plain = await context.newPage();
  await plain.goto(new URL('/en/', page.url()).href);
  for (const id of ['qos-scaling', 'dynamic-scaling']) {
    const section = plain.locator(`#${id}`);
    await expect(section).toBeVisible();
    expect(await section.innerText()).not.toMatch(/[\u3400-\u9fff]/);
  }
  await context.close();
});

test('QoS matches the design spacing, arrow shape, title alignment and chart positions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const section = page.locator('#qos-scaling');
  const layout = qosSource['qos-scaling'].layout;
  for (const removed of ['计算复杂度 ×50', '+34.8% 吞吐提升', 'P99 抖动 < 8%'])
    await expect(section).not.toContainText(removed);
  await expect(section).toContainText('时变动态拓扑');
  await expect(section).not.toContainText('零人工打标');
  const challenge = section.locator(
    '[data-qos-card="challenge"] [data-qos-card-header]',
  );
  await expect(challenge.locator('span')).toHaveCSS(
    'color',
    await challenge
      .locator('svg')
      .evaluate((icon) => getComputedStyle(icon).color),
  );
  const iconsWithinViewBox = await section
    .locator('svg[aria-hidden="true"]')
    .evaluateAll((icons) =>
      icons.every((icon) => {
        const svg = icon as SVGSVGElement;
        const view = svg.viewBox.baseVal;
        const bounds = svg.querySelector('path')!.getBBox();
        return (
          bounds.x >= view.x &&
          bounds.y >= view.y &&
          bounds.x + bounds.width <= view.x + view.width &&
          bounds.y + bounds.height <= view.y + view.height
        );
      }),
    );
  expect(iconsWithinViewBox).toBe(true);
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const measured = await section.evaluate((element) => {
      const rect = (e: Element) => {
        const r = e.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
          cx: r.x + r.width / 2,
          cy: r.y + r.height / 2,
        };
      };
      const cards = Array.from(element.querySelectorAll('[data-qos-card]')).map(
        (card) => ({
          ...rect(card),
          padding: getComputedStyle(card).padding,
          heading: rect(card.querySelector('h3')!),
          footer: rect(card.lastElementChild!),
          chart: rect(
            card.querySelector(
              '[class*="staticChart"],[class*="problems"],[class*="dynamicChart"]',
            )!,
          ),
        }),
      );
      const arrows = Array.from(
        element.querySelectorAll('[data-qos-arrow]'),
      ).map((arrow) => ({
        ...rect(arrow),
        display: getComputedStyle(arrow).display,
        radius: getComputedStyle(arrow).borderRadius,
        color: getComputedStyle(arrow).color,
        path: arrow.querySelector('path')!.getAttribute('d'),
      }));
      const benefits = element.querySelector('[class*="benefits"]')!;
      const benefitItems = Array.from(benefits.children).map((item) => ({
        border: getComputedStyle(item).borderLeftWidth,
        borderTop: getComputedStyle(item).borderTopWidth,
        heading: rect(item.querySelector('h3')!),
        tag: item.querySelector('[class*="detailPill"]')
          ? rect(item.querySelector('[class*="detailPill"]')!)
          : null,
      }));
      const line = rect(element.querySelector('[data-qos-static-limit] i')!);
      const svg = rect(element.querySelector('svg[role="img"]')!);
      const points = ['open', 'tighten'].map((kind) => ({
        kind,
        ...rect(element.querySelector(`[data-qos-point="${kind}"] i`)!),
        annotation: rect(
          element.querySelector(`[data-qos-annotation="${kind}"]`)!,
        ),
      }));
      const bars = Array.from(
        element.querySelectorAll('[data-qos-static-bar]'),
      ).map((bar) => rect(bar).y);
      return {
        cards,
        arrows,
        benefitItems,
        benefitGap: rect(benefits).y - cards[2].bottom,
        lineY: line.cy,
        bars,
        svg,
        points,
        accent: getComputedStyle(
          element.querySelector('#dynamic-rate-title > span')!,
        ).color,
      };
    });
    for (const top of measured.bars)
      expect(Math.abs(top - measured.lineY)).toBeLessThanOrEqual(1);
    for (const point of measured.points) {
      const [x, y] = point.kind === 'open' ? [110, 35] : [210, 85];
      expect(point.cx).toBeCloseTo(
        measured.svg.x + (measured.svg.width * x) / 320,
        0,
      );
      expect(point.cy).toBeCloseTo(
        measured.svg.y + (measured.svg.height * y) / 120,
        0,
      );
      expect(point.width).toBe(12);
      expect(point.height).toBe(12);
      expect(point.annotation.x).toBeCloseTo(
        measured.svg.x +
          measured.svg.width * (point.kind === 'open' ? 0.2 : 0.54),
        0,
      );
      if (point.kind === 'open')
        expect(point.annotation.y).toBeCloseTo(measured.svg.y - 4, 0);
      else
        expect(point.annotation.bottom).toBeCloseTo(measured.svg.bottom - 4, 0);
    }
    expect(measured.svg.height).toBe(layout.plotHeight);
    for (const card of measured.cards)
      expect(card.padding).toBe(`${layout.cardPadding}px`);
    expect(measured.benefitGap).toBe(layout.benefitsTopGap);
    for (const item of measured.benefitItems) {
      expect(item.border).toBe('0px');
      expect(item.borderTop).toBe('0px');
      if ((width >= 1024 || (width >= 390 && width < 768)) && item.tag)
        expect(Math.abs(item.heading.cy - item.tag.cy)).toBeLessThanOrEqual(1);
    }
    if (width >= 1024) {
      expect(measured.cards[0].x).toBe(layout.desktopGutter);
      for (let i = 1; i < 3; i++) {
        expect(measured.cards[i].x - measured.cards[i - 1].right).toBeCloseTo(
          layout.desktopCardGap,
          0,
        );
        expect(measured.cards[i].width).toBeCloseTo(measured.cards[0].width, 0);
        expect(measured.cards[i].heading.y).toBeCloseTo(
          measured.cards[0].heading.y,
          0,
        );
        if (width >= 1280)
          expect(measured.cards[i].chart.y).toBeCloseTo(
            measured.cards[0].chart.y,
            0,
          );
        expect(measured.cards[i].footer.bottom).toBeCloseTo(
          measured.cards[0].footer.bottom,
          0,
        );
      }
      for (let i = 0; i < 2; i++) {
        const arrow = measured.arrows[i];
        expect(arrow.width).toBe(layout.arrowSize);
        expect(arrow.height).toBe(layout.arrowSize);
        expect(arrow.radius).toBe(`${layout.arrowRadius}px`);
        expect(arrow.x - measured.cards[i].right).toBeCloseTo(
          layout.arrowGutter,
          0,
        );
        expect(measured.cards[i + 1].x - arrow.right).toBeCloseTo(
          layout.arrowGutter,
          0,
        );
        expect(arrow.cy).toBeCloseTo(measured.cards[i].cy, 0);
        expect(arrow.path).toBe(
          'M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z',
        );
      }
      expect(measured.arrows[1].color).toBe(measured.accent);
    } else
      for (const arrow of measured.arrows) expect(arrow.display).toBe('none');
  }
});
