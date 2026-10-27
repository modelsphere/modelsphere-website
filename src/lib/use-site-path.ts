import { useMemo } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { withBaseUrl, withoutBaseUrl } from './site-path';

export function useSitePath() {
  const { siteConfig } = useDocusaurusContext();
  return useMemo(
    () => ({
      siteHref: (href: string) => withBaseUrl(href, siteConfig.baseUrl),
      localHref: (href: string) => withoutBaseUrl(href, siteConfig.baseUrl),
    }),
    [siteConfig.baseUrl],
  );
}
