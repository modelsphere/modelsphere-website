import { expect, test } from '@playwright/test';
import source from '../../docs/design/sources/stitch-community.json';

const removedPlaceholderCopy = new Set([
  'GitHub Stars',
  '14.8k',
  'Forks',
  '2.1k',
  'NODE_CLUSTER: READY',
  'TELEMETRY: P99 22ms',
]);
const removedPartnerCopy = new Set([
  'Enterprise AI Infrastructure',
  'Cloud-Native AI Middleware',
  '作为社区联合发起方，负责提供工业级异构算力集群底座验证支持、海量信创芯片软硬件适配数据沉淀，以及企业级生产落地场景的持续拓展与规范制定。',
  '作为社区联合发起方，主导核心推理中间件研发、Tuning Agent 调优搜索算法、Kubernetes 云原生推理算子设计，以及面向极端并发的智能路由网关工程演进。',
]);

test('community preserves approved copy and the four-section order without the calendar', async ({
  page,
}) => {
  await page.goto('/community');
  await expect(page.locator('main section')).toHaveCount(4);
  expect(
    await page
      .locator('main section')
      .evaluateAll((sections) => sections.map((section) => section.id)),
  ).toEqual(source.sectionIds.filter((id) => id !== 'community-calendar'));
  for (const [index, id] of source.sectionIds.entries()) {
    if (id === 'community-calendar' || id === 'community-maintainers') continue;
    const text = (await page.locator(`#${id}`).textContent())!
      .replace(/\s+/g, ' ')
      .trim();
    for (const copy of source.sectionCopy[index].filter(
      (copy) =>
        !removedPlaceholderCopy.has(copy) &&
        (id !== 'community-partners' || !removedPartnerCopy.has(copy)),
    ))
      expect(text, `${id}: ${copy}`).toContain(copy);
  }
  const header = page.locator('.site-header');
  await expect(header).toBeVisible();
  await expect(header.locator('.desktop-nav .site-nav-link')).toHaveText([
    '首页',
    '模型与调优',
    '文档指南',
    '博客',
    '社区生态',
  ]);
  await expect(header.locator('.desktop-nav [aria-current="page"]')).toHaveText(
    '社区生态',
  );
  await expect(header.locator('.header-search')).toBeEnabled();
  await expect(header.locator('.theme-toggle')).toBeVisible();
  const footerText = (await page
    .locator('footer[data-community-design]')
    .textContent())!
    .replace(/\s+/g, ' ')
    .trim();
  for (const fragment of [
    ...source.footerCopy.slice(0, 3),
    source.footerCopy.find((copy) => copy.startsWith('©'))!,
  ])
    expect(footerText).toContain(fragment);
  const footer = page.locator('footer[data-community-design]');
  const footerLinks = footer
    .getByRole('navigation', { name: '页脚导航' })
    .getByRole('link');
  await expect(footer.locator('a')).toHaveCount(8);
  await expect(footer.getByRole('heading')).toHaveText([
    '浏览网站',
    '文档与上手',
    '社区参与',
  ]);
  await expect(footerLinks).toHaveText([
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
    await footerLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    ),
  ).toEqual([
    '/',
    '/models',
    '/blog',
    '/docs',
    process.env.TEST_DOCS_MODE === 'none' ? '/docs' : '/docs/quickstart',
    '/community',
    'https://github.com/modelsphere/modelsphere',
    '/community#community-channels',
  ]);
  for (const copy of removedPartnerCopy)
    await expect(page.locator('#community-partners')).not.toContainText(copy);
  for (const copy of removedPlaceholderCopy)
    await expect(page.locator('body')).not.toContainText(copy);
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
  const maintainers = page.locator('#community-maintainers');
  await expect(maintainers).not.toContainText('第四范式');
  await expect(maintainers.getByRole('heading', { level: 4 })).toHaveText([
    'LU MIAN',
    'ZHANG Hao',
    'aceforeverd',
    'remotego',
    'LiuFeng',
  ]);
  await expect(
    maintainers.getByRole('heading', { name: '社区维护者', exact: true }),
  ).toBeVisible();
  const cards = maintainers.locator('[data-home-pair] > *');
  await expect(cards).toHaveCount(5);
  for (const [index, organization] of [
    '范式智能（Phancy）',
    '范式智能（Phancy）',
    '范式智能（Phancy）',
    '范式智能（Phancy）',
    '睿思智联 (RiseUnion)',
  ].entries())
    await expect(cards.nth(index)).toContainText(organization);
  await expect(cards.nth(2).getByRole('heading')).toHaveText('aceforeverd');
  await expect(cards.nth(3).getByRole('heading')).toHaveText('remotego');
  await expect(cards.nth(4).getByRole('heading')).toHaveText('LiuFeng');
  await expect(page.locator('main a[href="#"]')).toHaveCount(0);
  for (const [name, file] of [
    ['范式智能 PHANCY Logo', 'phancy-logo.png'],
    ['睿思智联 RiseUnion Logo', 'riseunion-logo.svg'],
  ]) {
    const logo = page
      .locator('#community-partners')
      .getByRole('img', { name, exact: true });
    await expect(logo).toHaveAttribute('src', `/brand/${file}`);
    await logo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        logo.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  const channels = page.locator('#community-channels');
  await expect(channels.getByRole('heading', { level: 3 })).toHaveText([
    '官方微信公众号',
    '微信技术交流群',
    'GitHub 开源社区',
    '知乎专栏',
  ]);
  const zhihu = channels.getByRole('link', {
    name: '前往知乎专栏（新窗口打开）',
    exact: true,
  });
  await expect(zhihu).toHaveAttribute(
    'href',
    'https://www.zhihu.com/column/c_2101327451146150340',
  );
  await expect(zhihu).toHaveAttribute('target', '_blank');
  await expect(zhihu.getByRole('img')).toHaveAttribute(
    'src',
    '/community/zhihu.png',
  );
  await expect
    .poll(() =>
      zhihu
        .getByRole('img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(240);
  await expect(channels).toContainText(
    '探索社区硬核技术分享内容，了解社区技术发展近况。',
  );
  const officialQr = channels.getByRole('img', {
    name: '模域 ModelSphere 微信公众号二维码',
    exact: true,
  });
  await expect(officialQr).toHaveAttribute(
    'src',
    '/community/wechat-official-account-qr.png',
  );
  await expect
    .poll(() =>
      officialQr.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1280);
  await expect(
    channels.getByRole('link', {
      name: '模域 ModelSphere 微信公众号二维码',
      exact: true,
    }),
  ).toHaveAttribute('href', '/community/wechat-official-account-qr.png');
  await expect(channels).toContainText('Apache-2.0');
  await expect(
    channels.getByRole('link', { name: '前往 GitHub 仓库', exact: true }),
  ).toHaveAttribute('href', 'https://github.com/modelsphere/modelsphere');
  const qr = channels.getByRole('img', { name: '微信技术交流群入群二维码' });
  await expect(qr).toHaveAttribute('src', '/community/wechat-group-qr.png');
  expect(
    await qr.evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBe(500);
  await expect(
    channels.getByRole('link', { name: '扫码加入技术交流微信群', exact: true }),
  ).toHaveAttribute('href', '/community/wechat-group-qr.png');
  const join = page.getByRole('link', {
    name: '申请加入生态共建',
    exact: true,
  });
  await expect(join).toHaveAttribute('href', '/community/wechat-group-qr.png');
  await join.click();
  const dialog = page.getByRole('dialog', {
    name: '微信技术交流群',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveAttribute(
    'src',
    '/community/wechat-group-qr.png',
  );
  await expect(
    dialog.getByRole('button', { name: '关闭二维码' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(join).toBeFocused();
  await join.click();
  await dialog.getByRole('button', { name: '关闭二维码' }).click();
  await expect(dialog).toBeHidden();
  await join.click();
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-event-id]')).toHaveCount(0);
  await expect(page.locator('#community-calendar')).toHaveCount(0);
  await expect(page.locator('[data-community-empty]')).toHaveCount(0);
  await expect(page.locator('a[href*="#community-calendar"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(
    '线上技术分享与社区例会日历',
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
    headerBottom: document
      .querySelector('.site-header')!
      .getBoundingClientRect().bottom,
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
      expect(section.top - actual.headerBottom).toBeCloseTo(
        source.sourceMeasurements[index].top - source.sourceMeasurements[0].top,
        0,
      );
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
      await expect(page.locator('.site-header .header-search')).toBeVisible();
      await expect(page.locator('.site-header .theme-toggle')).toBeVisible();
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
      ).toBe(width >= 1280 ? 4 : width >= 768 ? 2 : 1);
      if (width === 320) {
        await page
          .getByRole('link', { name: '申请加入生态共建', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: '微信技术交流群',
          exact: true,
        });
        await expect(dialog).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        await page.screenshot({
          path: testInfo.outputPath(`community-qr-${width}-${theme}.png`),
        });
        await dialog.getByRole('button', { name: '关闭二维码' }).click();
      }
      if (width === 390 || width === 1280) {
        await page.screenshot({
          path: testInfo.outputPath(`community-${width}-${theme}.png`),
          fullPage: true,
        });
        await page.locator('footer.community-footer').screenshot({
          path: testInfo.outputPath(`footer-${width}-${theme}.png`),
        });
      }
    }
  }
});
