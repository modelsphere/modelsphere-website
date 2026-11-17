import { withoutBaseUrl, withBaseUrl } from './site-path';

export type SiteLocale = 'zh-CN' | 'en';
export const localePreferenceKey = 'modelsphere.locale';

function isSiteLocale(locale: string | null): locale is SiteLocale {
  return locale === 'zh-CN' || locale === 'en';
}

/**
 * Inline script for the head of Chinese pages. It runs before the body is
 * painted, so English readers go straight to /en/ without first seeing the
 * Chinese page. A saved choice wins over the browser language; without any
 * storage it stays put so automatic redirects cannot undo a manual choice.
 */
export function localeRedirectScript(baseUrl: string): string {
  return `(function () {
  var key = ${JSON.stringify(localePreferenceKey)};
  var base = ${JSON.stringify(baseUrl)};
  var root = document.documentElement;
  var locale = null;
  ['sessionStorage', 'localStorage'].some(function (storage) {
    try {
      var saved = window[storage].getItem(key);
      if (saved === 'zh-CN' || saved === 'en') locale = saved;
    } catch (error) {}
    return locale !== null;
  });
  if (!locale) {
    var language =
      navigator.language || (navigator.languages || [])[0] || 'zh-CN';
    locale = /^zh(?:-|$)/i.test(language) ? 'zh-CN' : 'en';
  }
  var remembered = false;
  ['localStorage', 'sessionStorage'].forEach(function (storage) {
    try {
      window[storage].setItem(key, locale);
      remembered = true;
    } catch (error) {}
  });
  if (!remembered || locale !== 'en') return;
  var path = location.pathname;
  var local =
    path === base.slice(0, -1)
      ? '/'
      : path.indexOf(base) === 0
        ? path.slice(base.length - 1)
        : path;
  function show() {
    root.style.visibility = '';
  }
  root.style.visibility = 'hidden';
  addEventListener('pageshow', function (event) {
    if (event.persisted) show();
  });
  setTimeout(show, 3000);
  location.replace(base + 'en' + local + location.search + location.hash);
})();`;
}

export function rememberLocale(locale: string): boolean {
  if (!isSiteLocale(locale)) return false;
  let saved = false;
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[storage].setItem(localePreferenceKey, locale);
      saved = true;
    } catch {
      // Keep manual navigation available when browser storage is blocked.
    }
  }
  return saved;
}

/** Switch languages within the deployment prefix, retaining query and fragment. */
export function languageHref(
  pathname: string,
  search: string,
  hash: string,
  currentBaseUrl: string,
  currentLocale: string,
): string {
  const root =
    currentLocale === 'en'
      ? currentBaseUrl.replace(/en\/$/, '')
      : currentBaseUrl;
  const localPath = withoutBaseUrl(pathname, currentBaseUrl);
  const targetBase = currentLocale === 'en' ? root : `${root}en/`;
  return withBaseUrl(localPath, targetBase) + search + hash;
}
