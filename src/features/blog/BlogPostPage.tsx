import { useSitePath } from '@site/src/lib/use-site-path';
import React, { useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import MDXContent from '@theme/MDXContent';
import TOC from '@theme/TOC';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { usePluginData } from '@docusaurus/useGlobalData';
import { useLocation } from '@docusaurus/router';
import ReadingDisclosure from '@site/src/components/ReadingDisclosure';
import type { Props } from '@theme/BlogPostPage';
import type { BlogIndex } from './types';
import { Cover, PostMeta } from './components';
import styles from './styles.module.css';
export default function BlogPostPage({ content: Content }: Props) {
  const { siteHref, localHref } = useSitePath();
  const index = usePluginData('docusaurus-plugin-content-blog') as BlogIndex;
  const location = useLocation();
  const { siteConfig } = useDocusaurusContext();
  const post = index.posts.find(
    (post) => post.href === localHref(Content.metadata.permalink),
  );
  const [copy, setCopy] = useState<'idle' | 'copying' | 'success' | 'error'>(
    'idle',
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const readingRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    generation.current += 1;
    setCopy('idle');
    return () => {
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [location.pathname, location.hash]);
  useEffect(() => {
    const root = readingRoot.current;
    if (!root) return;
    const syncToc = () => {
      root
        .querySelectorAll<HTMLAnchorElement>('.table-of-contents__link')
        .forEach((link) => {
          if (link.classList.contains('table-of-contents__link--active'))
            link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
    };
    const observed = new WeakSet<Element>();
    const syncRegions = () =>
      root.querySelectorAll<HTMLElement>('pre,table').forEach((region) => {
        if (!observed.has(region)) {
          observed.add(region);
          resize.observe(region);
        }
        const overflow = region.scrollWidth > region.clientWidth + 1;
        if (overflow) {
          region.tabIndex = 0;
          region.setAttribute('role', 'region');
          region.setAttribute(
            'aria-label',
            region.tagName === 'PRE'
              ? '代码，可横向滚动查看'
              : '表格，可横向滚动查看',
          );
        } else {
          region.removeAttribute('tabindex');
          region.removeAttribute('role');
          region.removeAttribute('aria-label');
        }
      });
    const resize = new ResizeObserver(syncRegions);
    const observer = new MutationObserver(() => {
      syncToc();
      syncRegions();
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    resize.observe(root);
    syncToc();
    syncRegions();
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [location.pathname]);
  if (!post) throw new Error('博客详情与摘要索引不一致');
  const sources = index.sources.filter((source) =>
    post.evidenceIds.includes(source.id),
  );
  const related = post.relatedIds.map(
    (id) => index.posts.find((other) => other.id === id)!,
  );
  const toc = <TOC toc={Content.toc} minHeadingLevel={2} maxHeadingLevel={4} />;
  const hasToc = Content.toc.length > 0;
  const hasResources = post.resources.length > 0;
  const canonical = `${siteConfig.url}${siteHref(post.href)}`;
  async function copyLink() {
    const current = generation.current;
    setCopy('copying');
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(canonical + location.hash);
      if (generation.current !== current) return;
      setCopy('success');
      timer.current = setTimeout(() => setCopy('idle'), 2000);
    } catch {
      if (generation.current === current) setCopy('error');
    }
  }
  const resources = (
    <>
      <h2>关联资源</h2>
      <ul>
        {post.resources.map((resource) => (
          <li key={resource.href}>
            <a href={resource.href}>{resource.label} ↗</a>
          </li>
        ))}
      </ul>
    </>
  );
  return (
    <Layout title={post.title} description={post.summary}>
      <Head>
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publishedAt} />
      </Head>
      <main id="main-content" tabIndex={-1} className={styles.blog}>
        <div className={styles.breadcrumbBar}>
          <nav className={styles.container} aria-label="面包屑">
            <a href={siteHref('/')}>首页</a>
            <span aria-hidden="true">/</span>
            <a href={siteHref('/blog')}>博客洞见</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">文章正文</span>
          </nav>
        </div>
        {index.preview && (
          <p className={`${styles.container} ${styles.previewNote}`}>
            示例预览 · 本文用于验证博客阅读体验，不代表正式发布或实测结论。
          </p>
        )}
        <div
          ref={readingRoot}
          className={`${styles.container} ${styles.readingGrid}`}
          data-toc={hasToc}
          data-resources={hasResources}
        >
          {hasToc && (
            <aside className={styles.desktopToc}>
              <nav aria-label="文章章节目录">
                <p>本页目录</p>
                {toc}
              </nav>
            </aside>
          )}
          <div className={styles.readingColumn}>
            <a href={siteHref('/blog')} className={styles.back}>
              ← 返回博客
            </a>
            <article>
              <header className={styles.articleHeader}>
                {post.categoryId && (
                  <span className={styles.categoryBadge}>
                    {
                      index.categories.find(
                        (item) => item.id === post.categoryId,
                      )?.label
                    }
                  </span>
                )}
                <h1>{post.title}</h1>
                <p className={styles.lead}>{post.summary}</p>
                <PostMeta post={post} />
                <div className={styles.articleTags}>
                  {post.tagIds.map((id) => (
                    <a
                      key={id}
                      href={siteHref(`/blog?tag=${encodeURIComponent(id)}`)}
                    >
                      #{index.tags.find((tag) => tag.id === id)?.label}
                    </a>
                  ))}
                </div>
              </header>
              {hasToc && (
                <ReadingDisclosure
                  className={styles.mobileToc}
                  title="本页目录"
                  desktopSelector={`.${styles.desktopToc}`}
                >
                  {toc}
                </ReadingDisclosure>
              )}
              {post.cover && <Cover media={post.cover} full />}
              <div className={`markdown ${styles.prose}`}>
                <MDXContent>
                  <Content />
                </MDXContent>
              </div>
              {sources.length > 0 && (
                <section className={styles.sources} aria-label="文章来源">
                  <h2>来源与延伸阅读</h2>
                  <ul>
                    {sources.map((source) => (
                      <li key={source.id}>
                        <a href={source.publicHref}>{source.label} ↗</a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
            <div className={`${styles.share} js-control`}>
              <button
                type="button"
                className={styles.copyLink}
                disabled={copy === 'copying'}
                onClick={copyLink}
              >
                {copy === 'success'
                  ? '已复制链接'
                  : copy === 'copying'
                    ? '正在复制'
                    : '复制文章链接'}
              </button>
              <span role="status">
                {copy === 'error'
                  ? '复制失败，请手动复制地址栏链接'
                  : copy === 'success'
                    ? '文章链接已复制'
                    : ''}
              </span>
            </div>
            {hasResources && (
              <aside className={styles.mobileResources}>{resources}</aside>
            )}
            {related.length > 0 && (
              <section className={styles.related} aria-label="相关文章">
                <h2>继续阅读</h2>
                <div>
                  {related.map((other) => (
                    <article key={other.id}>
                      {other.cover && (
                        <a
                          href={siteHref(other.href)}
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <Cover media={other.cover} />
                        </a>
                      )}
                      <PostMeta post={other} />
                      <h3>
                        <a href={siteHref(other.href)}>{other.title}</a>
                      </h3>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
          {hasResources && (
            <aside className={styles.desktopResources}>{resources}</aside>
          )}
        </div>
      </main>
    </Layout>
  );
}
