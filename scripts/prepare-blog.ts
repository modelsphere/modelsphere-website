import {
  readFile,
  readdir,
  lstat,
  mkdir,
  rm,
  writeFile,
  copyFile,
} from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseDocument, stringify } from 'yaml';
import { z } from 'zod';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root } from 'mdast';
import type { BuildMode } from '../src/lib/build-mode';
import type {
  BlogIndex,
  BlogMedia,
  BlogPost,
} from '../src/features/blog/types';
import { inputFiles, writeBlogManifest } from '../src/lib/prepared-blog';
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const https = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, '需要不含凭据的 HTTPS 地址');
const uniqueIds = z
  .array(id)
  .refine((ids) => new Set(ids).size === ids.length, '标识不可重复');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return (
      !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
    );
  }, '无效日期');
const image = z
  .object({
    src: z.string().min(1),
    alt: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    variants: z
      .array(
        z
          .object({
            src: z.string().min(1),
            width: z.number().int().positive(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
const media = image.extend({
  srcDark: z.string().optional(),
  preview: image
    .extend({
      focalPoint: z
        .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
        .optional(),
    })
    .optional(),
});
const label = z.object({ id, label: z.string().min(1) }).strict();
const resource = z.object({ label: z.string().min(1), href: https }).strict();
const source = z
  .object({
    id,
    label: z.string().min(1),
    publicHref: https,
    kind: z.enum([
      'code',
      'documentation',
      'benchmark-report',
      'pull-request',
      'release',
      'owner-confirmation',
    ]),
    locator: z.string().min(1),
    sourceRevision: z.string().optional(),
    checkedAt: z.iso.datetime({ offset: true }),
    checkedBy: z.string().min(1),
    checkResult: z.literal('supports'),
    scope: z.string().min(1),
  })
  .strict()
  .refine(
    (item) =>
      item.kind !== 'code' || /^[0-9a-f]{40}$/.test(item.sourceRevision ?? ''),
    '代码来源必须固定完整 commit',
  );
const channel = z
  .object({
    id,
    kind: z.enum(['wechat', 'zhihu']),
    title: z.string().min(1),
    description: z.string().min(1),
    href: https.optional(),
    contactLabel: z.string().min(1).optional(),
    contactValue: z.string().min(1).optional(),
    qr: media.optional(),
    checkedAt: z.iso.datetime({ offset: true }),
    evidenceIds: uniqueIds.min(1),
  })
  .strict()
  .refine(
    (item) =>
      item.kind === 'zhihu'
        ? Boolean(item.href)
        : Boolean(item.contactLabel && item.contactValue),
    '渠道缺少真实入口或联系说明',
  );
const configSchema = z
  .object({
    categories: z.array(label),
    tags: z.array(label),
    featuredId: id.optional(),
    channels: z.array(channel),
    sources: z.array(source),
  })
  .strict();
const articleSchema = z
  .object({
    id,
    title: z.string().min(1),
    summary: z.string().min(1),
    kind: z.enum(['internal', 'external']),
    slug: id.optional(),
    href: https.optional(),
    publishedAt: date.optional(),
    updatedAt: z.iso.datetime({ offset: true }),
    draft: z.boolean().optional(),
    example: z.boolean().optional(),
    evidenceIds: uniqueIds,
    author: z.string().min(1).optional(),
    categoryId: id.optional(),
    tagIds: uniqueIds.default([]),
    technicalKeywords: z.array(z.string().min(1)).default([]),
    pullRequestRefs: z
      .array(
        z
          .object({
            repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
            number: z.number().int().positive(),
            href: https,
          })
          .strict(),
      )
      .default([]),
    cover: media.optional(),
    readingMinutes: z.number().int().positive().optional(),
    readingTimeSource: https.optional(),
    relatedIds: uniqueIds.max(3).default([]),
    resources: z.array(resource).default([]),
  })
  .strict();
export function parseArticle(raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('文章缺少 YAML 元数据');
  const yaml = parseDocument(match[1], { uniqueKeys: true });
  if (yaml.errors.length) throw new Error(yaml.errors[0].message);
  return {
    meta: articleSchema.parse(yaml.toJS({ maxAliasCount: 0 })),
    body: match[2],
  };
}
const allowedNodes = new Set([
  'root',
  'paragraph',
  'text',
  'heading',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference',
  'definition',
  'image',
  'imageReference',
  'list',
  'listItem',
  'blockquote',
  'thematicBreak',
  'break',
  'code',
  'inlineCode',
  'table',
  'tableRow',
  'tableCell',
  'containerDirective',
]);
export function inspectMarkdown(body: string) {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkMdx)
    .parse(body) as Root;
  const slugger = new GithubSlugger();
  const anchors = new Set<string>();
  const links: string[] = [];
  const images: string[] = [];
  const definitions = new Map<string, string>();
  visit(tree, (node) => {
    if (node.type === 'definition') definitions.set(node.identifier, node.url);
  });
  visit(tree, (node) => {
    if (!allowedNodes.has(node.type))
      throw new Error(`不允许的 Markdown 语法：${node.type}`);
    if (node.type === 'heading') {
      if (node.depth < 2 || node.depth > 4)
        throw new Error('正文标题仅允许 h2–h4');
      anchors.add(slugger.slug(toString(node)));
    }
    if (
      node.type === 'containerDirective' &&
      (!['note', 'info', 'warning'].includes(node.name) ||
        Object.keys(node.attributes ?? {}).length)
    )
      throw new Error('不允许自定义提示块或属性');
    if (node.type === 'link' || node.type === 'definition')
      links.push(node.url);
    if (node.type === 'image') images.push(node.url);
    if (node.type === 'imageReference' || node.type === 'linkReference') {
      const url = definitions.get(node.identifier);
      if (!url) throw new Error('未定义的 Markdown 引用');
      if (node.type === 'imageReference') images.push(url);
    }
  });
  return {
    anchors,
    links: links.filter((link) => !images.includes(link)),
    images,
  };
}
async function plainFile(file: string) {
  if (!(await lstat(file)).isFile())
    throw new Error(`拒绝符号链接或非文件：${file}`);
}
async function localImage(root: string, relative: string): Promise<string> {
  const decoded = decodeURIComponent(relative);
  if (
    !/\.(png|jpe?g|webp|gif)$/i.test(decoded) ||
    /[\\:#?]/.test(decoded) ||
    Array.from(decoded).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    decoded.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(
      `图片必须为文章目录内的本地 PNG/JPEG/WebP/GIF：${relative}`,
    );
  let current = root;
  for (const segment of decoded.split('/')) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error('拒绝图片符号链接');
  }
  await plainFile(current);
  const bytes = await readFile(current);
  const extension = path.extname(decoded).toLowerCase();
  const valid =
    extension === '.png'
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : ['.jpg', '.jpeg'].includes(extension)
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : extension === '.webp'
          ? bytes.subarray(0, 4).toString() === 'RIFF' &&
            bytes.subarray(8, 12).toString() === 'WEBP'
          : /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  if (!valid) throw new Error('图片内容与扩展名不符');
  return decoded;
}
async function validateMedia(directory: string, value: BlogMedia) {
  for (const src of [
    value.src,
    value.srcDark,
    ...(value.variants ?? []).map((variant) => variant.src),
    value.preview?.src,
    ...(value.preview?.variants ?? []).map((variant) => variant.src),
  ])
    if (src) await localImage(directory, src);
}
interface PreparedArticle {
  meta: z.infer<typeof articleSchema>;
  body: string;
  directory: string;
  inspection: ReturnType<typeof inspectMarkdown>;
}
export async function readBlog(
  root: string,
  mode: BuildMode,
  today = new Date().toISOString().slice(0, 10),
) {
  if (
    mode.target === 'release' &&
    mode.blogSource === 'mock' &&
    !mode.publishExamples
  )
    throw new Error('正式构建禁止使用 Mock 博客');
  const preview =
    mode.blogSource === 'mock' ||
    (!mode.blogSource && mode.target !== 'release');
  const configPath = path.join(
    root,
    preview ? 'tests/fixtures/blog/config.json' : 'content/pages/blog.json',
  );
  await plainFile(configPath);
  const config = configSchema.parse(
    JSON.parse(await readFile(configPath, 'utf8')),
  );
  for (const values of [
    config.categories,
    config.tags,
    config.channels,
    config.sources,
  ])
    if (new Set(values.map((item) => item.id)).size !== values.length)
      throw new Error('配置标识重复');
  const sourceDir = path.join(
    root,
    preview ? 'tests/fixtures/blog/posts' : 'content/blog',
  );
  const entries = await readdir(sourceDir, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    },
  );
  if (entries.length && (await lstat(sourceDir)).isSymbolicLink())
    throw new Error('拒绝内容目录符号链接');
  const articles: PreparedArticle[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink())
      throw new Error('文章须使用独立目录');
    const directory = path.join(sourceDir, entry.name);
    const file = path.join(directory, 'index.md');
    await plainFile(file);
    const parsed = parseArticle(await readFile(file, 'utf8'));
    if (parsed.meta.draft || (!preview && parsed.meta.example)) continue;
    if (parsed.meta.id !== entry.name) throw new Error('文章 id 与目录名不符');
    if (!parsed.meta.publishedAt || parsed.meta.publishedAt > today)
      throw new Error('已发布文章需要有效且非未来的发布日期');
    if (
      parsed.meta.kind === 'internal' &&
      (!parsed.meta.slug || !parsed.body.trim())
    )
      throw new Error('站内文章需要 slug 和正文');
    if (
      parsed.meta.kind === 'external' &&
      (!parsed.meta.href || parsed.meta.slug || parsed.body.trim())
    )
      throw new Error('外部文章仅提供原文链接，不生成站内正文');
    if (parsed.meta.readingMinutes && !parsed.meta.readingTimeSource)
      throw new Error('阅读时长需要作者标注来源');
    for (const ref of parsed.meta.pullRequestRefs) {
      if (
        ref.href !== `https://github.com/${ref.repository}/pull/${ref.number}`
      )
        throw new Error('PR 引用地址与编号不符');
    }
    const inspection = inspectMarkdown(parsed.body);
    articles.push({ ...parsed, directory, inspection });
  }
  const ids = articles.map((article) => article.meta.id);
  const slugs = articles
    .filter((article) => article.meta.kind === 'internal')
    .map((article) => article.meta.slug);
  if (new Set(ids).size !== ids.length || new Set(slugs).size !== slugs.length)
    throw new Error('文章 id 或 slug 重复');
  if (config.featuredId && !ids.includes(config.featuredId))
    throw new Error('推荐文章不存在或未发布');
  for (const article of articles) {
    const { meta, inspection } = article;
    for (const src of inspection.images)
      await localImage(article.directory, src);
    if (meta.cover) await validateMedia(article.directory, meta.cover);
    if (
      meta.categoryId &&
      !config.categories.some((item) => item.id === meta.categoryId)
    )
      throw new Error('文章分类未定义');
    if (meta.tagIds.some((id) => !config.tags.some((item) => item.id === id)))
      throw new Error('文章标签未定义');
    if (meta.relatedIds.some((id) => id === meta.id || !ids.includes(id)))
      throw new Error('相关文章引用无效');
    for (const link of inspection.links) {
      if (https.safeParse(link).success) continue;
      const [target, fragment] = link.split('#');
      const targetArticle = target
        ? articles.find(
            (a) =>
              a.meta.kind === 'internal' &&
              (`/blog/${a.meta.slug}` === target ||
                path.resolve(article.directory, decodeURIComponent(target)) ===
                  path.join(a.directory, 'index.md')),
          )
        : article;
      if (
        targetArticle &&
        (!fragment ||
          targetArticle.inspection.anchors.has(decodeURIComponent(fragment)))
      )
        continue;
      if (['/', '/blog', '/docs'].includes(link)) continue;
      throw new Error(`文章链接或锚点无效：${link}`);
    }
  }
  for (const item of [...articles.map((a) => a.meta), ...config.channels])
    if (
      item.evidenceIds.some(
        (id) => !config.sources.some((source) => source.id === id),
      )
    )
      throw new Error('来源未定义');
  for (const item of config.channels)
    if (item.qr) await validateMedia(path.dirname(configPath), item.qr);
  return { articles, config, preview };
}
export async function prepareBlog(
  root: string,
  mode: BuildMode,
): Promise<BlogIndex> {
  const { articles, config, preview } = await readBlog(root, mode);
  const staging = path.join(root, '.generated/blog');
  const publicDir = path.join(root, '.generated/blog-public');
  for (const dir of [staging, publicDir]) {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
  }
  async function stageMedia(
    directory: string,
    ownerId: string,
    value: BlogMedia,
  ): Promise<BlogMedia> {
    async function copy(src: string) {
      const relative = await localImage(directory, src);
      const file = path.join(directory, relative);
      const hash = createHash('sha256')
        .update(await readFile(file))
        .digest('hex')
        .slice(0, 16);
      const target = `blog-media/${ownerId}/${hash}${path.extname(relative)}`;
      await mkdir(path.dirname(path.join(publicDir, target)), {
        recursive: true,
      });
      await copyFile(file, path.join(publicDir, target));
      return `/${target}`;
    }
    return {
      ...value,
      src: await copy(value.src),
      variants: value.variants
        ? await Promise.all(
            value.variants.map(async (variant) => ({
              ...variant,
              src: await copy(variant.src),
            })),
          )
        : undefined,
      srcDark: value.srcDark ? await copy(value.srcDark) : undefined,
      preview: value.preview
        ? {
            ...value.preview,
            src: await copy(value.preview.src),
            variants: value.preview.variants
              ? await Promise.all(
                  value.preview.variants.map(async (variant) => ({
                    ...variant,
                    src: await copy(variant.src),
                  })),
                )
              : undefined,
          }
        : undefined,
    };
  }
  const posts: BlogPost[] = [];
  for (const article of articles) {
    const { meta, body, directory, inspection } = article;
    const post: BlogPost = {
      id: meta.id,
      title: meta.title,
      summary: meta.summary,
      kind: meta.kind,
      href: meta.kind === 'internal' ? `/blog/${meta.slug}` : meta.href!,
      publishedAt: meta.publishedAt!,
      author: meta.author,
      categoryId: meta.categoryId,
      tagIds: meta.tagIds,
      technicalKeywords: meta.technicalKeywords,
      pullRequestRefs: meta.pullRequestRefs,
      readingMinutes: meta.readingMinutes,
      relatedIds: meta.relatedIds,
      evidenceIds: meta.evidenceIds,
      resources: meta.resources,
      cover: meta.cover
        ? await stageMedia(directory, meta.id, meta.cover)
        : undefined,
    };
    posts.push(post);
    if (meta.kind === 'external') continue;
    const target = path.join(staging, meta.id);
    await mkdir(target, { recursive: true });
    await writeFile(
      path.join(target, 'index.md'),
      `---\n${stringify({ title: meta.title, description: meta.summary, slug: meta.slug, date: meta.publishedAt })}---\n${body}`,
    );
    for (const src of new Set(inspection.images)) {
      const relative = await localImage(directory, src);
      await mkdir(path.dirname(path.join(target, relative)), {
        recursive: true,
      });
      await copyFile(
        path.join(directory, relative),
        path.join(target, relative),
      );
    }
  }
  const channels = await Promise.all(
    config.channels.map(async (item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      href: item.href,
      contactLabel: item.contactLabel,
      contactValue: item.contactValue,
      qr: item.qr
        ? await stageMedia(
            path.dirname(
              path.join(
                root,
                preview
                  ? 'tests/fixtures/blog/config.json'
                  : 'content/pages/blog.json',
              ),
            ),
            item.id,
            item.qr,
          )
        : undefined,
    })),
  );
  const index: BlogIndex = {
    posts,
    categories: config.categories,
    tags: config.tags,
    featuredId: config.featuredId,
    channels,
    sources: config.sources
      .filter(
        (source) =>
          articles.some((article) =>
            article.meta.evidenceIds.includes(source.id),
          ) ||
          config.channels.some((channel) =>
            channel.evidenceIds.includes(source.id),
          ),
      )
      .map(({ id, label, publicHref }) => ({
        id,
        label,
        publicHref,
      })),
    preview,
  };
  const json = JSON.stringify(index);
  if (gzipSync(json).length > 2 * 1024 * 1024)
    throw new Error('博客摘要 gzip 超过 2 MiB，需要修订索引方案');
  await writeFile(path.join(root, '.generated/blog-index.json'), json);
  await writeBlogManifest(root, mode, await inputFiles(root));
  return index;
}
