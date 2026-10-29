import translations from '../../i18n/en/content.json';

/** Translate copy only; identifiers, URLs, versions and configuration stay intact. */
export function localizeContent<T>(value: T, locale: string): T {
  if (locale !== 'en') return value;
  const dictionary: Record<string, string> = translations;
  function visit(item: unknown): unknown {
    if (typeof item === 'string') return dictionary[item] ?? item;
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [key, visit(entry)]),
      );
    return item;
  }
  return visit(value) as T;
}
