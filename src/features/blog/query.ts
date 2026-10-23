import type { BlogIndex, BlogPost, BlogQuery } from './types';
export const PAGE_SIZE = 12;
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
export function normalizeSearch(value: string): string {
  return Array.from(segmenter.segment(value.trim()))
    .slice(0, 100)
    .map((part) => part.segment)
    .join('');
}
export function sortedPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
  );
}
export function hasFilters(query: BlogQuery): boolean {
  return Boolean(query.q || query.category || query.tag);
}
export function queryPosts(index: BlogIndex, query: BlogQuery) {
  const filtered = hasFilters(query);
  const q = query.q.toLowerCase();
  const posts = sortedPosts(index.posts).filter((post) => {
    if (!filtered && post.id === index.featuredId) return false;
    if (query.category && post.categoryId !== query.category) return false;
    if (query.tag && !post.tagIds.includes(query.tag)) return false;
    if (!q) return true;
    const fields = [
      post.title,
      post.summary,
      post.author ?? '',
      ...post.technicalKeywords,
      ...post.tagIds.map(
        (id) => index.tags.find((tag) => tag.id === id)?.label ?? '',
      ),
      ...post.pullRequestRefs.flatMap((ref) => [
        String(ref.number),
        `#${ref.number}`,
        `${ref.repository}#${ref.number}`,
      ]),
    ];
    return fields.some((field) => field.toLowerCase().includes(q));
  });
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    total: posts.length,
    pages,
    page,
    posts: posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    featured:
      !filtered && page === 1
        ? index.posts.find((post) => post.id === index.featuredId)
        : undefined,
  };
}
export function parseQuery(search: string, index: BlogIndex) {
  const params = new URLSearchParams(search);
  const notices: string[] = [];
  const rawSearch = params.get('q') ?? '';
  const q = normalizeSearch(rawSearch);
  if (Array.from(segmenter.segment(rawSearch.trim())).length > 100)
    notices.push('搜索词最多保留 100 个字符');
  let category = params.get('category') ?? '';
  let tag = params.get('tag') ?? '';
  if (
    category &&
    !index.categories.some(
      (item) =>
        item.id === category &&
        index.posts.some((post) => post.categoryId === category),
    )
  ) {
    notices.push('无效分类已清除');
    category = '';
  }
  if (
    tag &&
    !index.tags.some(
      (item) =>
        item.id === tag &&
        index.posts.some((post) => post.tagIds.includes(tag)),
    )
  ) {
    notices.push('无效标签已清除');
    tag = '';
  }
  const rawPage = params.get('page') ?? '1';
  const validPage =
    /^[1-9][0-9]*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage));
  let page = validPage ? Number(rawPage) : 1;
  if (!validPage) notices.push('无效页码已重置');
  const query = { q, category, tag, page };
  page = queryPosts(index, query).page;
  if (page !== query.page) notices.push('页码已调整到最后一页');
  return { query: { ...query, page }, notices };
}
export function queryHref(query: BlogQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.tag) params.set('tag', query.tag);
  if (query.page > 1) params.set('page', String(query.page));
  return `/blog${params.size ? `?${params}` : ''}`;
}
export function popularTags(index: BlogIndex) {
  return index.tags
    .map((tag) => ({
      ...tag,
      count: index.posts.filter((post) => post.tagIds.includes(tag.id)).length,
    }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, 10);
}
export function pageNumbers(page: number, pages: number): (number | 'gap')[] {
  const selected = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);
  return selected.flatMap((value, i) =>
    i && value > selected[i - 1] + 1 ? ['gap' as const, value] : [value],
  );
}
