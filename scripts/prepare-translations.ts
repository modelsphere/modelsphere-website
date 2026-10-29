import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import GithubSlugger from 'github-slugger';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';
import type { BlogIndex } from '../src/features/blog/types';
import { localizeContent } from '../src/lib/content-i18n';

function markdown(raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('Translation requires Markdown frontmatter');
  return { meta: parse(match[1]) as Record<string, unknown>, body: match[2] };
}
// Keep section URLs valid when readers switch between translated articles.
function preserveHeadingIds(source: string, translated: string) {
  const headings = (raw: string) =>
    unified()
      .use(remarkParse)
      .parse(raw)
      .children.filter((node) => node.type === 'heading');
  const slugger = new GithubSlugger();
  const ids = headings(source).map((node) => {
    const text = toString(node);
    return /\s*\{#([^}]+)\}$/.exec(text)?.[1] ?? slugger.slug(text);
  });
  let output = translated;
  const nodes = headings(translated);
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index];
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined || !ids[index]) continue;
    const heading = translated.slice(start, end).replace(/\s*\{#[^}]+\}$/, '');
    output =
      output.slice(0, start) +
      `${heading} {#${ids[index]}}` +
      output.slice(end);
  }
  return output;
}
async function translation(root: string, kind: string, name: string) {
  try {
    return markdown(
      await readFile(path.join(root, 'i18n/en', kind, name), 'utf8'),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Only stage translations for content that passed the publication filters. */
export async function prepareTranslations(root: string) {
  const output = path.join(root, '.generated/locales/en');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(
    path.join(root, 'i18n/en/code.json'),
    path.join(output, 'code.json'),
  );
  const docsOutput = path.join(
    output,
    'docusaurus-plugin-content-docs/current',
  );
  await cp(path.join(root, '.generated/docs'), docsOutput, { recursive: true });
  async function docs(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await docs(file);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      const source = markdown(await readFile(file, 'utf8'));
      const relative = path.relative(docsOutput, file);
      const translated = await translation(
        root,
        'docs',
        source.meta.slug === '/' ? 'index.md' : relative,
      );
      if (!translated) continue;
      // Fixtures use overview.md; published content uses index.md.
      const overview = (await readdir(docsOutput)).includes('overview.md')
        ? 'overview.md'
        : 'index.md';
      const body = preserveHeadingIds(source.body, translated.body).replaceAll(
        '](index.md)',
        `](${overview})`,
      );
      await writeFile(
        file,
        `---\n${stringify({ ...source.meta, title: translated.meta.title ?? source.meta.title, description: translated.meta.description ?? source.meta.description })}---\n${body}`,
      );
    }
  }
  await docs(docsOutput);
  await cp(
    path.join(root, 'i18n/en/docs-sidebar.json'),
    path.join(output, 'docusaurus-plugin-content-docs/current.json'),
  );
  const index: BlogIndex = JSON.parse(
    await readFile(path.join(root, '.generated/blog-index.json'), 'utf8'),
  );
  const localized = localizeContent(index, 'en');
  const blogOutput = path.join(output, 'docusaurus-plugin-content-blog');
  await cp(path.join(root, '.generated/blog'), blogOutput, { recursive: true });
  for (const post of localized.posts) {
    const translated = await translation(root, 'blog', `${post.id}.md`);
    if (!translated) continue;
    if (
      typeof translated.meta.title !== 'string' ||
      typeof translated.meta.summary !== 'string'
    )
      throw new Error(
        `English blog translation requires title and summary: ${post.id}`,
      );
    post.title = translated.meta.title;
    post.summary = translated.meta.summary;
    if (post.cover) {
      post.cover.alt = `${post.title} — illustrative cover, not measured data`;
      if (post.cover.preview) post.cover.preview.alt = post.cover.alt;
    }
    if (post.kind !== 'internal') continue;
    const file = path.join(blogOutput, post.id, 'index.md');
    const source = markdown(await readFile(file, 'utf8'));
    await writeFile(
      file,
      `---\n${stringify({ ...source.meta, title: post.title, description: post.summary })}---\n${preserveHeadingIds(source.body, translated.body)}`,
    );
  }
  await writeFile(
    path.join(root, '.generated/blog-index.en.json'),
    JSON.stringify(localized),
  );
}
