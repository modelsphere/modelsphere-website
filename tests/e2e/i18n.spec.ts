import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { parseDocument } from 'yaml';
import baseline from '../../content/catalog/baseline.json';
import {
  readBlogExpectations,
  expectedBlogList,
} from '../helpers/blog-expectations';

const blog = readBlogExpectations();
function englishBlogTitle(post: { id: string; title: string }) {
  const file = `i18n/en/blog/${post.id}.md`;
  if (!existsSync(file)) return post.title;
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(
    readFileSync(file, 'utf8'),
  );
  if (!frontmatter) throw new Error(`Missing translation frontmatter: ${file}`);
  return (parseDocument(frontmatter[1]).toJS() as { title: string }).title;
}

const docsContent = process.env.TEST_DOCS_MODE === 'content';
const enHomeTitle = docsContent ? 'User Guide' : 'Understanding ModelSphere';
const enQuickstartTitle = docsContent
  ? 'Getting started'
  : 'Quickstart (example)';
const quickstartLinkName = docsContent
  ? 'Getting started'
  : 'quickstart example';
const articleAnchor = docsContent ? '阅读顺序' : '核心概念';
const articleAnchorText = docsContent ? 'Reading order' : 'Core concepts';

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

test.describe('browser language defaults', () => {
  test.use({ locale: 'en-US' });

  test('detects English, preserves the URL and remembers manual Chinese', async ({
    page,
  }) => {
    await page.goto(site('models?view=recipes&engine=vllm#catalog'));
    await page.waitForURL(
      new RegExp(`${site('en/models')}\\?view=recipes&engine=vllm#catalog$`),
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await chooseLanguage(page, '简体中文');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await page.reload();
    await expect(
      page.getByRole('combobox', { name: '切换语言', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await page.goto(site('docs'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    // Following an explicit English link does not overwrite the manual choice.
    await page.goto(site('en/docs'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto(site('docs'));
    await expect(
      page.getByRole('combobox', { name: '切换语言', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  });

  test('Nginx selects the first document before JavaScript runs', async ({
    request,
  }) => {
    test.skip(
      !process.env.TEST_BUILD_TARGET,
      'The CI image serves these routes with Nginx.',
    );
    const path = site('model?id=glm5.3');
    const headers = { 'Accept-Language': 'en-US,en;q=0.9' };
    const english = await request.get(path, { headers, maxRedirects: 0 });
    expect(english.status()).toBe(302);
    expect(english.headers().location).toBe(
      site('en/model?ms_auto=en&id=glm5.3'),
    );
    expect(english.headers()['cache-control']).toContain('no-store');
    const chinese = await request.get(path, {
      headers: { ...headers, Cookie: 'ms_locale=zh-CN' },
      maxRedirects: 0,
    });
    expect(chinese.status()).toBe(200);
    expect(await chinese.text()).toContain('lang="zh-CN"');
    for (const [route, status] of [
      ['en/model', 200],
      ['version.json', 200],
      ['missing-route', 404],
    ] as const) {
      expect(
        (await request.get(site(route), { headers, maxRedirects: 0 })).status(),
      ).toBe(status);
    }
  });

  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    test(`recovers a pre-cookie Chinese preference in ${storage} on a fresh entry`, async ({
      page,
      context,
    }) => {
      // Seed only the old storage value, without visiting a Chinese document.
      await page.goto(site('en/'));
      await page.evaluate(
        (name) => window[name].setItem('modelsphere.locale', 'zh-CN'),
        storage,
      );
      await page.goto(site('docs?source=old#details'));
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === site('docs') &&
          url.search === '?source=old' &&
          url.hash === '#details',
      );
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
      if (process.env.TEST_BUILD_TARGET) {
        expect(
          (await context.cookies()).find(
            (cookie) => cookie.name === 'ms_locale',
          )?.value,
        ).toBe('zh-CN');
      }
      await page.goto(site('en/docs'));
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  }

  test('remembers manual Chinese on a later bare entry when cookies are blocked', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => undefined,
      });
    });
    await page.goto(site('en/'));
    await chooseLanguage(page, '简体中文');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await page.goto(site('docs'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page).toHaveURL((url) => url.pathname === site('docs'));
    await page.goto(site('en/docs'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('never shows the Chinese page before redirecting', async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.documentElement.lang !== 'zh-CN') return;
        sessionStorage.setItem(
          'chinese-page-visibility',
          getComputedStyle(document.documentElement).visibility,
        );
      });
    });
    await page.goto(site('docs'));
    await page.waitForURL(new RegExp(`${site('en/docs')}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // Either the Chinese document never finished parsing, or it stayed hidden.
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem('chinese-page-visibility'),
      ),
    ).not.toBe('visible');
  });

  test('uses session storage when persistent storage is blocked', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Storage blocked', 'SecurityError');
        },
      });
    });
    await page.goto(site());
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await chooseLanguage(page, '简体中文');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await page.reload();
    await expect(
      page.getByRole('combobox', { name: '切换语言', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  });

  test('keeps manual language switching usable when all storage is blocked', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => undefined,
      });
      for (const storage of ['localStorage', 'sessionStorage'])
        Object.defineProperty(window, storage, {
          get() {
            throw new DOMException('Storage blocked', 'SecurityError');
          },
        });
    });
    await page.goto(site('en/'));
    await chooseLanguage(page, '简体中文');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await chooseLanguage(page, 'English');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('remembers manual English on a Chinese browser', async ({ page }) => {
  await page.goto(site());
  await chooseLanguage(page, 'English');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto(site('models?engine=vllm#catalog'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(
    new RegExp(`${site('en/models')}\\?engine=vllm#catalog$`),
  );
  const anotherPage = await page.context().newPage();
  await anotherPage.goto(new URL(site('docs'), page.url()).href);
  await expect(anotherPage.locator('html')).toHaveAttribute('lang', 'en');
  await anotherPage.close();
});

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
    page.getByRole('heading', { name: 'Models & Tuning' }),
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
      name: enHomeTitle,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: quickstartLinkName, exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${site('en/docs/quickstart')}$`));
  await expect(
    page.getByRole('heading', { name: enQuickstartTitle, exact: true }),
  ).toBeVisible();
  await page.goto(site('en/blog'));
  const featured = blog.posts.find((post) => post.id === blog.featuredId);
  if (featured)
    await expect(page.locator('#featured').getByRole('heading')).toHaveText(
      englishBlogTitle(featured),
    );
  const visible = expectedBlogList(blog).posts;
  await expect(page.locator('#posts [data-post-id]')).toHaveCount(
    visible.length,
  );
  for (const post of visible) {
    await expect(
      page.locator(`#posts [data-post-id="${post.id}"]`).getByRole('heading'),
    ).toHaveText(englishBlogTitle(post));
  }
  if (blog.source === 'mock') {
    await expect(
      page.getByRole('heading', {
        name: 'From request to token — understanding inference infrastructure',
        level: 2,
        exact: true,
      }),
    ).toBeVisible();
  } else if (!blog.posts.length) {
    await expect(
      page.getByRole('heading', {
        name: 'No published articles yet',
        exact: true,
      }),
    ).toBeVisible();
  }
  await page
    .getByRole('button', { name: 'Search docs and blog', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('searchbox')
    .fill(blog.source === 'mock' ? 'benchmark' : enQuickstartTitle);
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
    page.getByRole('heading', { name: 'Zhihu column', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Visit the Zhihu column (opens in a new window)',
      exact: true,
    }),
  ).toHaveAttribute(
    'href',
    'https://www.zhihu.com/column/c_2101327451146150340',
  );
  await expect(
    page.getByRole('heading', { name: 'Official WeChat account', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'ModelSphere official WeChat account QR code',
      exact: true,
    }),
  ).toHaveAttribute('src', site('en/community/wechat-official-account-qr.png'));
  await expect(
    page.getByRole('combobox', { name: 'Change language', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Community maintainers' }),
  ).toBeVisible();
  const footerNavigation = page.getByRole('navigation', {
    name: 'Footer navigation',
  });
  await expect(footerNavigation.getByRole('heading')).toHaveText([
    'Explore',
    'Get started',
    'Community',
  ]);
  await expect(footerNavigation.getByRole('link')).toHaveText([
    'Home',
    'Models & Tuning',
    'Blog',
    'Documentation',
    'Quickstart',
    'Community',
    'GitHub',
    'Technical group',
  ]);
  await expect(
    footerNavigation.getByRole('link', {
      name: 'Models & Tuning',
      exact: true,
    }),
  ).toHaveAttribute('href', site('en/models'));
  await expect(
    footerNavigation.getByRole('link', { name: 'Quickstart', exact: true }),
  ).toHaveAttribute('href', site('en/docs/quickstart'));
  await expect(
    footerNavigation.getByRole('link', {
      name: 'Technical group',
      exact: true,
    }),
  ).toHaveAttribute('href', site('en/community#community-channels'));
  await page
    .getByRole('link', { name: 'Become a partner', exact: true })
    .click();
  const joinDialog = page.getByRole('dialog', {
    name: 'WeChat technical group',
    exact: true,
  });
  await expect(joinDialog).toBeVisible();
  await expect(joinDialog.getByRole('img')).toHaveAttribute(
    'src',
    site('en/community/wechat-group-qr.png'),
  );
  await joinDialog
    .getByRole('button', { name: 'Close QR code', exact: true })
    .click();
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
      name: enHomeTitle,
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
  await page.goto(site(`docs#${articleAnchor}`));
  await chooseLanguage(page, 'English');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator(`h2#${articleAnchor}`)).toBeInViewport();
  await expect(page.locator(`h2#${articleAnchor}`)).toContainText(
    articleAnchorText,
  );
  await chooseLanguage(page, '简体中文');
  await expect(page.locator(`h2#${articleAnchor}`)).toBeInViewport();
});

test('English recipe details translate the two remaining tabs', async ({
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
    new RegExp(`${site('en/recipe')}\\?.*id=sglang-tp8-h100-baseline`),
  );
  await expect(
    page.getByRole('tab', { name: 'Deployment configuration', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('combobox', { name: 'Recipe version', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Version history', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tablist')).toHaveText(
    /Deployment configurationPerformance comparison/,
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
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'English', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Home');
  await expect(
    page.getByRole('option', { name: '简体中文', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});
