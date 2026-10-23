import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import Layout from '@theme/Layout';
import { usePluginData } from '@docusaurus/useGlobalData';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useHistory, useLocation } from '@docusaurus/router';
import { ArticleCard, Channels } from './components';
import {
  parseQuery,
  queryPosts,
  queryHref,
  popularTags,
  sortedPosts,
  pageNumbers,
} from './query';
import type { BlogIndex, BlogQuery } from './types';
import styles from './styles.module.css';
const initialQuery: BlogQuery = { q: '', category: '', tag: '', page: 1 };
export default function BlogList() {
  const index = usePluginData('docusaurus-plugin-content-blog') as BlogIndex;
  const browser = useIsBrowser();
  const location = useLocation();
  const history = useHistory();
  const parsed = useMemo(
    () => parseQuery(location.search, index),
    [location.search, index],
  );
  const query = browser ? parsed.query : initialQuery;
  const results = queryPosts(index, query);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pageAction = useRef(false);
  const queryFocus = useRef<{
    element: HTMLElement;
    top: number;
    left: number;
  } | null>(null);
  const composing = useRef(false);
  const noticeForHref = useRef<{ href: string; message: string } | null>(null);
  useEffect(() => {
    if (!browser) return;
    setDraft(parsed.query.q);
    const normalized = queryHref(parsed.query) + location.hash;
    if (parsed.notices.length)
      noticeForHref.current = {
        href: normalized,
        message: parsed.notices.join('；'),
      };
    setNotice(
      noticeForHref.current?.href === normalized
        ? noticeForHref.current.message
        : '',
    );
    if (noticeForHref.current?.href !== normalized)
      noticeForHref.current = null;
    if (normalized !== location.pathname + location.search + location.hash)
      history.replace(normalized);
    document.documentElement.removeAttribute('data-blog-query-pending');
    if (pageAction.current) {
      pageAction.current = false;
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'instant',
      });
      queryFocus.current = null;
    } else if (queryFocus.current) {
      const previous = queryFocus.current;
      const target = previous.element.isConnected
        ? previous.element
        : searchRef.current;
      queryFocus.current = null;
      target?.focus({ preventScroll: true });
      if (target)
        window.scrollTo({
          left: previous.left,
          top:
            window.scrollY + target.getBoundingClientRect().top - previous.top,
          behavior: 'instant',
        });
    }
  }, [
    browser,
    location.search,
    location.hash,
    location.pathname,
    parsed,
    history,
  ]);
  function commit(next: BlogQuery, paginate = false) {
    const normalized = parseQuery(queryHref(next).split('?')[1] ?? '', index);
    setDraft(normalized.query.q);
    setNotice(normalized.notices.join('；'));
    const href = queryHref(normalized.query) + location.hash;
    noticeForHref.current = normalized.notices.length
      ? { href, message: normalized.notices.join('；') }
      : null;
    if (href !== location.pathname + location.search + location.hash) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && !paginate)
        queryFocus.current = {
          element: active,
          top: active.getBoundingClientRect().top,
          left: window.scrollX,
        };
      pageAction.current = paginate;
      history.push(href);
    }
  }
  function pageClick(event: MouseEvent<HTMLAnchorElement>, page: number) {
    if (
      event.button ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    commit({ ...query, page }, true);
  }
  const posts = browser
    ? results.posts
    : sortedPosts(index.posts).filter((post) => post.id !== index.featuredId);
  const featured = browser
    ? results.featured
    : index.posts.find((post) => post.id === index.featuredId);
  const categories = index.categories
    .map((category) => ({
      ...category,
      count: index.posts.filter((post) => post.categoryId === category.id)
        .length,
    }))
    .filter((category) => category.count);
  return (
    <Layout
      title="博客洞见"
      description="ModelSphere 技术文章、版本动态与工程实践。"
    >
      <main
        id="main-content"
        tabIndex={-1}
        className={styles.blog}
        data-blog-enhanced={browser}
      >
        <h1 className="sr-only">博客洞见</h1>
        <div className={styles.breadcrumbBar}>
          <nav className={styles.container} aria-label="面包屑">
            <a href="/">首页</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">技术博客与动态</span>
          </nav>
        </div>
        {index.preview && (
          <p className={`${styles.container} ${styles.previewNote}`}>
            示例预览 ·
            以下文章仅用于验证博客排版与交互，不代表正式发布或实测结论。
          </p>
        )}
        <div data-blog-results>
          {featured && (
            <section
              id="featured"
              aria-label="推荐文章"
              className={`${styles.container} ${styles.featuredSection}`}
            >
              <ArticleCard post={featured} index={index} featured />
            </section>
          )}
        </div>
        {index.posts.length > 0 && (
          <div className={styles.filters}>
            <div className={styles.container}>
              {!browser && (
                <p className={styles.baselineNote}>
                  以下展示全部文章摘要；启用脚本后可搜索、筛选和分页。
                </p>
              )}
              {browser && (
                <>
                  <div className={styles.filterRow}>
                    <div
                      className={styles.categories}
                      role="group"
                      aria-label="文章分类"
                    >
                      {[
                        {
                          id: '',
                          label: '全部文章',
                          count: index.posts.length,
                        },
                        ...categories,
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={query.category === item.id}
                          onClick={() =>
                            commit({
                              ...query,
                              q: draft,
                              category: item.id,
                              page: 1,
                            })
                          }
                        >
                          {item.label}
                          <span>{item.count}</span>
                        </button>
                      ))}
                    </div>
                    <form
                      className={styles.search}
                      role="search"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!composing.current)
                          commit({ ...query, q: draft, page: 1 });
                      }}
                    >
                      <label htmlFor="blog-search">搜索文章</label>
                      <div className={styles.searchControls}>
                        <div className={styles.searchInput}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            aria-hidden="true"
                          >
                            <circle cx="10.5" cy="10.5" r="6.5" />
                            <path d="m16 16 4 4" />
                          </svg>
                          <input
                            ref={searchRef}
                            id="blog-search"
                            type="search"
                            value={draft}
                            placeholder="标题、作者、技术关键词或 PR 编号"
                            onChange={(event) => setDraft(event.target.value)}
                            onCompositionStart={() => {
                              composing.current = true;
                            }}
                            onCompositionEnd={() => {
                              composing.current = false;
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.key === 'Enter' &&
                                (composing.current ||
                                  event.nativeEvent.isComposing ||
                                  event.keyCode === 229)
                              )
                                event.preventDefault();
                            }}
                          />
                        </div>
                        {draft && (
                          <button
                            type="button"
                            aria-label="清空搜索"
                            onClick={() => {
                              commit({ ...query, q: '', page: 1 });
                              searchRef.current?.focus();
                            }}
                          >
                            清空
                          </button>
                        )}
                        <button className={styles.searchSubmit} type="submit">
                          搜索
                        </button>
                      </div>
                    </form>
                  </div>
                  {popularTags(index).length > 0 && (
                    <div
                      className={styles.tags}
                      role="group"
                      aria-label="热门标签"
                    >
                      <span>热门标签</span>
                      {popularTags(index).map((tag) => (
                        <button
                          type="button"
                          key={tag.id}
                          aria-pressed={query.tag === tag.id}
                          onClick={() =>
                            commit({
                              ...query,
                              q: draft,
                              tag: query.tag === tag.id ? '' : tag.id,
                              page: 1,
                            })
                          }
                        >
                          #{tag.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {(query.q || query.category || query.tag) && (
                    <button
                      type="button"
                      className={styles.clear}
                      onClick={() => {
                        commit(initialQuery);
                        searchRef.current?.focus();
                      }}
                    >
                      清除筛选
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <section
          id="posts"
          className={`${styles.container} ${styles.feed} ${index.channels.length ? styles.withChannels : ''}`}
        >
          <div className={styles.postColumn}>
            <div className={styles.resultsHeader}>
              <h2 ref={headingRef} tabIndex={-1}>
                文章列表
              </h2>
              <p role="status" aria-live="polite">
                {index.posts.length
                  ? results.total
                    ? `找到 ${results.total} 篇文章${browser ? `，第 ${results.page} / ${results.pages} 页` : ''}`
                    : ''
                  : ''}
              </p>
            </div>
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
            <div data-blog-results className={styles.postList}>
              {posts.map((post) => (
                <ArticleCard key={post.id} post={post} index={index} />
              ))}
              {!posts.length && (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon} aria-hidden="true">
                    ☷
                  </span>
                  <h3>
                    {!index.posts.length
                      ? '尚无公开文章'
                      : featured
                        ? '暂无其他文章'
                        : '未找到匹配内容'}
                  </h3>
                  <p>
                    {!index.posts.length
                      ? '技术文章与项目动态将在这里发布。'
                      : featured
                        ? '先从上方的推荐文章开始阅读。'
                        : '试试其他关键词，或清除筛选查看全部文章。'}
                  </p>
                  {!index.posts.length && (
                    <a href="https://github.com/modelsphere">
                      关注 ModelSphere 开源项目 ↗
                    </a>
                  )}
                </div>
              )}
            </div>
            {browser && results.pages > 1 && (
              <nav className={styles.pagination} aria-label="文章分页">
                {results.page > 1 ? (
                  <a
                    href={
                      queryHref({ ...query, page: results.page - 1 }) +
                      location.hash
                    }
                    onClick={(event) => pageClick(event, results.page - 1)}
                  >
                    上一页
                  </a>
                ) : (
                  <span aria-disabled="true">上一页</span>
                )}
                <span className={styles.mobilePage}>
                  {results.page} / {results.pages}
                </span>
                <div className={styles.pageNumbers}>
                  {pageNumbers(results.page, results.pages).map((page, i) =>
                    page === 'gap' ? (
                      <span key={`gap-${i}`}>…</span>
                    ) : (
                      <a
                        key={page}
                        href={queryHref({ ...query, page }) + location.hash}
                        aria-current={
                          page === results.page ? 'page' : undefined
                        }
                        onClick={(event) => pageClick(event, page)}
                      >
                        {page}
                      </a>
                    ),
                  )}
                </div>
                {results.page < results.pages ? (
                  <a
                    href={
                      queryHref({ ...query, page: results.page + 1 }) +
                      location.hash
                    }
                    onClick={(event) => pageClick(event, results.page + 1)}
                  >
                    下一页
                  </a>
                ) : (
                  <span aria-disabled="true">下一页</span>
                )}
              </nav>
            )}
          </div>
          <Channels index={index} />
        </section>
      </main>
    </Layout>
  );
}
