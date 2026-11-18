import { describe, it, expect } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  writeFile,
  rm,
  cp,
  copyFile,
  symlink,
} from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { stringify } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import remarkFollowCard from '../../plugins/blog/remark-follow-card';
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
  blogSource: 'mock',
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
    await mkdir(path.join(root, 'i18n/en/blog'), { recursive: true });
    await writeFile(
      path.join(root, 'i18n/en/blog/example-blog-platform.md'),
      '---\ntitle: Platform\nsummary: Platform summary\n---\n\n## Platform\n\nEnglish body.\n',
    );
    await action(root, file);
  });
}
describe('blog publication boundary', () => {
  it('publishes the Ascend support article in the formal release', async () => {
    const result = await readBlog(process.cwd(), {
      ...release,
      blogSource: 'content',
    });
    expect(result.articles.map((article) => article.meta)).toContainEqual(
      expect.objectContaining({
        id: 'blog-20261104-ascend-support',
        kind: 'internal',
        slug: 'ascend-support',
      }),
    );
  });
  it('publishes the selected example blog in an explicitly enabled release', async () => {
    const mode = resolveBuildMode({
      SITE_ORIGIN: 'https://example.test',
      SITE_PUBLISH_EXAMPLES: 'true',
      BLOG_SOURCE_MODE: 'mock',
    });
    const result = await readBlog(process.cwd(), mode);
    expect(result.articles).toHaveLength(8);
    expect(
      result.articles.filter((a) => a.meta.kind === 'internal'),
    ).toHaveLength(7);
    expect(result.articles.every((a) => a.meta.example)).toBe(true);
    expect(result.preview).toBe(true);
    await expect(
      readBlog(process.cwd(), { ...mode, publishExamples: false }),
    ).rejects.toThrow('Mock 博客');
  });
  it('reads the eight isolated fixtures, including one external article', async () => {
    const result = await readBlog(process.cwd(), preview);
    expect(result.articles).toHaveLength(8);
    expect(
      result.articles.filter((a) => a.meta.kind === 'internal'),
    ).toHaveLength(7);
  });
  it('loads formal content by default in local, preview, and enabled release builds', async () => {
    await temporary(async (root) => {
      await mkdir(path.join(root, 'content/pages'), { recursive: true });
      await copyFile(
        'tests/fixtures/blog/config.json',
        path.join(root, 'content/pages/blog.json'),
      );
      await cp('tests/fixtures/blog/posts', path.join(root, 'content/blog'), {
        recursive: true,
      });
      await mkdir(path.join(root, 'i18n/en/blog'), { recursive: true });
      for (const id of await readdir('tests/fixtures/blog/posts')) {
        await writeFile(
          path.join(root, 'i18n/en/blog', `${id}.md`),
          '---\ntitle: Example\nsummary: Example summary\n---\n\n## Example\n\nEnglish fixture body.\n',
        );
      }
      for (const target of ['local', 'preview', 'release'] as const) {
        const result = await readBlog(root, {
          ...release,
          target,
          publishExamples: target === 'release',
        });
        expect(result.preview).toBe(false);
        expect(result.articles).toHaveLength(8);
        expect(
          result.articles.every(
            (article) =>
              article.directory.startsWith(path.join(root, 'content/blog')) &&
              article.meta.example,
          ),
        ).toBe(true);
      }
      const hidden = await readBlog(root, release);
      expect(hidden.articles).toHaveLength(0);
      expect(hidden.config.featuredId).toBeUndefined();
    });
  });
  it('keeps mock and formal sources separate and clears stale staging when switching', async () => {
    await withArticle(async (root, file) => {
      await cp('tests/fixtures/blog', path.join(root, 'tests/fixtures/blog'), {
        recursive: true,
      });
      expect((await prepareBlog(root, preview)).posts).toHaveLength(8);
      const index = await prepareBlog(root, {
        ...release,
        publishExamples: true,
      });
      expect(index.preview).toBe(false);
      expect(index.posts).toHaveLength(1);
      await expect(
        readFile(
          path.join(root, '.generated/blog/example-blog-cache/index.md'),
        ),
      ).rejects.toThrow();
      expect(
        await readdir(path.join(root, '.generated/blog-public/blog-media')),
      ).toEqual(['example-blog-platform']);
      await changeMeta(file, (meta) => {
        meta.draft = true;
      });
      expect(
        (await prepareBlog(root, { ...release, publishExamples: true })).posts,
      ).toHaveLength(0);
    });
  });
  it('rejects an unknown featured article instead of silently dropping it', async () => {
    await withArticle(async (root) => {
      const configFile = path.join(root, 'content/pages/blog.json');
      const config = JSON.parse(await readFile(configFile, 'utf8'));
      await writeFile(
        configFile,
        JSON.stringify({ ...config, featuredId: 'missing' }),
      );
      await expect(readBlog(root, release)).rejects.toThrow('推荐文章');
    });
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
    ':::follow{onclick="alert(1)"}\ntext\n:::',
  ])('rejects active or unsupported Markdown: %s', (body) => {
    expect(() => inspectMarkdown(body)).toThrow();
  });
  it('renders a follow card with fixed markup and preserves its Markdown content', () => {
    const body =
      ':::follow\n\nFollow ModelSphere\n\n- Deployment\n- Tuning\n\n:::';
    expect(() => inspectMarkdown(body)).not.toThrow();
    const processor = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkFollowCard);
    const tree = processor.runSync(processor.parse(body)) as Root;
    expect(tree.children[0].data).toEqual({
      hName: 'aside',
      hProperties: {
        className: ['blog-follow-card'],
        'aria-label': 'Follow ModelSphere',
      },
    });
    expect(toString(tree)).toBe('Follow ModelSphereDeploymentTuning');
    expect(() =>
      processor.runSync(
        processor.parse(':::follow{class="override"}\ntext\n:::'),
      ),
    ).toThrow('关注卡片不允许自定义属性');
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
  it('stages images and a cover that only the English translation references', async () => {
    await withArticle(async (root, file) => {
      const dir = path.dirname(file);
      await copyFile(
        path.join(dir, 'cover.png'),
        path.join(dir, 'cover.en.png'),
      );
      const translation = path.join(
        root,
        'i18n/en/blog/example-blog-platform.md',
      );
      await mkdir(path.dirname(translation), { recursive: true });
      await writeFile(
        translation,
        `---\n${stringify({ title: 'Platform', summary: 'English summary', cover: { src: 'cover.en.png', alt: 'English cover', width: 1600, height: 900 } })}---\n\n![English figure](cover.en.png)\n`,
      );
      const index = await prepareBlog(root, release);
      const english = index.posts[0].translatedCovers?.en;
      expect(english?.alt).toBe('English cover');
      expect(english?.src).toMatch(/^\/blog-media\/example-blog-platform\//);
      await readFile(
        path.join(root, '.generated/blog/example-blog-platform/cover.en.png'),
      );
      await assertPreparedBlog(root, release);
      await writeFile(
        translation,
        '---\ntitle: Platform\nsummary: English summary\n---\n\n![Missing](missing.png)\n',
      );
      await expect(prepareBlog(root, release)).rejects.toThrow();
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
