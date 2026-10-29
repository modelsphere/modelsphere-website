import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import baseline from '../../content/catalog/baseline.json';

let prefix = '/';
test.beforeEach(({ baseURL }) => {
  prefix = new URL(baseURL ?? 'http://localhost:4173').pathname;
});
const site = (route = '') => prefix + route;

async function chooseLanguage(page: Page, language: 'English' | '简体中文') {
  await page
    .getByRole('combobox', { name: /^(Change language|切换语言)$/ })
    .click();
  await page.getByRole('option', { name: language, exact: true }).click();
}

test('switches languages on the same catalog URL and preserves filters', async ({
  page,
}) => {
  await page.goto(site('models?view=recipes&engine=vllm#catalog'));
  await chooseLanguage(page, 'English');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(
    new RegExp(`${site('en/models')}\\?view=recipes&engine=vllm#catalog$`),
  );
  await expect(
    page.getByRole('heading', { name: 'Model Catalog' }),
  ).toBeVisible();
  await chooseLanguage(page, '简体中文');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(
    new URL(page.url()).pathname +
      new URL(page.url()).search +
      new URL(page.url()).hash,
  ).toBe(site('models?view=recipes&engine=vllm#catalog'));
});

test('English docs, blog and search use translated content and localized links', async ({
  page,
}) => {
  await page.goto(site('en/docs'));
  await expect(
    page.getByRole('heading', {
      name: 'Understanding ModelSphere',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'quickstart example', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${site('en/docs/quickstart')}$`));
  await expect(
    page.getByRole('heading', { name: 'Quickstart (example)', exact: true }),
  ).toBeVisible();
  await page.goto(site('en/blog'));
  await expect(
    page.getByRole('heading', {
      name: 'From request to token — understanding inference infrastructure',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Search docs and blog', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('searchbox').fill('benchmark');
  await expect(dialog.getByRole('link').first()).toBeVisible();
  const results = await dialog
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(results.length).toBeGreaterThan(0);
  expect(results.every((href) => href?.startsWith(site('en/')))).toBe(true);
});

test('language switch is accessible on mobile and English pages render without scripts', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(site('en/community'));
  await expect(
    page.getByRole('combobox', { name: 'Change language', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Community maintainers' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto(new URL(site('en/docs'), page.url()).href);
  await expect(
    staticPage.getByRole('heading', {
      name: 'Understanding ModelSphere',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    staticPage.getByRole('link', { name: '切换到简体中文', exact: true }),
  ).toBeVisible();
  await context.close();
});

test('navigation controls do not overlap the brand in either language', async ({
  page,
}) => {
  for (const language of ['', 'en/']) {
    await page.goto(site(language));
    for (const width of [320, 390, 768, 1280, 1440, 1600, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.evaluate(() => {
        const bounds = (selector: string) =>
          document.querySelector(selector)!.getBoundingClientRect();
        const brand = bounds('.site-brand');
        const actions = bounds('.header-actions');
        const nav = bounds('.desktop-nav');
        const links = Array.from(
          document.querySelectorAll('.desktop-nav .site-nav-link'),
        ).map((link) => link.getBoundingClientRect());
        return {
          brandRight: brand.right,
          actionsLeft: actions.left,
          actionsRight: actions.right,
          navVisible: nav.width > 0,
          navLeft: links[0]?.left,
          navRight: links.at(-1)?.right,
          width: innerWidth,
        };
      });
      expect(
        geometry.brandRight,
        `${language} ${width}px brand`,
      ).toBeLessThanOrEqual(geometry.actionsLeft);
      expect(
        geometry.actionsRight,
        `${language} ${width}px controls`,
      ).toBeLessThanOrEqual(geometry.width);
      if (geometry.navVisible) {
        expect(geometry.navLeft).toBeGreaterThanOrEqual(geometry.brandRight);
        expect(geometry.navRight).toBeLessThanOrEqual(geometry.actionsLeft);
      }
    }
  }
});

test('switching an article language retains the current section', async ({
  page,
}) => {
  await page.goto(site('docs#核心概念'));
  await chooseLanguage(page, 'English');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h2#核心概念')).toBeInViewport();
  await expect(page.locator('h2#核心概念')).toContainText('Core concepts');
  await chooseLanguage(page, '简体中文');
  await expect(page.locator('h2#核心概念')).toBeInViewport();
});

test('English recipe details translate deployment and history tabs', async ({
  page,
}) => {
  const model = baseline.models.find((item) => item.name === 'mimo-v2.5')!;
  const variant = model.variants.find(
    (item) => item.id === 'sglang-tp8-h100-optimized',
  )!;
  await page.route(
    'https://modelsphere.github.io/model-catalog/**',
    (route) => {
      if (route.request().url().endsWith('index-v2.json'))
        return route.fulfill({ json: baseline });
      return route.fulfill({
        json: {
          model: model.name,
          id: variant.id,
          path: variant.path,
          revisions: [
            {
              version: variant.version,
              commit: variant.commit,
              digest: variant.digest,
              releaseDate: variant.releaseDate,
              subject: 'Published source revision',
            },
          ],
        },
      });
    },
  );
  await page.route(
    'https://raw.githubusercontent.com/modelsphere/model-catalog/**',
    (route) =>
      route.fulfill({
        body: readFileSync('tests/fixtures/catalog/mimo.yaml', 'utf8'),
        contentType: 'text/plain',
      }),
  );
  await page.goto(
    site(`en/models/recipe?modelId=${model.name}&recipeId=${variant.id}`),
  );
  const comparison = page.getByRole('heading', {
    name: `Gain over ${model.tuning[0].baseline}`,
    exact: true,
  });
  await expect(comparison).toBeVisible();
  await expect(
    comparison.getByRole('link', {
      name: model.tuning[0].baseline,
      exact: true,
    }),
  ).toHaveAttribute(
    'href',
    new RegExp(
      `${site('en/models/recipe')}\\?.*recipeId=sglang-tp8-h100-baseline`,
    ),
  );
  await expect(
    page.getByRole('tab', { name: 'Deployment configuration', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('combobox', { name: 'Recipe version', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Version history', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Version history', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveText(
    /Deployment configurationPerformance comparisonVersion history/,
  );
});

test('custom language menu supports selection, dismissal, keyboard and both themes', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(site('en/'));
      const trigger = page.getByRole('combobox', {
        name: 'Change language',
        exact: true,
      });
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      const menu = page.getByRole('listbox');
      await expect(menu).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'English', exact: true }),
      ).toHaveAttribute('data-state', 'checked');
      await expect(
        page.getByRole('option', { name: '简体中文', exact: true }),
      ).toHaveAttribute('data-state', 'unchecked');
      const bounds = await menu.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.mouse.click(8, 100);
      await expect(menu).toHaveCount(0);
    }
  }
  await page
    .getByRole('combobox', { name: 'Change language', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});
