import { useSitePath } from '@site/src/lib/use-site-path';
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
} from './data';
import {
  facets,
  initialQuery,
  parseQuery,
  queryHref,
  queryRecipes,
  queryModels,
  type Query,
} from './query';
import { Icon, RecipeCard, SourceState, Stats } from './components';
import { useCatalog } from './useCatalog';
import { legacyCatalogReportHref, reportHref } from './routes';
import CatalogSelect from './CatalogSelect';
import ModelCard, { ModelRecipeList, ModelTuning } from './ModelCard';
import styles from './styles.module.css';

export default function CatalogPage() {
  const { siteHref, localHref } = useSitePath();
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
    recipeResult = useMemo(() => queryRecipes(c, q), [c, q]),
    modelResult = useMemo(() => queryModels(c, q), [c, q]);
  const result = q.view === 'models' ? modelResult : recipeResult;
  const all = useMemo(() => recipesOf(c), [c]);
  const returnTo = localHref(location.pathname) + location.search;
  const legacyReport = browser
    ? legacyCatalogReportHref(location.search)
    : null;
  useEffect(() => {
    if (legacyReport) history.replace(siteHref(legacyReport));
  }, [history, legacyReport, siteHref]);
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
          'input,textarea,select,[role="combobox"],[role="listbox"],[contenteditable="true"],dialog[open]',
        )
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [browser]);
  function update(patch: Partial<Query>, page = false) {
    const next = { ...q, ...patch, ...(page ? {} : { page: 1 }) };
    const href = siteHref(queryHref(next) + location.hash);
    if (href !== location.pathname + location.search + location.hash) {
      paginationHref.current = page ? href : null;
      history.push(href);
    }
  }
  const items = browser ? recipeResult.items : recipeResult.all;
  const modelItems = browser ? modelResult.items : modelResult.all;
  const select = (
    key: 'family' | 'engine' | 'tag',
    label: string,
    values: string[],
  ) => (
    <span className={styles.select}>
      <CatalogSelect
        label={label}
        active={Boolean(q[key])}
        value={q[key]}
        onValueChange={(value) => update({ [key]: value })}
        options={[
          { value: '', label },
          ...values.map((value) => ({ value, label: value })),
        ]}
      />
    </span>
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
                    <span className={styles.select}>
                      <CatalogSelect
                        label="内容视图"
                        active={q.view !== initialQuery.view}
                        value={q.view}
                        onValueChange={(value) => update({ view: value })}
                        options={[
                          { value: 'models', label: '模型视角' },
                          { value: 'recipes', label: '配方视角' },
                        ]}
                      />
                    </span>
                    {select('family', '全部模型家族', f.family)}
                    {select('engine', '全部推理引擎', f.engine)}
                    {select('tag', '全部技术标签', f.tag)}
                  </div>
                  <div className={styles.tools}>
                    <span role="status">
                      共 <strong>{result.total}</strong> 个
                      {q.view === 'recipes' ? '配方' : '模型'}
                    </span>
                    <span className={styles.select}>
                      <CatalogSelect
                        label="排序方式"
                        value={q.sort}
                        onValueChange={(value) => update({ sort: value })}
                        options={[
                          {
                            value: 'improvement-desc',
                            label:
                              q.view === 'models'
                                ? '按调优配方最佳提升排序'
                                : '按吞吐量提升排序',
                          },
                          { value: 'name-asc', label: '按模型名称 A–Z' },
                          { value: 'name-desc', label: '按模型名称 Z–A' },
                          { value: 'updated-desc', label: '按配方发布日期' },
                        ]}
                      />
                    </span>
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
                      update({ ...initialQuery, dataVersion: q.dataVersion });
                    }}
                  >
                    重置筛选
                  </button>
                </div>
                <details className={styles.more}>
                  <summary>视图与更多筛选</summary>
                  <div>
                    <label className={styles.moreSelect}>
                      <span>配方角色</span>
                      <CatalogSelect
                        label="配方角色"
                        active={Boolean(q.role)}
                        value={q.role}
                        onValueChange={(value) => update({ role: value })}
                        options={[
                          { value: '', label: '全部角色' },
                          { value: 'optimized', label: '有调优记录' },
                          { value: 'baseline', label: '基线' },
                          { value: 'default', label: '默认配方' },
                          { value: 'recipe', label: '其他部署配方' },
                        ]}
                      />
                    </label>
                    <label className={styles.moreSelect}>
                      <span>部署拓扑</span>
                      <CatalogSelect
                        label="部署拓扑"
                        active={Boolean(q.topology)}
                        value={q.topology}
                        onValueChange={(value) => update({ topology: value })}
                        options={[
                          { value: '', label: '全部拓扑' },
                          { value: 'single-node', label: '单节点' },
                          { value: 'lws', label: '多节点 LWS' },
                          { value: 'pd', label: 'Prefill / Decode 分离' },
                        ]}
                      />
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
              ) : q.layout === 'table' && q.view === 'models' ? (
                <div className={styles.tableScroll}>
                  <table className={styles.modelTable}>
                    <caption>模型目录</caption>
                    <thead>
                      <tr>
                        <th>模型 / 介绍</th>
                        <th>调优对照</th>
                        <th>可用配方</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelItems.map((summary) => (
                        <tr
                          key={summary.model.name}
                          data-model-id={summary.model.name}
                        >
                          <th>
                            <Link
                              to={modelHref(summary.model, c.commit, returnTo)}
                            >
                              {summary.model.displayName || summary.model.name}
                            </Link>
                            <p>
                              {summary.model.description || '暂无模型说明。'}
                            </p>
                          </th>
                          <td>
                            <ModelTuning
                              summary={summary}
                              version={c.commit}
                              returnTo={returnTo}
                            />
                          </td>
                          <td>
                            <ModelRecipeList
                              summary={summary}
                              version={c.commit}
                              returnTo={returnTo}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : q.layout === 'table' ? (
                <div className={styles.tableScroll}>
                  <table>
                    <caption>模型部署目录</caption>
                    <thead>
                      <tr>
                        <th>模型</th>
                        <th>配方 / 引擎</th>
                        <th>硬件</th>
                        <th>最佳负载提升</th>
                        <th>配方详情</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.key}>
                          <th>
                            <Link to={modelHref(r.model, c.commit, returnTo)}>
                              {r.model.displayName ?? r.model.name}
                            </Link>
                          </th>
                          <td>
                            <Link
                              to={detailHref(r, c.commit, undefined, returnTo)}
                            >
                              {r.variant.id}
                            </Link>
                            <br />
                            {r.variant.engine}
                          </td>
                          <td>{hardwareText(r.variant)}</td>
                          <td>
                            {r.quotedGain != null && reportUrl(r) ? (
                              <Link
                                to={reportHref(r, c.commit, returnTo)}
                                aria-label={`查看 ${r.variant.id} 性能对照`}
                              >
                                {`${r.quotedGain >= 0 ? '+' : ''}${r.quotedGain.toFixed(1)}%`}
                              </Link>
                            ) : r.quotedGain == null ? (
                              '未提供'
                            ) : (
                              `${r.quotedGain >= 0 ? '+' : ''}${r.quotedGain.toFixed(1)}%`
                            )}
                            <small>{r.workload}</small>
                          </td>
                          <td>
                            <Link
                              to={detailHref(r, c.commit, undefined, returnTo)}
                            >
                              查看配方详情
                            </Link>
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
                  {q.view === 'models'
                    ? modelItems.map((summary) => (
                        <ModelCard
                          key={summary.model.name}
                          summary={summary}
                          version={c.commit}
                          returnTo={returnTo}
                        />
                      ))
                    : items.map((r) => (
                        <RecipeCard
                          key={r.key}
                          r={r}
                          version={c.commit}
                          returnTo={returnTo}
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
            </>
          )}
          <footer className={styles.catalogFoot}>
            <a
              href={`${config.repository}/commit/${c.commit}`}
              target="_blank"
              rel="noreferrer"
            >
              目录版本 {c.commit.slice(0, 7)} ↗
            </a>
          </footer>
        </div>
      </main>
    </Layout>
  );
}
