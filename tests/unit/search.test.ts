import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { LoadContext } from '@docusaurus/types';
import { markdownEntries } from '../../plugins/search/content';
import searchPlugin from '../../plugins/search';
import {
  searchIndex,
  searchTerms,
  highlightParts,
  isSearchIndex,
  snippet,
  type SearchEntry,
  type SearchIndex,
} from '../../src/features/search/query';

const entry = (overrides: Partial<SearchEntry> = {}): SearchEntry => ({
  title: '部署指南',
  kind: 'docs',
  heading: '',
  href: '/docs',
  pageHref: '/docs',
  text: '通过 Kubernetes 运行推理服务',
  tags: '',
  ...overrides,
});
describe('site search', () => {
  it('uses explicit translated heading anchors in search results', () => {
    const entries = markdownEntries(
      '## Core concepts {#核心概念}\nEnglish content',
      { kind: 'docs', title: 'Guide', href: '/docs' },
    );
    expect(
      entries.find((entry) => entry.heading === 'Core concepts')?.href,
    ).toBe('/docs#' + encodeURIComponent('核心概念'));
  });
  it('matches Chinese, case-insensitive English, all terms and scopes', () => {
    const index: SearchIndex = {
      version: 1,
      entries: [
        entry(),
        entry({
          title: '推理博客',
          kind: 'blog',
          href: '/blog/runtime',
          pageHref: '/blog/runtime',
          text: 'Token runtime',
          tags: '缓存优化',
        }),
      ],
    };
    expect(searchIndex(index, '  KUBERNETES 推理 ', 'all')).toHaveLength(1);
    expect(searchIndex(index, '缓存优化', 'blog')[0].pageHref).toBe(
      '/blog/runtime',
    );
    expect(searchIndex(index, '缓存优化', 'docs')).toEqual([]);
    expect(searchIndex(index, '  ', 'all')).toEqual([]);
    expect(searchIndex(index, 'Token 不存在', 'all')).toEqual([]);
    expect(searchTerms('a '.repeat(200))).toEqual(['a']);
  });
  it('prioritizes titles and keeps the best section once per page', () => {
    const index: SearchIndex = {
      version: 1,
      entries: [
        entry(),
        entry({ heading: '推理', href: '/docs#推理' }),
        entry({
          title: '推理',
          text: '',
          kind: 'blog',
          pageHref: '/blog/runtime',
          href: '/blog/runtime',
        }),
      ],
    };
    const results = searchIndex(index, '推理', 'all');
    expect(results.map((result) => result.href)).toEqual([
      '/blog/runtime',
      '/docs#推理',
    ]);
  });
  it('extracts readable text, code and stable repeated heading anchors', () => {
    const entries = markdownEntries(
      '---\ntitle: 私有元数据\n---\n简介\n\n## 配置\n\n**正文** `inline`\n\n```yaml\nexampleOnly: true\n```\n\n## 配置\n\n[链接文字](https://example.com/private)\n\n:::info 提示\n\n提示正文\n\n:::',
      { kind: 'docs', title: '文档', href: '/docs/' },
    );
    expect(entries.map((item) => decodeURIComponent(item.href))).toEqual([
      '/docs',
      '/docs#配置',
      '/docs#配置-1',
    ]);
    expect(entries[1].text).toContain('exampleOnly: true');
    expect(entries[2].text).toContain('链接文字');
    expect(entries[2].text).toContain('提示正文');
    expect(JSON.stringify(entries)).not.toMatch(
      /私有元数据|https:\/\/example.com/,
    );
  });
  it('highlights literal special characters safely and centers long snippets on hits', () => {
    const parts = highlightParts(
      'C++ [配置] TOKEN <script>',
      'C++ [配置] token',
    );
    expect(parts.filter((part) => part.match).map((part) => part.text)).toEqual(
      ['C++', '[配置]', 'TOKEN'],
    );
    expect(
      snippet('前'.repeat(200) + '命中' + '后'.repeat(200), ['命中']),
    ).toMatch(/^…前{36}命中后+…$/);
    expect(highlightParts('x', ' ')).toEqual([{ text: 'x', match: false }]);
  });
  it('rejects malformed or off-site index payloads', () => {
    expect(isSearchIndex({ version: 1, entries: [entry()] })).toBe(true);
    for (const value of [
      null,
      {},
      { version: 2, entries: [] },
      { version: 1, entries: [entry({ href: 'https://example.com' })] },
      { version: 1, entries: [entry({ pageHref: '//example.com' })] },
      { version: 1, entries: [null] },
    ])
      expect(isSearchIndex(value)).toBe(false);
  });
  it('indexes only actual public plugin routes and rebuilds an empty release without stale content', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-search-'));
    try {
      await mkdir(path.join(root, '.generated/docs'), { recursive: true });
      await mkdir(path.join(root, '.generated/blog/post'), { recursive: true });
      await writeFile(path.join(root, '.generated/docs/one.md'), '公开正文');
      await writeFile(
        path.join(root, '.generated/blog/post/index.md'),
        '博客正文',
      );
      await writeFile(
        path.join(root, '.generated/blog-index.json'),
        JSON.stringify({
          posts: [
            { kind: 'internal', href: '/blog/post', tagIds: ['cache'] },
            { kind: 'external', href: 'https://external.test', tagIds: [] },
          ],
          tags: [{ id: 'cache', label: '缓存' }],
        }),
      );
      const setGlobalData = vi.fn();
      const actions = { addRoute: vi.fn(), createData: vi.fn(), setGlobalData };
      const plugin = searchPlugin({
        siteDir: root,
        baseUrl: '/',
        i18n: { currentLocale: 'zh-CN' },
      } as LoadContext);
      const doc = {
        title: '公开文档',
        source: '@site/.generated/docs/one.md',
        permalink: '/docs/one',
      };
      await plugin.allContentLoaded!({
        actions,
        allContent: {
          'docusaurus-plugin-content-docs': {
            default: {
              loadedVersions: [
                {
                  docs: [
                    doc,
                    { ...doc, draft: true, source: 'never-read' },
                    { ...doc, unlisted: true, source: 'never-read' },
                  ],
                },
              ],
            },
          },
          'docusaurus-plugin-content-blog': {
            default: {
              blogPosts: [
                {
                  metadata: {
                    title: '博客',
                    permalink: '/blog/post',
                    source: '@site/.generated/blog/post/index.md',
                  },
                },
              ],
            },
          },
        },
      });
      const url = setGlobalData.mock.calls[0][0].indexUrl;
      const result: SearchIndex = JSON.parse(
        await readFile(
          path.join(root, '.generated/search-public', url),
          'utf8',
        ),
      );
      expect(result.entries).toHaveLength(2);
      expect(result.entries[1].tags).toBe('缓存');
      expect(JSON.stringify(result)).not.toContain('external.test');
      await plugin.allContentLoaded!({ actions, allContent: {} });
      const emptyUrl = setGlobalData.mock.calls[1][0].indexUrl;
      expect(emptyUrl).not.toBe(url);
      await expect(
        readFile(path.join(root, '.generated/search-public', url)),
      ).rejects.toThrow();
      expect(
        JSON.parse(
          await readFile(
            path.join(root, '.generated/search-public', emptyUrl),
            'utf8',
          ),
        ).entries,
      ).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
