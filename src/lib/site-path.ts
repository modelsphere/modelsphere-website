export function validateBaseUrl(value: string): string {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value))
    throw new Error('SITE_BASE_URL 必须是以 / 开始和结束的站内目录。');
  return value;
}

export function withBaseUrl(href: string, baseUrl = '/'): string {
  if (baseUrl === '/' || !href.startsWith('/') || href.startsWith('//'))
    return href;
  const base = baseUrl.slice(0, -1);
  if (
    href === base ||
    href.startsWith(baseUrl) ||
    href.startsWith(`${base}?`) ||
    href.startsWith(`${base}#`)
  )
    return href;
  return base + href;
}

export function withoutBaseUrl(href: string, baseUrl = '/'): string {
  if (baseUrl === '/') return href;
  const base = baseUrl.slice(0, -1);
  if (href === base) return '/';
  return href.startsWith(baseUrl) ? href.slice(base.length) : href;
}
