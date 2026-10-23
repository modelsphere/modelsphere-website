import { describe, it, expect } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  cp,
  copyFile,
  symlink,
} from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { stringify } from 'yaml';
import {
  inspectMarkdown,
  parseArticle,
  readBlog,
  prepareBlog,
} from '../../scripts/prepare-blog';
import { assertPreparedBlog } from '../../src/lib/prepared-blog';
import { resolveBuildMode, type BuildMode } from '../../src/lib/build-mode';
const release: BuildMode = {
  target: 'release',
  source: 'none',
  origin: 'https://example.test',
};
const preview: BuildMode = {
  target: 'preview',
  source: 'mock',
  origin: 'http://localhost:4173',
};
function serialize(article: ReturnType<typeof parseArticle>) {
  return `---\n${stringify(article.meta)}---\n${article.body}`;
}
async function changeMeta(
  file: string,
  change: (meta: ReturnType<typeof parseArticle>['meta']) => void,
) {
  const article = parseArticle(await readFile(file, 'utf8'));
  change(article.meta);
  await writeFile(file, serialize(article));
}
async function temporary(action: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-blog-'));
  try {
    await mkdir(path.join(root, '.generated'), { recursive: true });
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function withArticle(
  action: (root: string, file: string) => Promise<void>,
) {
  await temporary(async (root) => {
    await mkdir(path.join(root, 'content/pages'), { recursive: true });
    await writeFile(
      path.join(root, 'content/pages/blog.json'),
      JSON.stringify({
        categories: [{ id: 'release', label: '发布' }],
        tags: [
          { id: 'kubernetes', label: 'Kubernetes' },
          { id: 'sglang', label: 'SGLang' },
        ],
        channels: [],
        sources: [],
      }),
    );
    const dir = path.join(root, 'content/blog/example-blog-platform');
    await cp('tests/fixtures/blog/posts/example-blog-platform', dir, {
      recursive: true,
    });
    const file = path.join(dir, 'index.md');
    const article = parseArticle(await readFile(file, 'utf8'));
    delete article.meta.example;
    article.meta.relatedIds = [];
    article.body = article.body.replace(
      '[测评条件示例](/blog/example-blog-benchmark)',
      '测评条件示例',
    );
    await writeFile(file, serialize(article));
    await action(root, file);
  });
}
describe('blog publication boundary', () => {
  it('reads the eight isolated fixtures, including one external article', async () => {
    const result = await readBlog(process.cwd(), preview);
    expect(result.articles).toHaveLength(8);
    expect(
      result.articles.filter((a) => a.meta.kind === 'internal'),
    ).toHaveLength(7);
    expect((await readBlog(process.cwd(), release)).articles).toHaveLength(0);
  });
  it.each([
    '<script>x</script>',
    '<Component/>',
    'import A from "a"',
    '{process.env.SECRET}',
    '# Duplicate title',
    '##### Too deep',
    ':::custom\ntext\n:::',
    ':::note{style="color:red"}\ntext\n:::',
  ])('rejects active or unsupported Markdown: %s', (body) => {
    expect(() => inspectMarkdown(body)).toThrow();
  });
  it('preserves code fences while checking ordinary headings and reference images', () => {
    const parsed = inspectMarkdown(
      '## Heading\n\n```jsx\n<Component/>\n{process.env.SECRET}\n```\n\n![image][cover]\n\n[cover]: cover.png',
    );
    expect(parsed.anchors.has('heading')).toBe(true);
    expect(parsed.images).toEqual(['cover.png']);
    expect(() =>
      parseArticle('---\ntitle: first\ntitle: second\n---\ntext'),
    ).toThrow();
  });
  it('stages only referenced assets and publishes neither maintenance metadata nor draft bodies', async () => {
    await withArticle(async (root, file) => {
      await writeFile(
        path.join(path.dirname(file), 'unused-private.txt'),
        'do-not-publish',
      );
      const index = await prepareBlog(root, release);
      expect(index.posts).toHaveLength(1);
      expect(index.posts[0].cover?.src).toMatch(
        /^\/blog-media\/example-blog-platform\//,
      );
      await assertPreparedBlog(root, release);
      const output = await readFile(
        path.join(root, '.generated/blog/example-blog-platform/index.md'),
        'utf8',
      );
      expect(output).not.toContain('updatedAt');
      expect(output).not.toContain('example:');
      await changeMeta(file, (meta) => {
        meta.draft = true;
      });
      expect((await prepareBlog(root, release)).posts).toHaveLength(0);
      await expect(
        readFile(
          path.join(root, '.generated/blog/example-blog-platform/index.md'),
        ),
      ).rejects.toThrow();
    });
  });
  it.each([
    'javascript:alert%281%29',
    '//example.test',
    'file:///etc/passwd',
    '../outside.md',
    'https://user:secret@example.test',
  ])('rejects unsafe links: %s', async (url) => {
    await withArticle(async (root, file) => {
      await writeFile(
        file,
        (await readFile(file, 'utf8')) + `\n[unsafe](${url})\n`,
      );
      await expect(readBlog(root, release)).rejects.toThrow();
    });
  });
  it('rejects future publication, invalid dictionaries, and broken related references', async () => {
    await withArticle(async (root, file) => {
      const raw = await readFile(file, 'utf8');
      for (const change of [
        (meta: ReturnType<typeof parseArticle>['meta']) => {
          meta.publishedAt = '2099-01-01';
        },
        (meta: ReturnType<typeof parseArticle>['meta']) => {
          meta.categoryId = 'missing';
        },
        (meta: ReturnType<typeof parseArticle>['meta']) => {
          meta.relatedIds = ['missing'];
        },
      ]) {
        await writeFile(file, raw);
        await changeMeta(file, change);
        await expect(readBlog(root, release)).rejects.toThrow();
      }
    });
  });
  it('rejects media traversal, remote media, and symlinks', async () => {
    await withArticle(async (root, file) => {
      const raw = await readFile(file, 'utf8');
      for (const src of [
        '../cover.png',
        'https://example.test/image.png',
        '%2e%2e/cover.png',
      ]) {
        await writeFile(file, raw);
        await changeMeta(file, (meta) => {
          meta.cover!.src = src;
        });
        await expect(prepareBlog(root, release)).rejects.toThrow();
      }
      await writeFile(file, raw);
      await rm(path.join(path.dirname(file), 'cover.png'));
      await symlink(
        path.resolve('static/brand/modelsphere-logo.png'),
        path.join(path.dirname(file), 'cover.png'),
      );
      await expect(prepareBlog(root, release)).rejects.toThrow('符号链接');
    });
  });
  it('detects tampering and refuses mock content in release mode', async () => {
    expect(() =>
      resolveBuildMode({
        SITE_ORIGIN: 'https://example.test',
        BLOG_SOURCE_MODE: 'mock',
      }),
    ).toThrow('Mock 博客');
    await withArticle(async (root) => {
      await prepareBlog(root, release);
      await writeFile(path.join(root, '.generated/blog-index.json'), '{}');
      await expect(assertPreparedBlog(root, release)).rejects.toThrow('暂存');
    });
  });
  it('accepts local image names containing Chinese characters and encoded spaces', async () => {
    await withArticle(async (root, file) => {
      await copyFile(
        path.join(path.dirname(file), 'cover.png'),
        path.join(path.dirname(file), '架构 图.png'),
      );
      await changeMeta(file, (meta) => {
        meta.cover!.src = encodeURIComponent('架构 图.png');
      });
      expect((await prepareBlog(root, release)).posts[0].cover?.src).toMatch(
        /^\/blog-media\//,
      );
    });
  });
});
