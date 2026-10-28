import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root } from 'mdast';
import { resolveBuildMode, type BuildMode } from '../src/lib/build-mode';
export const mockFiles = ['overview.md', 'quickstart.md'];
const metaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    slug: z
      .string()
      .regex(
        /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/,
      ),
    sidebar_position: z.number().int().positive(),
    description: z.string().min(1),
    draft: z.boolean().optional(),
  })
  .strict();
export interface ParsedDoc {
  file: string;
  raw: string;
  body: string;
  meta: z.infer<typeof metaSchema>;
  anchors: Set<string>;
  links: string[];
}
export function parseDoc(file: string, raw: string): ParsedDoc {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${file}: 缺少 YAML 元数据`);
  const yaml = parseDocument(match[1], { uniqueKeys: true });
  if (yaml.errors.length) throw new Error(`${file}: ${yaml.errors[0].message}`);
  const meta = metaSchema.parse(yaml.toJS({ maxAliasCount: 0 }));
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkMdx)
    .parse(match[2]) as Root;
  const anchors = new Set<string>();
  const slugger = new GithubSlugger();
  const links: string[] = [];
  visit(tree, (node) => {
    if (node.type === 'html' || node.type.startsWith('mdx'))
      throw new Error(`${file}: 不允许 HTML、JSX、import 或执行表达式`);
    if (node.type === 'heading') {
      if (node.depth < 2 || node.depth > 4)
        throw new Error(`${file}: 正文仅允许 h2–h4，禁止重复 h1`);
      anchors.add(slugger.slug(toString(node)));
    }
    if (node.type === 'link' || node.type === 'definition')
      links.push(node.url);
    if (node.type === 'image' || node.type === 'imageReference')
      throw new Error(`${file}: 本轮文档不接收图片`);
    if (
      node.type === 'containerDirective' &&
      (!['note', 'info', 'warning'].includes(node.name) ||
        Object.keys(node.attributes ?? {}).length > 0)
    )
      throw new Error(`${file}: 未允许的提示块`);
    if (node.type === 'leafDirective' || node.type === 'textDirective')
      throw new Error(`${file}: 不允许自定义指令`);
  });
  return { file, raw, body: match[2], meta, anchors, links };
}
export function validateCollection(docs: ParsedDoc[]): void {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const doc of docs) {
    if (ids.has(doc.meta.id) || slugs.has(doc.meta.slug))
      throw new Error('重复文档 id 或 slug');
    ids.add(doc.meta.id);
    slugs.add(doc.meta.slug);
    for (const url of doc.links) {
      if (/^https:\/\//i.test(url)) {
        const parsed = new URL(url);
        if (parsed.username || parsed.password)
          throw new Error('链接不能携带凭据');
        continue;
      }
      if (
        /^[a-z][\w+.-]*:/i.test(url) ||
        url.startsWith('/') ||
        url.includes('\\') ||
        url.includes('?')
      )
        throw new Error(`${doc.file}: 非法链接 ${url}`);
      const [name, fragment] = url.split('#');
      const decoded = decodeURIComponent(name);
      if (decoded.startsWith('/') || decoded.includes('\\'))
        throw new Error('链接越过文档目录');
      const destination = path.posix.normalize(
        path.posix.join(path.posix.dirname(doc.file), decoded),
      );
      if (destination === '..' || destination.startsWith('../'))
        throw new Error('链接越过文档目录');
      const target = decoded ? docs.find((d) => d.file === destination) : doc;
      if (!target) throw new Error(`${doc.file}: 文档链接不存在 ${url}`);
      if (fragment && !target.anchors.has(decodeURIComponent(fragment)))
        throw new Error(`${doc.file}: 锚点不存在 ${url}`);
    }
  }
}
export async function readMockDocs(root: string): Promise<ParsedDoc[]> {
  const dir = path.join(root, 'tests/fixtures/docs');
  const entries = await readdir(dir);
  if (entries.sort().join(',') !== [...mockFiles].sort().join(','))
    throw new Error('Mock 目录只允许两篇约定文档');
  if ((await lstat(dir)).isSymbolicLink()) throw new Error('拒绝符号链接目录');
  const docs: ParsedDoc[] = [];
  for (const file of mockFiles) {
    const p = path.join(dir, file);
    if (!(await lstat(p)).isFile()) throw new Error('拒绝符号链接或非文件');
    docs.push(parseDoc(file, await readFile(p, 'utf8')));
  }
  validateCollection(docs);
  if (
    docs[0].meta.id !== 'example-overview' ||
    docs[0].meta.slug !== '/' ||
    docs[1].meta.id !== 'example-quickstart' ||
    docs[1].meta.slug !== '/quickstart'
  )
    throw new Error('Mock 文档身份或路由不符合契约');
  return docs;
}
export async function readContentDocs(root: string): Promise<ParsedDoc[]> {
  if (!(await lstat(path.join(root, 'content'))).isDirectory())
    throw new Error('拒绝文档源父目录符号链接或非目录');
  const directory = path.join(root, 'content/docs');
  const docs: ParsedDoc[] = [];
  async function read(relative: string): Promise<void> {
    const absolute = path.join(directory, relative);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) throw new Error('拒绝文档符号链接');
    if (info.isDirectory()) {
      if (
        relative &&
        !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(
          relative,
        )
      )
        throw new Error(`文档目录须使用小写英文、数字和连字符：${relative}`);
      for (const name of (await readdir(absolute)).sort())
        await read(path.posix.join(relative, name));
      return;
    }
    if (
      !info.isFile() ||
      !/^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(
        relative,
      )
    )
      throw new Error(`正式文档只接收小写命名的 Markdown 文件：${relative}`);
    const doc = parseDoc(relative, await readFile(absolute, 'utf8'));
    if (!doc.meta.draft) {
      if (!doc.body.trim()) throw new Error(`${relative}: 正文不可为空`);
      docs.push(doc);
    }
  }
  await read('');
  validateCollection(docs);
  if (docs.filter((doc) => doc.meta.slug === '/').length !== 1)
    throw new Error('正式文档必须有且只有一篇已发布的首页（slug: /）');
  return docs;
}
export async function readDocumentation(
  root: string,
  source: BuildMode['source'],
): Promise<ParsedDoc[]> {
  if (source === 'content') return readContentDocs(root);
  if (source === 'mock') return readMockDocs(root);
  return [];
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = resolveBuildMode({
    ...process.env,
    SITE_BUILD_TARGET: process.env.SITE_BUILD_TARGET ?? 'local',
    DOCS_SOURCE_MODE: process.env.DOCS_SOURCE_MODE ?? 'content',
    SITE_ORIGIN: process.env.SITE_ORIGIN ?? 'http://localhost:3000',
  });
  readDocumentation(process.cwd(), mode.source)
    .then((docs) => {
      console.log(`通过：${docs.length} 篇文档（${mode.source}）`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
