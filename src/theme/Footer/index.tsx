import { useSitePath } from '@site/src/lib/use-site-path';
import React from 'react';
import { HomeFooter } from '@site/src/components/HomeSections';
import { CommunityFooter } from '@site/src/features/community/components';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useLocation } from '@docusaurus/router';
import { useThemeConfig } from '@docusaurus/theme-common';
interface FooterItem {
  label: string;
  href?: string;
  to?: string;
}
const groups: { title: string; items: FooterItem[] }[] = [
  {
    title: '开源代码',
    items: [
      { label: 'GitHub 仓库', href: 'https://github.com/modelsphere' },
      {
        label: 'Model Catalog 模型库',
        to: '/models',
      },
    ],
  },
  {
    title: '社区与生态',
    items: [
      { label: '博客洞见', to: '/blog' },
      { label: '微信开发者群' },
      { label: 'ModelHubXC 信创模盒' },
    ],
  },
  {
    title: '开发者资源',
    items: [{ label: '技术文档', to: '/docs' }],
  },
  {
    title: '法律与开源',
    items: [
      { label: 'Apache 2.0 License' },
      { label: 'Security Advisory' },
      { label: 'Roadmap 演进图' },
      { label: 'Code of Conduct' },
    ],
  },
];
function FooterItemView({ item }: { item: FooterItem }) {
  return item.to ? (
    <Link to={item.to}>{item.label}</Link>
  ) : item.href ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer">
      {item.label}
      <span className="sr-only">（新窗口打开）</span>
    </a>
  ) : (
    <span className="footer-pending" aria-disabled="true" title="即将开放">
      {item.label}
      <span className="sr-only">（即将开放）</span>
    </span>
  );
}
function FooterWordmark({ symbol = false }: { symbol?: boolean }) {
  const src = useBaseUrl('/brand/modelsphere-symbol.png');
  return (
    <Link className="footer-wordmark" to="/" aria-label="模域 ModelSphere 首页">
      {symbol && <img src={src} width="220" height="177" alt="" />}
      <span>模域 ModelSphere</span>
    </Link>
  );
}
function FooterIcon({ kind }: { kind: 'memory' | 'engine' | 'guide' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'memory' ? (
        <>
          <rect x="6" y="6" width="12" height="12" rx="1" />
          <path d="M9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4Z" />
        </>
      ) : kind === 'engine' ? (
        <>
          <path d="M4 17a9 9 0 1 1 16 0H4Z" />
          <path d="m12 13 5-5M7 9l1 1" />
        </>
      ) : (
        <>
          <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
    </svg>
  );
}
function DocsFooter({ copyright }: { copyright?: string }) {
  return (
    <footer className="footer site-footer docs-footer">
      <div className="docs-footer-main footer-container">
        <div className="docs-footer-about">
          <div className="docs-footer-brandline">
            <FooterWordmark />
            <span className="footer-docs-badge">DEVELOPER DOCS</span>
          </div>
          <p>面向高通量低延迟的生产级分布式大语言模型与多模态推理集群引擎。</p>
        </div>
        <div className="docs-footer-topics">
          <span className="footer-topic footer-topic-memory">
            <FooterIcon kind="memory" />
            KV-Cache 与内存管理
          </span>
          <span className="footer-topic footer-topic-engine">
            <FooterIcon kind="engine" />
            Inference Engine
          </span>
          <span className="footer-topic footer-topic-guide">
            <FooterIcon kind="guide" />
            Deployment Guide
          </span>
        </div>
      </div>
      <div className="docs-footer-bottom">
        <div className="footer-container docs-footer-bottom-inner">
          <span>{copyright}</span>
          <nav className="docs-footer-links" aria-label="文档补充资源">
            {['ARCH SPEC', 'METRICS HARNESS', 'DEPLOYMENT RUNBOOK'].map(
              (label) => (
                <FooterItemView key={label} item={{ label }} />
              ),
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
function PortalFooter({ copyright }: { copyright?: string }) {
  return (
    <footer className="footer site-footer portal-footer">
      <div className="footer-container portal-footer-inner">
        <div className="portal-footer-grid">
          <div className="portal-footer-about">
            <FooterWordmark symbol />
            <p>让大模型推理从实验室能跑，到生产好用。</p>
            <div className="portal-footer-badges">
              <span className="footer-project-badge">
                <span aria-hidden="true" />
                Open Source Community
              </span>
              <span className="footer-neutral-badge">Cloud Native</span>
            </div>
          </div>
          {groups.map((group) => (
            <nav
              className="footer-group"
              key={group.title}
              aria-label={group.title}
            >
              <h2>{group.title}</h2>
              <ul>
                {group.items.map((item) => (
                  <li key={item.label}>
                    <FooterItemView item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="portal-footer-bottom">
          <span>{copyright}</span>
          <div>
            <span>OPEN SOURCE</span>
            <span>COMMUNITY DRIVEN</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default function Footer() {
  const { footer } = useThemeConfig();
  const { pathname: publicPathname } = useLocation();
  const { localHref } = useSitePath();
  const pathname = localHref(publicPathname);
  if (!footer) return null;
  if (pathname === '/community' || pathname === '/community/')
    return <CommunityFooter />;
  if (pathname === '/') return <HomeFooter />;
  return pathname === '/docs' || pathname.startsWith('/docs/') ? (
    <DocsFooter copyright={footer.copyright} />
  ) : (
    <PortalFooter copyright={footer.copyright} />
  );
}
