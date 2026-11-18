import { afterEach, describe, expect, it, vi } from 'vitest';
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { stringify } from 'yaml';
import { prepareBlog } from '../../scripts/prepare-blog';
import {
  readBlogExpectations,
  expectedBlogList,
} from '../helpers/blog-expectations';

afterEach(() => vi.unstubAllEnvs());

async function candidate(action: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'blog-source-isolation-'));
  try {
    await cp('tests/fixtures/blog', path.join(root, 'tests/fixtures/blog'), {
      recursive: true,
    });
    await cp('tests/fixtures/blog/posts', path.join(root, 'content/blog'), {
      recursive: true,
    });
    await mkdir(path.join(root, 'content/pages'), { recursive: true });
    await cp(
      'tests/fixtures/blog/config.json',
      path.join(root, 'content/pages/blog.json'),
    );
    await mkdir(path.join(root, 'i18n/en/blog'), { recursive: true });
    for (const id of await readdir('tests/fixtures/blog/posts')) {
      await writeFile(
        path.join(root, 'i18n/en/blog', `${id}.md`),
        '---\ntitle: Example\nsummary: Example summary\n---\n\n## Example\n\nEnglish fixture body.\n',
      );
    }
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('blog source isolation regression', () => {
  it('keeps eight fixed samples while publishing only a new coverless article', async () => {
    await candidate(async (root) => {
      const mock = {
        target: 'preview',
        source: 'mock',
        blogSource: 'mock',
        origin: 'http://localhost:4173',
      } as const;
      const before = await prepareBlog(root, mock);
      for (const draft of [false, true]) {
        const id = draft ? 'draft-article' : 'published-article';
        const directory = path.join(root, 'content/blog', id);
        await mkdir(directory);
        await writeFile(
          path.join(directory, 'index.md'),
          `---\n${stringify({ id, title: id, summary: 'Independent publication regression', kind: 'internal', slug: id, publishedAt: '2020-01-01', updatedAt: '2020-01-01T00:00:00Z', evidenceIds: [], draft })}---\n\n## Article\n\nPublished without a cover.\n`,
        );
      }
      for (const id of ['published-article', 'draft-article']) {
        await writeFile(
          path.join(root, 'i18n/en/blog', `${id}.md`),
          '---\ntitle: Article\nsummary: Article summary\n---\n\n## Article\n\nEnglish article body.\n',
        );
      }
      const after = await prepareBlog(root, mock);
      expect(after.posts).toEqual(before.posts);
      vi.stubEnv('TEST_BLOG_SOURCE', 'mock');
      const fixed = readBlogExpectations(root);
      expect(fixed.posts).toHaveLength(8);
      expect(expectedBlogList(fixed).posts).toHaveLength(8);

      const published = await prepareBlog(root, {
        target: 'release',
        source: 'content',
        blogSource: 'content',
        origin: 'https://example.test',
      });
      expect(published.posts.map((post) => post.id)).toEqual([
        'published-article',
      ]);
      expect(published.posts[0].cover).toBeUndefined();
      expect(published.featuredId).toBeUndefined();
      vi.stubEnv('TEST_BLOG_SOURCE', 'content');
      const expected = readBlogExpectations(root);
      expect(expected.posts.map((post) => post.id)).toEqual([
        'published-article',
      ]);
      expect(expectedBlogList(expected).posts.map((post) => post.id)).toEqual([
        'published-article',
      ]);
      expect(expected.excluded).toHaveLength(9);
    });
  });

  it('rejects a source mismatch instead of running fixed assertions on a content candidate', async () => {
    await candidate(async (root) => {
      await prepareBlog(root, {
        target: 'release',
        source: 'content',
        blogSource: 'content',
        origin: 'https://example.test',
      });
      vi.stubEnv('TEST_BLOG_SOURCE', 'mock');
      expect(() => readBlogExpectations(root)).toThrow(
        'candidate source=content',
      );
      vi.stubEnv('TEST_BLOG_SOURCE', 'content');
      const empty = readBlogExpectations(root);
      expect(empty.posts).toEqual([]);
      expect(empty.featuredId).toBeUndefined();
    });
  });
});
