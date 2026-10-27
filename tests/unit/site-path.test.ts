import { expect, it } from 'vitest';
import {
  withBaseUrl,
  withoutBaseUrl,
  validateBaseUrl,
} from '../../src/lib/site-path';
import { resolveBuildMode } from '../../src/lib/build-mode';

const base = '/modelsphere-website/';
it('keeps paths, queries, fragments and external links intact across hosting modes', () => {
  for (const href of ['/', '/models?q=MiMo#filters', '/blog/example']) {
    expect(withBaseUrl(href)).toBe(href);
    expect(withoutBaseUrl(withBaseUrl(href, base), base)).toBe(href);
    expect(withBaseUrl(withBaseUrl(href, base), base)).toBe(
      withBaseUrl(href, base),
    );
  }
  for (const href of [
    '#section',
    'https://example.test/models',
    '//example.test/path',
  ])
    expect(withBaseUrl(href, base)).toBe(href);
  expect(withoutBaseUrl('/modelsphere-website-other/models', base)).toBe(
    '/modelsphere-website-other/models',
  );
});
it.each([
  '',
  'modelsphere/',
  '/modelsphere',
  '//evil/',
  '/a/../',
  '/a?b/',
  '/a#b/',
])('rejects unsafe deployment base %s', (value) => {
  expect(() => validateBaseUrl(value)).toThrow('SITE_BASE_URL');
  expect(() =>
    resolveBuildMode({
      SITE_ORIGIN: 'https://modelsphere.github.io',
      SITE_BASE_URL: value,
    }),
  ).toThrow('SITE_BASE_URL');
});
it('records an explicit hosting prefix without treating it as an origin', () => {
  expect(
    resolveBuildMode({
      SITE_ORIGIN: 'https://modelsphere.github.io',
      SITE_BASE_URL: base,
    }),
  ).toMatchObject({ origin: 'https://modelsphere.github.io', baseUrl: base });
});
