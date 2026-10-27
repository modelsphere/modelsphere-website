import { useSitePath } from '@site/src/lib/use-site-path';
import React, { useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrandLogo from '@site/src/components/BrandLogo';
import ThemeModeSwitch from '@site/src/components/ThemeModeSwitch';
import SiteSearch from '@site/src/features/search/SiteSearch';
const items = [
  { label: '首页', href: '/' },
  { label: '模型目录', href: '/models' },
  { label: '文档指南', href: '/docs' },
  { label: '博客', href: '/blog' },
  { label: '社区生态', href: '/community' },
];
export default function Navbar() {
  const { pathname: publicPathname } = useLocation();
  const { localHref } = useSitePath();
  const pathname = localHref(publicPathname);
  const { siteConfig } = useDocusaurusContext();
  const mock = Boolean(siteConfig.customFields?.docsMock);
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const header = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname && menu.current)
      menu.current.open = false;
    previousPath.current = pathname;
  }, [pathname]);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const sync = () =>
      document.documentElement.style.setProperty(
        '--header-height',
        `${el.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    const mq = window.matchMedia('(min-width: 1280px)');
    let lastFocused: Element | null = null;
    const rememberFocus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target !== document.body)
        lastFocused = el.contains(event.target) ? event.target : null;
    };
    const change = () => {
      const active =
        document.activeElement === document.body
          ? lastFocused
          : document.activeElement;
      if (mq.matches && menu.current?.contains(active))
        el.querySelector<HTMLAnchorElement>('.site-brand')?.focus({
          preventScroll: true,
        });
      else if (
        !mq.matches &&
        el.querySelector('.desktop-nav')?.contains(active)
      )
        menu.current?.querySelector('summary')?.focus({ preventScroll: true });
      if (menu.current) menu.current.open = false;
    };
    document.addEventListener('focusin', rememberFocus);
    mq.addEventListener('change', change);
    return () => {
      observer.disconnect();
      mq.removeEventListener('change', change);
      document.removeEventListener('focusin', rememberFocus);
    };
  }, [pathname]);
  const navItems = items.map((item) =>
    item.href ? (
      <Link
        key={item.label}
        to={item.href}
        className="site-nav-link"
        aria-current={
          (
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          )
            ? 'page'
            : undefined
        }
      >
        {item.label}
      </Link>
    ) : (
      <span
        key={item.label}
        className="site-nav-link nav-pending"
        aria-disabled="true"
        title={`${item.label}即将开放`}
      >
        {item.label}
        <span className="sr-only">（即将开放）</span>
      </span>
    ),
  );
  const quickstart = (
    <Link
      className="header-primary-link"
      to={mock ? '/docs/quickstart' : '/docs'}
    >
      {mock ? '快速开始' : '文档指南'}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </svg>
    </Link>
  );
  return (
    <header ref={header} className="navbar site-header">
      <div className="header-inner">
        <div className="header-brand-group">
          <Link to="/" className="site-brand" aria-label="模域 ModelSphere">
            <BrandLogo />
          </Link>
          <span className="header-badge">
            <span aria-hidden="true" />
            {isDocs ? (mock ? '文档预览' : '开发者文档') : '开源推理平台'}
          </span>
        </div>
        <nav className="desktop-nav" aria-label="主导航">
          {navItems}
        </nav>
        <div className="header-actions">
          <SiteSearch />
          <a
            className="header-github"
            href="https://github.com/modelsphere"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ModelSphere GitHub（新窗口打开）"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
            </svg>
            <span>GitHub</span>
          </a>
          <div className="desktop-quickstart">{quickstart}</div>
          <ThemeModeSwitch />
        </div>
        <details
          ref={menu}
          className="mobile-menu"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menu.current) {
              event.preventDefault();
              menu.current.open = false;
              menu.current.querySelector('summary')?.focus();
            }
          }}
        >
          <summary aria-label="导航菜单" title="导航菜单">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path className="menu-lines" d="M4 6h16M4 12h16M4 18h16" />
              <path className="menu-close" d="m6 6 12 12M6 18 18 6" />
            </svg>
          </summary>
          <nav aria-label="移动主导航">
            {navItems}
            <div className="mobile-menu-actions">
              {quickstart}
              <a
                className="header-github"
                href="https://github.com/modelsphere"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
                </svg>
                <span>GitHub</span>
                <span className="sr-only">（新窗口打开）</span>
              </a>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
