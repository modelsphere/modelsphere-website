import React from 'react';
import ReadingDisclosure from '@site/src/components/ReadingDisclosure';
import { useDocsSidebar } from '@docusaurus/plugin-content-docs/client';
import { useLocation } from '@docusaurus/router';
import DocSidebarItems from '@theme/DocSidebarItems';
import type { Props } from '@theme/DocRoot/Layout';
export default function DocRootLayout({ children }: Props) {
  const sidebar = useDocsSidebar();
  const { pathname } = useLocation();
  const items = sidebar ? (
    <ul className="menu__list">
      <DocSidebarItems items={sidebar.items} activePath={pathname} level={1} />
    </ul>
  ) : null;
  return (
    <div className="docs-shell">
      {sidebar && (
        <>
          <aside className="docs-sidebar">
            <nav aria-label="文档导航">
              <p className="sidebar-kicker">开发者文档</p>
              {items}
            </nav>
            <div className="sidebar-note">
              从概念到实践
              <br />
              <span>按章节逐步阅读</span>
            </div>
          </aside>
          <ReadingDisclosure
            className="docs-mobile-nav"
            title="文档导航"
            desktopSelector=".docs-sidebar"
          >
            <nav aria-label="移动文档导航">{items}</nav>
          </ReadingDisclosure>
        </>
      )}
      <main id="main-content" className="docs-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
