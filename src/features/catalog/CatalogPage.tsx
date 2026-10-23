import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useIsBrowser from '@docusaurus/useIsBrowser';
import useIsomorphicLayoutEffect from '@docusaurus/useIsomorphicLayoutEffect';
import { useHistory, useLocation } from '@docusaurus/router';
import {
  config,
  detailHref,
  hardwareText,
  loadYaml,
  modelHref,
  recipesOf,
  reportUrl,
  type Recipe,
} from './data';
import {
  facets,
  initialQuery,
  parseQuery,
  queryHref,
  queryRecipes,
  type Query,
} from './query';
import { Icon, RecipeCard, SourceState, Stats } from './components';
import { useCatalog } from './useCatalog';
import ReportPanel from './ReportPanel';
import styles from './styles.module.css';

export default function CatalogPage() {
  const browser = useIsBrowser(),
    location = useLocation(),
    history = useHistory();
  const version = browser
    ? (new URLSearchParams(location.search).get('dataVersion') ?? '')
    : '';
  const state = useCatalog(version),
    c = state.catalog;
  const q = useMemo(
    () => (browser ? parseQuery(location.search, c) : initialQuery),
    [browser, location.search, c],
  );
  const f = useMemo(() => facets(c), [c]),
    result = useMemo(() => queryRecipes(c, q), [c, q]);
  const all = useMemo(() => recipesOf(c), [c]);
  const selected = all.find((r) => r.key === q.benchmark);
  const [draft, setDraft] = useState(''),
    search = useRef<HTMLInputElement>(null),
    filters = useRef<HTMLFormElement>(null),
    paginationHref = useRef<string | null>(null),
    composing = useRef(false);
  useEffect(() => setDraft(q.q), [q.q]);
  useIsomorphicLayoutEffect(() => {
    const href = paginationHref.current;
    paginationHref.current = null;
    if (
      !href ||
      href !== location.pathname + location.search + location.hash ||
      !filters.current
    )
      return;
    filters.current.focus({ preventScroll: true });
    const headerBottom =
      document.querySelector('.site-header')?.getBoundingClientRect().bottom ??
      0;
    window.scrollTo({
      top: Math.max(
        0,
        window.scrollY +
          filters.current.getBoundingClientRect().top -
          headerBottom -
          16,
      ),
      behavior: 'instant',
    });
  }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (!browser) return;
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.isComposing &&
        !composing.current &&
        !t.closest(
          'input,textarea,select,[contenteditable="true"],dialog[open]',
        )
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [browser]);
  useEffect(() => {
    if (q.benchmark && location.hash === '#benchmark')
      requestAnimationFrame(() =>
        document
          .getElementById('benchmark')
          ?.scrollIntoView({ block: 'start' }),
      );
  }, [q.benchmark, location.hash]);
  function update(patch: Partial<Query>, page = false) {
    const next = { ...q, ...patch, ...(page ? {} : { page: 1 }) };
    const href = queryHref(next) + location.hash;
    if (href !== location.pathname + location.search + location.hash) {
      paginationHref.current = page ? href : null;
      history.push(href);
    }
  }
  function report(r: Recipe) {
    history.push(
      queryHref({ ...q, benchmark: r.key, dataVersion: c.commit }) +
        '#benchmark',
    );
  }
  const items = browser ? result.items : result.all;
  const select = (
    key: 'family' | 'engine' | 'tag',
    label: string,
    values: string[],
  ) => (
    <label className={styles.select}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        data-active={Boolean(q[key])}
        value={q[key]}
        onChange={(e) => update({ [key]: e.target.value })}
      >
        <option value="">{label}</option>
        {values.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <Icon name="chevron" />
    </label>
  );
  return (
    <Layout
      title="模型目录"
      description="浏览 ModelSphere 模型部署配方、硬件要求、版本历史与源性能报告。"
    >
      <main
        id="main-content"
        className={`${styles.page} ${styles.catalog}`}
        data-catalog-enhanced={browser}
      >
        <div className={styles.container}>
          <div className={styles.topbar}>
            <nav aria-label="面包屑">
              <Link to="/">首页</Link>
              <span>/</span>
              <span>模型目录（Model Catalog）</span>
            </nav>
            <SourceState {...state} />
          </div>
          <header className={styles.hero}>
            <span className={styles.eyebrow}>
              <Icon name="tune" />
              MODEL DEPLOYMENT RECIPES
            </span>
            <h1>
              Model Catalog<span>模型部署配方与调优报告</span>
            </h1>
            <p>
              查阅模型的推理引擎、容器镜像、启动参数、GPU 硬件要求与基线 /
              调优报告。
              <br className={styles.desktopBreak} />
              每套配方保留来源和测量版本，让配置选择有据可查。
            </p>
          </header>
          <Stats catalog={c} />
          {state.unavailable ? (
            <p className={styles.notice} role="alert">
              {state.status === 'loading'
                ? '正在读取指定目录版本…'
                : state.error}{' '}
              <Link to="/models">打开当前目录</Link>
            </p>
          ) : (
            <>
              <form
                ref={filters}
                tabIndex={-1}
                className={styles.toolbar}
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!composing.current) update({ q: draft });
                }}
              >
                <div className={styles.search}>
                  <Icon name="search" />
                  <span className="sr-only">搜索模型目录</span>
                  <input
                    ref={search}
                    aria-label="搜索模型目录"
                    value={draft}
                    placeholder="搜索部署配方、模型名称、容器镜像、硬件型号…"
                    onCompositionStart={() => {
                      composing.current = true;
                    }}
                    onCompositionEnd={() => {
                      composing.current = false;
                    }}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        (e.nativeEvent.isComposing || composing.current)
                      )
                        e.preventDefault();
                    }}
                  />
                  <kbd aria-hidden="true">/</kbd>
                  <button type="submit">
                    搜索 <Icon name="arrow" />
                  </button>
                </div>
                <div className={styles.controls}>
                  <div className={styles.filters}>
                    {select('family', '全部模型家族', f.family)}
                    {select('engine', '全部推理引擎', f.engine)}
                    {select('tag', '全部技术标签', f.tag)}
                  </div>
                  <div className={styles.tools}>
                    <span role="status">
                      共 <strong>{result.total}</strong> 个
                      {q.view === 'recipes' ? '配方' : '模型'}
                    </span>
                    <label className={styles.select}>
                      <span className="sr-only">排序方式</span>
                      <select
                        aria-label="排序方式"
                        value={q.sort}
                        onChange={(e) => update({ sort: e.target.value })}
                      >
                        <option value="improvement-desc">
                          按源报告记录增幅排序
                        </option>
                        <option value="name-asc">按模型名称 A–Z</option>
                        <option value="name-desc">按模型名称 Z–A</option>
                        <option value="updated-desc">按配方发布日期</option>
                      </select>
                      <Icon name="chevron" />
                    </label>
                    <div className={styles.viewButtons}>
                      <button
                        type="button"
                        aria-label="卡片视图"
                        aria-pressed={q.layout === 'cards'}
                        onClick={() => update({ layout: 'cards' })}
                      >
                        <Icon name="grid" />
                      </button>
                      <button
                        type="button"
                        aria-label="表格视图"
                        aria-pressed={q.layout === 'table'}
                        onClick={() => update({ layout: 'table' })}
                      >
                        <Icon name="table" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className={styles.hardware}>
                  <button
                    type="button"
                    aria-pressed={!q.hardware.length}
                    onClick={() => update({ hardware: [] })}
                  >
                    全部硬件 <small>{all.length}</small>
                  </button>
                  {f.hardware.map((x) => (
                    <label
                      key={x}
                      className={q.hardware.includes(x) ? styles.checked : ''}
                    >
                      <input
                        type="checkbox"
                        checked={q.hardware.includes(x)}
                        onChange={() =>
                          update({
                            hardware: q.hardware.includes(x)
                              ? q.hardware.filter((v) => v !== x)
                              : [...q.hardware, x],
                          })
                        }
                      />
                      <span>
                        {x
                          .replace(/^NVIDIA-/, '')
                          .replace(/-80GB-HBM3|-SXM6-AC|-SXM4-80GB/g, '')}
                      </span>
                      <small>
                        {
                          all.filter((r) =>
                            r.variant.requires.gpuProduct.includes(x),
                          ).length
                        }
                      </small>
                    </label>
                  ))}
                  <button
                    type="button"
                    className={styles.reset}
                    onClick={() => {
                      setDraft('');
                      update({
                        ...initialQuery,
                        benchmark: q.benchmark,
                        dataVersion: q.dataVersion,
                      });
                    }}
                  >
                    重置筛选
                  </button>
                </div>
                <details className={styles.more}>
                  <summary>视图与更多筛选</summary>
                  <div>
                    <label>
                      内容视图{' '}
                      <select
                        aria-label="内容视图"
                        value={q.view}
                        onChange={(e) => update({ view: e.target.value })}
                      >
                        <option value="recipes">部署配方</option>
                        <option value="models">模型</option>
                      </select>
                    </label>
                    <label>
                      配方角色{' '}
                      <select
                        aria-label="配方角色"
                        value={q.role}
                        onChange={(e) => update({ role: e.target.value })}
                      >
                        <option value="">全部角色</option>
                        <option value="optimized">有调优记录</option>
                        <option value="baseline">基线</option>
                        <option value="default">默认配方</option>
                        <option value="recipe">其他部署配方</option>
                      </select>
                    </label>
                    <label>
                      部署拓扑{' '}
                      <select
                        aria-label="部署拓扑"
                        value={q.topology}
                        onChange={(e) => update({ topology: e.target.value })}
                      >
                        <option value="">全部拓扑</option>
                        <option value="single-node">单节点</option>
                        <option value="lws">多节点 LWS</option>
                        <option value="pd">Prefill / Decode 分离</option>
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={q.hidedep}
                        onChange={(e) => update({ hidedep: e.target.checked })}
                      />{' '}
                      隐藏已弃用记录
                    </label>
                  </div>
                </details>
              </form>
              <noscript>
                <p className={styles.notice}>
                  当前为构建时基线目录，版本 {c.commit}
                  。搜索、筛选、分页与实时详情需要
                  JavaScript；可通过来源链接阅读原始资料。
                </p>
              </noscript>
              {!result.total ? (
                <div className={styles.empty}>
                  <h2>未找到匹配内容</h2>
                  <p>保留了当前筛选条件，可修改关键词或重置筛选。</p>
                </div>
              ) : q.layout === 'table' ? (
                <div className={styles.tableScroll}>
                  <table>
                    <caption>模型部署目录 · 百分比引用源报告记录</caption>
                    <thead>
                      <tr>
                        <th>模型</th>
                        <th>配方 / 引擎</th>
                        <th>硬件</th>
                        <th>源记录最佳增幅</th>
                        <th>配置</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.key}>
                          <th>
                            <Link to={modelHref(r.model, c.commit)}>
                              {r.model.displayName ?? r.model.name}
                            </Link>
                          </th>
                          <td>
                            {r.variant.id}
                            <br />
                            {r.variant.engine}
                          </td>
                          <td>{hardwareText(r.variant)}</td>
                          <td>
                            {r.quotedGain == null
                              ? '未提供'
                              : `${r.quotedGain >= 0 ? '+' : ''}${r.quotedGain.toFixed(1)}%`}
                            <small>{r.workload}</small>
                          </td>
                          <td>
                            <Link to={detailHref(r, c.commit)}>详情与历史</Link>
                            {reportUrl(r) && (
                              <button onClick={() => report(r)}>
                                查看对照报告
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <section
                  className={styles.grid}
                  aria-label={q.view === 'recipes' ? '部署配方' : '模型列表'}
                >
                  {items.map((r) => (
                    <RecipeCard
                      key={r.key}
                      r={r}
                      version={c.commit}
                      selected={selected?.key === r.key}
                      onReport={report}
                      copy={() => loadYaml(r.variant)}
                    />
                  ))}
                </section>
              )}
              {browser && result.total > 0 && (
                <nav className={styles.pagination} aria-label="目录分页">
                  <button
                    disabled={result.page <= 1}
                    onClick={() => update({ page: result.page - 1 }, true)}
                  >
                    上一页
                  </button>
                  <span>
                    第 {result.page} / {result.pages} 页
                  </span>
                  <button
                    disabled={result.page >= result.pages}
                    onClick={() => update({ page: result.page + 1 }, true)}
                  >
                    下一页
                  </button>
                </nav>
              )}
              {q.benchmark &&
                (selected && reportUrl(selected) ? (
                  <ReportPanel
                    key={selected.key + c.commit}
                    r={selected}
                    commit={c.commit}
                  />
                ) : (
                  <section
                    id="benchmark"
                    className={styles.notice}
                    role="status"
                  >
                    所选测评不存在或没有可用报告，请选择其他配方。
                  </section>
                ))}
            </>
          )}
          <footer className={styles.catalogFoot}>
            目录记录与实测结论由源项目维护。
            <a
              href={`${config.repository}/commit/${c.commit}`}
              target="_blank"
              rel="noreferrer"
            >
              数据提交 {c.commit.slice(0, 7)} ↗
            </a>
          </footer>
        </div>
      </main>
    </Layout>
  );
}
