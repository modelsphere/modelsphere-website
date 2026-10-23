import React from 'react';
import ReadingDisclosure from '@site/src/components/ReadingDisclosure';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import DocItemContent from '@theme/DocItem/Content';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocItemFooter from '@theme/DocItem/Footer';
import DocBreadcrumbs from '@theme/DocBreadcrumbs';
import TOC from '@theme/TOC';
import type { Props } from '@theme/DocItem/Layout';
export default function DocItemLayout({ children }: Props) {
  const { toc, frontMatter } = useDoc();
  const show = toc.length > 0 && !frontMatter.hide_table_of_contents;
  const tocContent = <TOC toc={toc} minHeadingLevel={2} maxHeadingLevel={3} />;
  return (
    <div className="docs-reading-grid">
      <div className="docs-article">
        <DocBreadcrumbs />
        {show && (
          <ReadingDisclosure
            className="docs-mobile-toc"
            title="本页目录"
            desktopSelector=".docs-toc"
          >
            {tocContent}
          </ReadingDisclosure>
        )}
        <article>
          <DocItemContent>{children}</DocItemContent>
          <DocItemFooter />
        </article>
        <DocItemPaginator />
      </div>
      {show && (
        <aside className="docs-toc">
          <p className="toc-heading">本页目录</p>
          {tocContent}
        </aside>
      )}
    </div>
  );
}
