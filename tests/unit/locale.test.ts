import { describe, expect, it } from 'vitest';
import { languageHref } from '../../src/lib/locale';

describe('language navigation', () => {
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
