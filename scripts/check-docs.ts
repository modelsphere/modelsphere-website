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
import { resolveBuildMode } from '../src/lib/build-mode';
export const mockFiles = ['overview.md', 'quickstart.md'];
const metaSchema = z
  .object({
    id: z.string().regex(/^example-[a-z0-9-]+$/),
    title: z.string().min(1),
    slug: z.enum(['/', '/quickstart']),
    sidebar_position: z.number().int().positive(),
    description: z.string().min(1),
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
      if (node.depth === 1)
        throw new Error(`${file}: 正文从 h2 开始，禁止重复 h1`);
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
      if (decoded.includes('/') || decoded === '..')
        throw new Error('链接越过文档目录');
      const target = decoded ? docs.find((d) => d.file === decoded) : doc;
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
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = resolveBuildMode(process.env);
  if (mode.source === 'mock')
    console.log(`通过：${(await readMockDocs(process.cwd())).length} 篇文档`);
  else console.log('none 模式：不读取 Mock 内容');
}
