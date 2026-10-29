import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { RootContent } from 'mdast';
import type { SearchEntry, SearchKind } from '../../src/features/search/query';

export function markdownEntries(
  raw: string,
  page: {
    kind: SearchKind;
    title: string;
    href: string;
    tags?: string;
    summary?: string;
  },
): SearchEntry[] {
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .parse(body);
  const slugger = new GithubSlugger();
  const pageHref = page.href.replace(/\/+$/, '');
  const entries: SearchEntry[] = [];
  let heading = '';
  let anchor = '';
  let lines: string[] = [page.summary ?? ''];
  function flush() {
    entries.push({
      kind: page.kind,
      title: page.title,
      heading,
      href: pageHref + (anchor ? `#${encodeURIComponent(anchor)}` : ''),
      pageHref,
      tags: page.tags ?? '',
      text: lines.join(' ').replace(/\s+/g, ' ').trim(),
    });
    lines = [];
  }
  function read(node: RootContent) {
    if (node.type === 'heading') {
      flush();
      heading = toString(node);
      const explicitId = /\s*\{#([^}]+)\}$/.exec(heading);
      if (explicitId) heading = heading.slice(0, explicitId.index);
      anchor = explicitId?.[1] ?? slugger.slug(heading);
    } else if (node.type === 'definition' || node.type === 'html') {
      return;
    } else if ('children' in node && node.type === 'containerDirective') {
      node.children.forEach(read);
    } else {
      lines.push(toString(node));
    }
  }
  tree.children.forEach(read);
  flush();
  return entries;
}
