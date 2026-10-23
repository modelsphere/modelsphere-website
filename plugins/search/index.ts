import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import type { LoadedContent } from '@docusaurus/plugin-content-docs';
import type { BlogContent } from '@docusaurus/plugin-content-blog';
import type { BlogIndex } from '../../src/features/blog/types';
import type { SearchIndex } from '../../src/features/search/query';
import { markdownEntries } from './content';

export default function searchPlugin(context: LoadContext): Plugin {
  return {
    name: 'modelsphere-search',
    async allContentLoaded({ allContent, actions }) {
      const index: SearchIndex = { version: 1, entries: [] };
      const docs = allContent['docusaurus-plugin-content-docs']?.default as
        | LoadedContent
        | undefined;
      const blog = allContent['docusaurus-plugin-content-blog']?.default as
        | BlogContent
        | undefined;
      const summaries: BlogIndex = JSON.parse(
        await readFile(
          path.join(context.siteDir, '.generated/blog-index.json'),
          'utf8',
        ),
      );
      const publicPosts = new Map(
        summaries.posts
          .filter((post) => post.kind === 'internal')
          .map((post) => [post.href, post]),
      );
      const tags = new Map(summaries.tags.map((tag) => [tag.id, tag.label]));
      async function source(alias: string) {
        if (!alias.startsWith('@site/.generated/'))
          throw new Error(`搜索只接收已暂存的公开内容：${alias}`);
        return readFile(
          path.join(context.siteDir, alias.slice('@site/'.length)),
          'utf8',
        );
      }
      for (const version of docs?.loadedVersions ?? [])
        for (const doc of version.docs) {
          if (doc.draft || doc.unlisted) continue;
          index.entries.push(
            ...markdownEntries(await source(doc.source), {
              kind: 'docs',
              title: doc.title,
              href: doc.permalink,
              summary: doc.description,
            }),
          );
        }
      for (const post of blog?.blogPosts ?? []) {
        const summary = publicPosts.get(post.metadata.permalink);
        if (
          !summary ||
          post.metadata.unlisted ||
          post.metadata.frontMatter?.draft
        )
          continue;
        index.entries.push(
          ...markdownEntries(await source(post.metadata.source), {
            kind: 'blog',
            title: post.metadata.title,
            href: post.metadata.permalink,
            summary: summary.summary,
            tags: summary.tagIds.map((id) => tags.get(id) ?? '').join(' '),
          }),
        );
      }
      const json = JSON.stringify(index);
      const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
      const file = `search-index.${hash}.json`;
      const directory = path.join(context.siteDir, '.generated/search-public');
      await rm(directory, { recursive: true, force: true });
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, file), json);
      actions.setGlobalData({ indexUrl: `${context.baseUrl}${file}` });
    },
  };
}
