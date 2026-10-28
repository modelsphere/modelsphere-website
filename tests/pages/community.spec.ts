import { expect, test } from '@playwright/test';

test('community preserves source layout and local navigation under the Pages prefix', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('community');
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.locator('#community-channels [data-home-pair] > [data-home-pending]'),
  ).toHaveCount(2);
  await expect(
    page.getByRole('img', { name: '微信技术交流群入群二维码' }),
  ).toHaveAttribute(
    'src',
    '/modelsphere-website/community/wechat-group-qr.png',
  );
  await expect(
    page.getByRole('link', { name: '扫码加入技术交流微信群', exact: true }),
  ).toHaveAttribute(
    'href',
    '/modelsphere-website/community/wechat-group-qr.png',
  );
  await expect(page.locator('#community-channels')).not.toContainText('公众号');
  await expect(page.locator('body')).not.toContainText(
    /14\.8k|2\.1k|GitHub Stars|Forks|NODE_CLUSTER: READY|TELEMETRY: P99 22ms/,
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '让 AI 基础设施优化成为全社会的“公共资产”',
  );
  await expect(
    page.locator('.desktop-quickstart .header-primary-link'),
  ).toHaveAttribute(
    'href',
    process.env.TEST_DOCS_MODE !== 'none'
      ? '/modelsphere-website/docs/quickstart'
      : '/modelsphere-website/docs',
  );
  const localLinks = await page
    .locator('[data-community-design] a[href^="/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  expect(localLinks.length).toBeGreaterThan(10);
  for (const href of localLinks)
    expect(href).toMatch(/^\/modelsphere-website\//);
  expect(
    await page.evaluate(() =>
      document.fonts.check('700 44px "ModelSphere Community Space Grotesk"'),
    ),
  ).toBe(true);
  await page.getByRole('link', { name: '社区维护者治理', exact: true }).click();
  await expect(page).toHaveURL(
    /\/modelsphere-website\/community#community-maintainers$/,
  );
  await expect(
    page.getByRole('heading', { name: '社区维护者', exact: true }),
  ).toBeInViewport();
  await page.reload();
  await expect(page.locator('main section')).toHaveCount(5);
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: '首页', exact: true })
    .click();
  await expect(page).toHaveURL(/\/modelsphere-website\/$/);
  await expect(page.locator('#hero')).toBeVisible();
});
