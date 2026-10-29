import { withoutBaseUrl, withBaseUrl } from './site-path';

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
