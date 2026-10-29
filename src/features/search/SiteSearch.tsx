import { translate } from '@docusaurus/Translate';
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
        if (!response.ok)
          throw new Error(
            translate({ id: 'site.d53ee2728087', message: '搜索索引加载失败' }),
          );
        const value: unknown = await response.json();
        if (!isSearchIndex(value))
          throw new Error(
            translate({ id: 'site.b903498d56e4', message: '搜索索引格式无效' }),
          );
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
    ? translate({
        id: 'site.0bee6d3285b8',
        message: '搜索暂时不可用，请重试。',
      })
    : !index
      ? translate({ id: 'site.6ecb8e89c7cd', message: '正在加载搜索…' })
      : !index.entries.length
        ? translate({
            id: 'site.259ec2d1fa6b',
            message: '暂无可搜索的已发布文档或博客。',
          })
        : !query.trim()
          ? translate({
              id: 'site.8ece413016a8',
              message: '输入关键词，搜索文档和博客。',
            })
          : !results.length
            ? translate({
                id: 'site.86a477779925',
                message: '未找到相关内容，请尝试其他关键词或搜索范围。',
              })
            : translate(
                { id: 'site.11101d0bfe7c', message: '找到 {v0} 条结果' },
                { v0: results.length },
              );
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
            <h2 id="site-search-title">
              {translate({
                id: 'site.fd47b25677a7',
                message: '搜索文档和博客',
              })}
            </h2>
            <p id="site-search-hint">
              {translate({
                id: 'site.b87acde44ff1',
                message: '查找指南、技术文章与实践经验',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => close()}
            className={styles.close}
            aria-label={translate({
              id: 'site.ab008ef18dac',
              message: '关闭搜索',
            })}
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
            {translate({ id: 'site.fd47b25677a7', message: '搜索文档和博客' })}
          </label>
          <input
            ref={input}
            id="site-search-input"
            type="search"
            value={draft}
            maxLength={100}
            placeholder={translate({
              id: 'site.26b5de5a5e47',
              message: '输入关键词…',
            })}
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
              aria-label={translate({
                id: 'site.b6f00afa6537',
                message: '清空搜索',
              })}
              onClick={() => {
                composing.current = false;
                setDraft('');
                setQuery('');
                setLimit(20);
                input.current?.focus();
              }}
            >
              {translate({ id: 'site.1ef3de06b32e', message: '清空' })}
            </button>
          )}
        </div>
        <div
          className={styles.filters}
          role="group"
          aria-label={translate({
            id: 'site.4e65d015121f',
            message: '搜索范围',
          })}
        >
          {(
            [
              ['all', translate({ id: 'site.5c55a67935af', message: '全部' })],
              ['docs', translate({ id: 'site.2687ccdbb1d2', message: '文档' })],
              ['blog', translate({ id: 'site.7855e5e9727e', message: '博客' })],
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
              {translate({ id: 'site.7bdd5ce1e298', message: '重新加载' })}
            </button>
          )}
          <ul
            aria-label={translate({
              id: 'site.88d72ece7cf7',
              message: '搜索结果',
            })}
          >
            {results.slice(0, limit).map((result) => (
              <li key={result.pageHref}>
                <Link
                  to={result.href}
                  data-search-result
                  onClick={() => close(false)}
                >
                  <span className={styles.source}>
                    {result.kind === 'docs'
                      ? translate({ id: 'site.2687ccdbb1d2', message: '文档' })
                      : translate({ id: 'site.7855e5e9727e', message: '博客' })}
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
              {translate({ id: 'site.f99de0a92aa6', message: '显示更多结果' })}
            </button>
          )}
        </div>
        <div className={styles.footer}>
          {translate({ id: 'site.ed817866d149', message: '↑ ↓ 选择结果 ' })}
          <span>
            {translate({ id: 'site.9d6d07c286e2', message: 'Enter 打开' })}
          </span>
          <span>
            {translate({ id: 'site.412bd6bd4b88', message: 'Esc 关闭' })}
          </span>
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
        aria-label={translate({
          id: 'site.fd47b25677a7',
          message: '搜索文档和博客',
        })}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          browser
            ? translate(
                { id: 'site.a974aa27ebae', message: '搜索文档和博客（{v0}）' },
                { v0: shortcut },
              )
            : translate({
                id: 'site.83d94d332796',
                message: '启用 JavaScript 后可搜索',
              })
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
        <span>
          {translate({ id: 'site.80ca10ed888d', message: '搜索文档和博客…' })}
        </span>
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
