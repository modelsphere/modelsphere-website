import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { readBlog, prepareBlog } from '../../scripts/prepare-blog';
import type { BuildMode } from '../../src/lib/build-mode';

const legacy = 'sglang-kimi-k31-pro-video-input';
const mode: BuildMode = {
  target: 'release',
  source: 'none',
  blogSource: 'content',
  origin: 'https://example.test',
};
const translation =
  '---\ntitle: Article\nsummary: English summary\n---\n\n## Article\n\nEnglish article body.\n';
async function fixture(action: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'blog-bilingual-content-'));
  try {
    await mkdir(path.join(root, 'content/pages'), { recursive: true });
    await writeFile(
      path.join(root, 'content/pages/blog.json'),
      JSON.stringify({ categories: [], tags: [], channels: [], sources: [] }),
    );
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function chinese(
  root: string,
  id = 'new-post',
  flags = {},
  body = '## Article\n\n文章正文。\n',
) {
  const directory = path.join(root, 'content/blog', id);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, 'index.md'),
    `---\n${stringify({ id, title: '文章', summary: '文章摘要', kind: 'internal', slug: id, publishedAt: '2020-01-01', updatedAt: '2020-01-01T00:00:00Z', evidenceIds: [], ...flags })}---\n\n${body}`,
  );
}
async function english(root: string, id = 'new-post', raw = translation) {
  const directory = path.join(root, 'i18n/en/blog');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.md`), raw);
}

describe('shared blog bilingual content policy (without Git history)', () => {
  it.each(['local', 'preview', 'release'] as const)(
    'rejects a new Chinese-only article in %s content mode',
    async (target) => {
      await fixture(async (root) => {
        await chinese(root);
        await expect(readBlog(root, { ...mode, target })).rejects.toThrow(
          '缺少英文稿：i18n/en/blog/new-post.md',
        );
      });
    },
  );
  it('accepts both versions and stages them through the normal build entry', async () => {
    await fixture(async (root) => {
      await chinese(root);
      await english(root);
      expect((await readBlog(root, mode)).articles).toHaveLength(1);
      expect(
        (await prepareBlog(root, mode)).posts.map((post) => post.id),
      ).toEqual(['new-post']);
    });
  });
  it('rejects an English file without its Chinese source', async () => {
    await fixture(async (root) => {
      await english(root);
      await expect(readBlog(root, mode)).rejects.toThrow(
        '缺少中文稿：content/blog/new-post/index.md',
      );
    });
  });
  it.each(['', '---\ntitle: Article\nsummary: Summary\n---\n<!-- no body -->'])(
    'rejects empty or comment-only English files',
    async (raw) => {
      await fixture(async (root) => {
        await chinese(root);
        await english(root, 'new-post', raw);
        await expect(readBlog(root, mode)).rejects.toThrow();
      });
    },
  );
  it.each(['title', 'summary'])(
    'requires a nonblank English %s',
    async (field) => {
      await fixture(async (root) => {
        await chinese(root);
        await english(
          root,
          'new-post',
          translation.replace(
            new RegExp(`${field}: [^\n]*`),
            `${field}: '   '`,
          ),
        );
        await expect(readBlog(root, mode)).rejects.toThrow();
      });
    },
  );
  it('rejects empty Chinese bodies even when English exists', async () => {
    await fixture(async (root) => {
      await chinese(root, 'new-post', {}, '<!-- no body -->');
      await english(root);
      await expect(readBlog(root, mode)).rejects.toThrow('中文稿正文不能为空');
    });
  });
  it('keeps the explicit historical single-language exception usable without Git', async () => {
    await fixture(async (root) => {
      await chinese(root, legacy);
      expect((await readBlog(root, mode)).articles).toHaveLength(1);
      await chinese(root, legacy, {}, '## Updated\n\n修正后的原文。\n');
      expect((await readBlog(root, mode)).articles).toHaveLength(1);
    });
  });
  it('accepts adding English to the historical article but validates it once supplied', async () => {
    await fixture(async (root) => {
      await chinese(root, legacy);
      await english(root, legacy);
      expect((await readBlog(root, mode)).articles).toHaveLength(1);
      await english(
        root,
        legacy,
        '---\ntitle: Article\nsummary: Summary\n---\n',
      );
      await expect(readBlog(root, mode)).rejects.toThrow('英文稿正文不能为空');
    });
  });
  it.each([{ draft: true }, { example: true }])(
    'does not exempt new IDs based on flags: %j',
    async (flags) => {
      await fixture(async (root) => {
        await chinese(root, 'new-post', flags);
        await expect(readBlog(root, mode)).rejects.toThrow('缺少英文稿');
      });
    },
  );
  it('rejects draft promotion without English through the same build validation', async () => {
    await fixture(async (root) => {
      await chinese(root, 'new-post', { draft: true });
      await english(root);
      expect((await readBlog(root, mode)).articles).toHaveLength(0);
      await chinese(root);
      await rm(path.join(root, 'i18n/en/blog/new-post.md'));
      await expect(prepareBlog(root, mode)).rejects.toThrow('缺少英文稿');
    });
  });
  it('does not let a renamed article inherit the historical exception', async () => {
    await fixture(async (root) => {
      await chinese(root, 'renamed-article');
      await expect(readBlog(root, mode)).rejects.toThrow('缺少英文稿');
    });
  });
});
