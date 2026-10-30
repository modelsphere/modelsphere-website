import { describe, expect, it } from 'vitest';
import { localizeContent } from '../../src/lib/content-i18n';
import { eventDate } from '../../src/features/community/events';
import translations from '../../i18n/en/code.json';

describe('localized content', () => {
  it('translates data labels while preserving identifiers and URLs', () => {
    const source = {
      id: 'performance',
      label: '性能调优与测评',
      href: '/models?engine=vllm',
      nested: ['进入直播'],
    };
    expect(localizeContent(source, 'en')).toEqual({
      ...source,
      label: 'Performance tuning and benchmarks',
      nested: ['Watch live'],
    });
    expect(localizeContent(source, 'zh-CN')).toBe(source);
    expect(source.label).toBe('性能调优与测评');
  });
  it('keeps placeholder names intact in every translated message', () => {
    for (const entry of Object.values(translations)) {
      if (!('description' in entry)) continue;
      const placeholders = (value: string) =>
        [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      expect(placeholders(entry.message)).toEqual(
        placeholders(entry.description),
      );
    }
  });
  it('formats English event dates in the declared timezone', () => {
    expect(eventDate('2026-11-12T20:00:00+08:00', 'Asia/Shanghai', 'en')).toBe(
      'Nov 12, 2026, 20:00 (Asia/Shanghai)',
    );
  });
});

it('stages only published translations and retains source routing metadata', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, readdir, rm } = await import(
    'node:fs/promises'
  );
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { prepareTranslations } = await import(
    '../../scripts/prepare-translations'
  );
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-i18n-'));
  try {
    for (const directory of [
      '.generated/docs',
      '.generated/blog/published',
      'i18n/en/docs',
      'i18n/en/blog',
      'tests/fixtures/docs-en',
    ])
      await mkdir(path.join(root, directory), { recursive: true });
    const put = (file: string, value: string) =>
      writeFile(path.join(root, file), value);
    await put('i18n/en/code.json', '{}');
    await put('i18n/en/docs-sidebar.json', '{}');
    await put(
      '.generated/docs/index.md',
      '---\nid: source-id\nslug: /\ntitle: 原文\n---\n原文正文\n\n## 中文章节',
    );
    await put(
      '.generated/docs/overview.md',
      '---\nid: fixture-id\nslug: /\ntitle: 示例原文\n---\n示例正文\n\n## 示例章节',
    );
    await put(
      'i18n/en/docs/index.md',
      '---\ntitle: English docs\n---\nTranslated body\n\n## English section',
    );
    await put(
      'tests/fixtures/docs-en/overview.md',
      '---\ntitle: Fixture docs\n---\nFixture body\n\n## Fixture section',
    );
    await put(
      '.generated/blog/published/index.md',
      '---\nslug: fixed-slug\ndate: 2026-10-01\ntitle: 原文\n---\n原文正文',
    );
    await put(
      'i18n/en/blog/published.md',
      '---\ntitle: English post\nsummary: English summary\n---\nEnglish body',
    );
    await put(
      'i18n/en/blog/draft.md',
      '---\ntitle: Do not publish\nsummary: Hidden\n---\nSecret',
    );
    await put(
      '.generated/blog-index.json',
      JSON.stringify({
        posts: [
          {
            id: 'published',
            title: '原文',
            summary: '原文',
            kind: 'internal',
            href: '/blog/fixed-slug',
          },
        ],
      }),
    );
    await prepareTranslations(root);
    const output = '.generated/locales/en/';
    const current = path.join(
      root,
      output,
      'docusaurus-plugin-content-docs/current',
    );
    const doc = await readFile(path.join(current, 'index.md'), 'utf8');
    expect(doc).toContain('id: source-id');
    expect(doc).toContain('slug: /');
    expect(doc).toContain('Translated body');
    expect(doc).toContain('## English section {#中文章节}');
    expect(await readFile(path.join(current, 'overview.md'), 'utf8')).toContain(
      '示例正文',
    );
    await prepareTranslations(root, 'mock');
    const fixture = await readFile(path.join(current, 'overview.md'), 'utf8');
    expect(fixture).toContain('id: fixture-id');
    expect(fixture).toContain('slug: /');
    expect(fixture).toContain('title: Fixture docs');
    expect(fixture).toContain('Fixture body');
    expect(fixture).toContain('## Fixture section {#示例章节}');
    expect(await readFile(path.join(current, 'index.md'), 'utf8')).toContain(
      '原文正文',
    );
    const post = await readFile(
      path.join(
        root,
        output,
        'docusaurus-plugin-content-blog/published/index.md',
      ),
      'utf8',
    );
    expect(post).toContain('slug: fixed-slug');
    expect(post).toContain('English body');
    expect(
      await readdir(path.join(root, output, 'docusaurus-plugin-content-blog')),
    ).toEqual(['published']);
    expect(
      JSON.parse(
        await readFile(
          path.join(root, '.generated/blog-index.en.json'),
          'utf8',
        ),
      ).posts[0],
    ).toMatchObject({
      title: 'English post',
      summary: 'English summary',
      href: '/blog/fixed-slug',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
