import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  queryPosts,
  parseQuery,
  queryHref,
  popularTags,
  normalizeSearch,
} from '../../src/features/blog/query';
import type { BlogIndex, BlogPost } from '../../src/features/blog/types';
function sample(id: string, overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id,
    title: id,
    summary: 'A sample summary',
    kind: 'internal',
    href: `/blog/${id}`,
    publishedAt: '2026-10-18',
    tagIds: ['cache'],
    technicalKeywords: [],
    pullRequestRefs: [],
    relatedIds: [],
    evidenceIds: [],
    resources: [],
    ...overrides,
  };
}
function collection(count = 25): BlogIndex {
  return {
    posts: Array.from({ length: count }, (_, i) =>
      sample(`post-${String(i).padStart(3, '0')}`),
    ),
    categories: [{ id: 'engineering', label: '工程' }],
    tags: [{ id: 'cache', label: 'KV Cache' }],
    channels: [],
    sources: [],
    featuredId: 'post-000',
    preview: false,
  };
}
const empty = { q: '', category: '', tag: '', page: 1 };
describe('blog query contract', () => {
  it('25 posts with one featured post produce two disjoint 12-item pages', () => {
    const index = collection();
    const first = queryPosts(index, empty);
    const second = queryPosts(index, { ...empty, page: 2 });
    expect(first.featured?.id).toBe('post-000');
    expect(second.featured).toBeUndefined();
    expect(first.total).toBe(24);
    expect(first.posts).toHaveLength(12);
    expect(second.posts).toHaveLength(12);
    expect(
      new Set([...first.posts, ...second.posts].map((post) => post.id)).size,
    ).toBe(24);
    expect(
      [...first.posts, ...second.posts].some((post) => post.id === 'post-000'),
    ).toBe(false);
  });
  it('a filter searches the whole collection and can return the featured post', () => {
    const index = collection();
    expect(
      queryPosts(index, { ...empty, q: 'POST-000' }).posts.map(
        (post) => post.id,
      ),
    ).toEqual(['post-000']);
    expect(queryPosts(index, { ...empty, tag: 'cache' }).total).toBe(25);
    expect(
      queryPosts(index, { ...empty, tag: 'cache' }).featured,
    ).toBeUndefined();
  });
  it('searches every public field once, combines filters with AND, and preserves stable order', () => {
    const index = collection(3);
    index.featuredId = undefined;
    index.posts[0] = sample('z', {
      author: '张工程师',
      categoryId: 'engineering',
      technicalKeywords: ['SGLang'],
      pullRequestRefs: [
        {
          repository: 'modelsphere/router',
          number: 42,
          href: 'https://github.com/modelsphere/router/pull/42',
        },
      ],
    });
    for (const q of [
      '张工程师',
      'sglang',
      'KV CACHE',
      '42',
      '#42',
      'modelsphere/router#42',
    ])
      expect(
        queryPosts(index, { ...empty, q }).posts.map((post) => post.id),
      ).toContain('z');
    expect(
      queryPosts(index, {
        ...empty,
        q: 'sglang',
        category: 'engineering',
        tag: 'cache',
      }).total,
    ).toBe(1);
    expect(
      queryPosts(index, { ...empty, q: 'sglang', category: 'other' }).total,
    ).toBe(0);
    expect(queryPosts(index, empty).posts.map((post) => post.id)).toEqual([
      'post-001',
      'post-002',
      'z',
    ]);
  });
  it('counts popular tags across all posts, including featured exactly once', () => {
    const index = collection();
    expect(popularTags(index)).toEqual([
      { id: 'cache', label: 'KV Cache', count: 25 },
    ]);
  });
  it('normalizes invalid/duplicate/unknown parameters and clamps pages', () => {
    const index = collection();
    const parsed = parseQuery(
      '?q=first&q=second&category=missing&tag=unknown&page=999&ignored=x',
      index,
    );
    expect(parsed.query).toEqual({ ...empty, q: 'first' });
    expect(queryHref(parsed.query)).toBe('/blog?q=first');
    for (const page of ['0', '-1', '1.5', '1e2', '9007199254740992', '01'])
      expect(parseQuery(`?page=${page}`, index).query.page).toBe(1);
    expect(parseQuery('?page=999', index).query.page).toBe(2);
    expect(
      queryHref({ ...empty, q: '缓存 & C++', tag: 'cache', page: 2 }),
    ).toBe('/blog?q=%E7%BC%93%E5%AD%98+%26+C%2B%2B&tag=cache&page=2');
  });
  it('truncates graphemes without splitting emoji or combining marks', () => {
    const q = '👨‍👩‍👧‍👦'.repeat(101);
    expect(normalizeSearch(` ${q} `)).toBe('👨‍👩‍👧‍👦'.repeat(100));
    expect(normalizeSearch('e\u0301'.repeat(101))).toBe('e\u0301'.repeat(100));
  });
  it('supports empty, only-featured, and no-featured collections', () => {
    expect(
      queryPosts({ ...collection(0), featuredId: undefined }, empty).pages,
    ).toBe(1);
    expect(queryPosts(collection(1), empty).total).toBe(0);
    expect(
      queryPosts({ ...collection(25), featuredId: undefined }, empty).total,
    ).toBe(25);
  });
  it('validates the 5,000-post summary budget and returns the final page', () => {
    const index = collection(5000);
    expect(gzipSync(JSON.stringify(index)).length).toBeLessThan(
      2 * 1024 * 1024,
    );
    const result = queryPosts(index, { ...empty, page: 417 });
    expect(result.total).toBe(4999);
    expect(result.posts).toHaveLength(7);
    expect(result.posts.at(-1)?.id).toBe('post-999');
  });
});
