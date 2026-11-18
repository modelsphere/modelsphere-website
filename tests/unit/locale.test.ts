import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  languageHref,
  localePreferenceKey,
  localeRedirectScript,
} from '../../src/lib/locale';

type StorageName = 'localStorage' | 'sessionStorage';

/** Runs the head script against a fake browser and reports what it did. */
function redirect({
  language = 'zh-CN',
  saved = null as string | null,
  path = '/',
  base = '/',
  blocked = [] as StorageName[],
} = {}) {
  const values = {
    localStorage: new Map<string, string>(),
    sessionStorage: new Map<string, string>(),
  };
  if (saved !== null) values.localStorage.set(localePreferenceKey, saved);
  const style = { visibility: '' };
  let target: string | undefined;
  const browser: Record<string, unknown> = {
    navigator: { language, languages: [language] },
    location: {
      pathname: path,
      search: '?modelId=a&tab=history',
      hash: '#details',
      replace: (href: string) => (target = href),
    },
    document: { documentElement: { style } },
    addEventListener: () => undefined,
    setTimeout: () => undefined,
  };
  browser.window = browser;
  for (const name of ['localStorage', 'sessionStorage'] as const)
    Object.defineProperty(browser, name, {
      get() {
        if (blocked.includes(name)) throw new Error('Storage blocked');
        return {
          getItem: (key: string) => values[name].get(key) ?? null,
          setItem: (key: string, value: string) => values[name].set(key, value),
        };
      },
    });
  runInNewContext(localeRedirectScript(base), browser);
  return {
    target,
    hidden: style.visibility === 'hidden',
    remembered:
      values.localStorage.get(localePreferenceKey) ??
      values.sessionStorage.get(localePreferenceKey),
  };
}

describe('language navigation', () => {
  it.each([
    ['zh-CN', null, 'zh-CN'],
    ['zh-TW', null, 'zh-CN'],
    ['zh-Hant', null, 'zh-CN'],
    ['ZH', null, 'zh-CN'],
    ['en-US', null, 'en'],
    ['fr-FR', null, 'en'],
    ['ja-JP', null, 'en'],
    ['en-US', 'zh-CN', 'zh-CN'],
    ['zh-CN', 'en', 'en'],
    ['zh-CN', 'invalid', 'zh-CN'],
    ['en-US', 'invalid', 'en'],
  ])('chooses %s with saved preference %s', (language, saved, locale) => {
    const result = redirect({ language, saved });
    expect(result.remembered).toBe(locale);
    expect(result.target).toBe(
      locale === 'en' ? '/en/?modelId=a&tab=history#details' : undefined,
    );
    // Hide the Chinese page only while it is being replaced.
    expect(result.hidden).toBe(locale === 'en');
  });

  it.each([
    ['/', '/', '/en/'],
    ['/models/recipe', '/', '/en/models/recipe'],
    [
      '/modelsphere-website',
      '/modelsphere-website/',
      '/modelsphere-website/en/',
    ],
    [
      '/modelsphere-website/models',
      '/modelsphere-website/',
      '/modelsphere-website/en/models',
    ],
  ])('redirects %s before paint within %s', (path, base, target) => {
    expect(redirect({ language: 'en-US', path, base }).target).toBe(
      target + '?modelId=a&tab=history#details',
    );
  });

  it('falls back to session storage when persistent storage is blocked', () => {
    const result = redirect({ language: 'en-US', blocked: ['localStorage'] });
    expect(result.remembered).toBe('en');
    expect(result.target).toBe('/en/?modelId=a&tab=history#details');
  });

  it('stays on the page when no storage can remember a manual choice', () => {
    const result = redirect({
      language: 'en-US',
      blocked: ['localStorage', 'sessionStorage'],
    });
    expect(result.target).toBeUndefined();
    expect(result.hidden).toBe(false);
  });

  it.each([
    ['/', '/', 'zh-CN', '/en/'],
    ['/en/', '/en/', 'en', '/'],
    ['/models/recipe', '/', 'zh-CN', '/en/models/recipe'],
    ['/en/docs/quickstart', '/en/', 'en', '/docs/quickstart'],
    [
      '/modelsphere-website/models',
      '/modelsphere-website/',
      'zh-CN',
      '/modelsphere-website/en/models',
    ],
    [
      '/modelsphere-website/en/models',
      '/modelsphere-website/en/',
      'en',
      '/modelsphere-website/models',
    ],
  ])(
    'switches %s within its deployment prefix',
    (pathname, base, locale, target) => {
      expect(
        languageHref(
          pathname,
          '?modelId=a&tab=history',
          '#details',
          base,
          locale,
        ),
      ).toBe(target + '?modelId=a&tab=history#details');
    },
  );
});
