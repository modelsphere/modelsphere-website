import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {
  highlightParts,
  isSearchIndex,
  searchIndex,
  type SearchIndex,
  type SearchScope,
} from './query';
import styles from './styles.module.css';

let cachedIndex: { url: string; index: SearchIndex } | undefined;
function Highlight({ text, query }: { text: string; query: string }) {
  return highlightParts(text, query).map((part, index) =>
    part.match ? <mark key={index}>{part.text}</mark> : part.text,
  );
}
function SearchDialog({
  url,
  close,
}: {
  url: string;
  close: (restoreFocus?: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [index, setIndex] = useState<SearchIndex>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    input.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    if (cachedIndex?.url === url) {
      setIndex(cachedIndex.index);
      return;
    }
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setError(false);
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('搜索索引加载失败');
        const value: unknown = await response.json();
        if (!isSearchIndex(value)) throw new Error('搜索索引格式无效');
        if (!disposed) {
          cachedIndex = { url, index: value };
          setIndex(value);
        }
      })
      .catch(() => {
        if (!disposed) setError(true);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [url, attempt]);
  const results = useMemo(
    () => (index ? searchIndex(index, query, scope) : []),
    [index, query, scope],
  );
  const status = error
    ? '搜索暂时不可用，请重试。'
    : !index
      ? '正在加载搜索…'
      : !index.entries.length
        ? '暂无可搜索的已发布文档或博客。'
        : !query.trim()
          ? '输入关键词，搜索文档和博客。'
          : !results.length
            ? '未找到相关内容，请尝试其他关键词或搜索范围。'
            : `找到 ${results.length} 条结果`;
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="site-search-title"
      aria-describedby="site-search-hint"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const controls = Array.from(
            dialog.current!.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), a[href]',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
          return;
        }
        if (
          composing.current ||
          event.nativeEvent.isComposing ||
          event.keyCode === 229
        )
          return;
        if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
        const links = Array.from(
          dialog.current!.querySelectorAll<HTMLAnchorElement>(
            '[data-search-result]',
          ),
        );
        const current = links.indexOf(
          document.activeElement as HTMLAnchorElement,
        );
        if (
          event.target === input.current &&
          event.key === 'Enter' &&
          links[0]
        ) {
          event.preventDefault();
          links[0].click();
        } else if (
          (event.target === input.current || current >= 0) &&
          event.key !== 'Enter' &&
          links.length
        ) {
          event.preventDefault();
          const next =
            event.key === 'ArrowDown'
              ? Math.min(current + 1, links.length - 1)
              : current - 1;
          if (next < 0) input.current?.focus();
          else links[next].focus();
        }
      }}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2 id="site-search-title">搜索文档和博客</h2>
            <p id="site-search-hint">查找指南、技术文章与实践经验</p>
          </div>
          <button
            type="button"
            onClick={() => close()}
            className={styles.close}
            aria-label="关闭搜索"
          >
            ×
          </button>
        </div>
        <div className={styles.inputRow}>
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
          <label className="sr-only" htmlFor="site-search-input">
            搜索文档和博客
          </label>
          <input
            ref={input}
            id="site-search-input"
            type="search"
            value={draft}
            maxLength={100}
            placeholder="输入关键词…"
            autoComplete="off"
            onChange={(event) => {
              setDraft(event.target.value);
              if (!composing.current) {
                setQuery(event.target.value);
                setLimit(20);
              }
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setQuery(event.currentTarget.value);
              setLimit(20);
            }}
          />
          {draft && (
            <button
              type="button"
              className={styles.clear}
              aria-label="清空搜索"
              onClick={() => {
                composing.current = false;
                setDraft('');
                setQuery('');
                setLimit(20);
                input.current?.focus();
              }}
            >
              清空
            </button>
          )}
        </div>
        <div className={styles.filters} role="group" aria-label="搜索范围">
          {(
            [
              ['all', '全部'],
              ['docs', '文档'],
              ['blog', '博客'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={scope === value}
              onClick={() => {
                setScope(value);
                setLimit(20);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.results}>
          <p className={styles.status} role="status" aria-live="polite">
            {status}
          </p>
          {error && (
            <button
              type="button"
              className={styles.retry}
              onClick={() => setAttempt((value) => value + 1)}
            >
              重新加载
            </button>
          )}
          <ul aria-label="搜索结果">
            {results.slice(0, limit).map((result) => (
              <li key={result.pageHref}>
                <Link
                  to={result.href}
                  data-search-result
                  onClick={() => close(false)}
                >
                  <span className={styles.source}>
                    {result.kind === 'docs' ? '文档' : '博客'}
                    <span aria-hidden="true"> / </span>
                    <span>{result.pageHref}</span>
                  </span>
                  <strong>
                    <Highlight text={result.title} query={query} />
                  </strong>
                  {result.heading && (
                    <span className={styles.heading}>
                      <Highlight text={result.heading} query={query} />
                    </span>
                  )}
                  {result.snippet && (
                    <span className={styles.snippet}>
                      <Highlight text={result.snippet} query={query} />
                    </span>
                  )}
                  {result.tags && (
                    <span className={styles.tags}>
                      <Highlight text={result.tags} query={query} />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {results.length > limit && (
            <button
              type="button"
              className={styles.retry}
              onClick={() => setLimit((value) => value + 20)}
            >
              显示更多结果
            </button>
          )}
        </div>
        <div className={styles.footer}>
          ↑ ↓ 选择结果 <span>Enter 打开</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </dialog>
  );
}
export default function SiteSearch() {
  const browser = useIsBrowser();
  const location = useLocation();
  const { indexUrl } = usePluginData('modelsphere-search') as {
    indexUrl: string;
  };
  const [open, setOpen] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K');
    function keydown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 'k' &&
        !event.isComposing
      ) {
        event.preventDefault();
        if (!open) {
          previousFocus.current = document.activeElement as HTMLElement;
          setOpen(true);
        }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [open]);
  useEffect(() => {
    previousFocus.current = null;
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (!open) previousFocus.current?.focus({ preventScroll: true });
  }, [open]);
  function close(restoreFocus = true) {
    if (!restoreFocus) previousFocus.current = null;
    setOpen(false);
  }
  return (
    <>
      <button
        className="header-search"
        type="button"
        disabled={!browser}
        aria-label="搜索文档和博客"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          browser ? `搜索文档和博客（${shortcut}）` : '启用 JavaScript 后可搜索'
        }
        onClick={() => {
          previousFocus.current = document.activeElement as HTMLElement;
          setOpen(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <span>搜索文档和博客…</span>
        <kbd>{shortcut}</kbd>
      </button>
      {browser &&
        open &&
        createPortal(
          <SearchDialog url={indexUrl} close={close} />,
          document.body,
        )}
    </>
  );
}
