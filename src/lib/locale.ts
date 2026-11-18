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
  if (/(?:^\\?|&)ms_lang=zh-CN(?:&|$)/.test(location.search)) return;
  var locale = null;
  try {
    var cookie = /(?:^|;\\s*)ms_locale=(en|zh-CN)(?:;|$)/.exec(document.cookie);
    if (cookie) locale = cookie[1];
  } catch (error) {}
  var remembered = locale !== null;
  ['sessionStorage', 'localStorage'].some(function (storage) {
    if (locale) return true;
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

/** An explicit Chinese link still works when the browser rejects cookies. */
export function explicitChineseHref(href: string): string {
  const url = new URL(href, 'https://site.invalid');
  url.searchParams.set('ms_lang', 'zh-CN');
  return url.pathname + url.search + url.hash;
}

/** Returns whether Nginx can read the manual choice on the next request. */
export function rememberLocale(locale: string): boolean {
  if (!isSiteLocale(locale)) return false;
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[storage].setItem(localePreferenceKey, locale);
    } catch {
      // Keep manual navigation available when browser storage is blocked.
    }
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `ms_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    return document.cookie.split(/;\s*/).includes(`ms_locale=${locale}`);
  } catch {
    return false;
  }
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
