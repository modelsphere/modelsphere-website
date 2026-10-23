export type SearchKind = 'docs' | 'blog';
export type SearchScope = 'all' | SearchKind;
export interface SearchEntry {
  kind: SearchKind;
  title: string;
  heading: string;
  href: string;
  pageHref: string;
  text: string;
  tags: string;
}
export interface SearchIndex {
  version: 1;
  entries: SearchEntry[];
}
export interface SearchResult extends SearchEntry {
  snippet: string;
  score: number;
}
export function searchTerms(query: string): string[] {
  return Array.from(
    new Set(query.trim().slice(0, 100).toLowerCase().split(/\s+/)),
  )
    .filter(Boolean)
    .slice(0, 10);
}
export function snippet(text: string, terms: string[]): string {
  const positions = terms.map((term) => text.toLowerCase().indexOf(term));
  const first = Math.min(...positions.filter((position) => position >= 0));
  const start = Number.isFinite(first) ? Math.max(0, first - 36) : 0;
  const end = Math.min(text.length, start + 150);
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}
export function searchIndex(
  index: SearchIndex,
  query: string,
  scope: SearchScope,
): SearchResult[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const pages = new Map<string, SearchResult>();
  for (const entry of index.entries) {
    if (scope !== 'all' && entry.kind !== scope) continue;
    const fields = [entry.title, entry.heading, entry.tags, entry.text].map(
      (field) => field.toLowerCase(),
    );
    if (!terms.every((term) => fields.some((field) => field.includes(term))))
      continue;
    const score = terms.reduce(
      (total, term) =>
        total +
        (fields[0].includes(term) ? 100 : 0) +
        (fields[1].includes(term) ? 30 : 0) +
        (fields[2].includes(term) ? 10 : 0) +
        (fields[3].includes(term) ? 1 : 0),
      0,
    );
    if ((pages.get(entry.pageHref)?.score ?? -1) < score)
      pages.set(entry.pageHref, {
        ...entry,
        score,
        snippet: snippet(entry.text, terms),
      });
  }
  return Array.from(pages.values()).sort(
    (a, b) => b.score - a.score || a.href.localeCompare(b.href, 'zh-CN'),
  );
}
export function highlightParts(text: string, query: string) {
  const terms = searchTerms(query).sort((a, b) => b.length - a.length);
  if (!terms.length) return [{ text, match: false }];
  const pattern = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const expression = new RegExp(`(${pattern.join('|')})`, 'gi');
  return text.split(expression).map((part, index) => ({
    text: part,
    match: index % 2 === 1,
  }));
}
export function isSearchIndex(value: unknown): value is SearchIndex {
  if (!value || typeof value !== 'object') return false;
  const index = value as Partial<SearchIndex>;
  return (
    index.version === 1 &&
    Array.isArray(index.entries) &&
    index.entries.every(
      (entry) =>
        entry &&
        ['docs', 'blog'].includes(entry.kind) &&
        ['title', 'heading', 'href', 'pageHref', 'text', 'tags'].every(
          (key) => typeof entry[key as keyof SearchEntry] === 'string',
        ) &&
        /^\/(docs|blog)(\/[^?#\s]*)?$/.test(entry.pageHref) &&
        (entry.href === entry.pageHref ||
          entry.href.startsWith(`${entry.pageHref}#`)),
    )
  );
}
