import { translate } from '@docusaurus/Translate';
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
            <nav
              aria-label={translate({
                id: 'site.6bd98e9b7b5f',
                message: '文档导航',
              })}
            >
              <p className="sidebar-kicker">
                {translate({ id: 'site.efc1558e60b2', message: '开发者文档' })}
              </p>
              {items}
            </nav>
            <div className="sidebar-note">
              {translate({ id: 'site.e6e8c31c1bd9', message: '从概念到实践' })}
              <br />
              <span>
                {translate({
                  id: 'site.e4f94fa189ea',
                  message: '按章节逐步阅读',
                })}
              </span>
            </div>
          </aside>
          <ReadingDisclosure
            className="docs-mobile-nav"
            title={translate({ id: 'site.6bd98e9b7b5f', message: '文档导航' })}
            desktopSelector=".docs-sidebar"
          >
            <nav
              aria-label={translate({
                id: 'site.2b13a97ab17c',
                message: '移动文档导航',
              })}
            >
              {items}
            </nav>
          </ReadingDisclosure>
        </>
      )}
      <main id="main-content" className="docs-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
