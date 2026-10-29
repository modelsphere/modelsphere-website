import { useSitePath } from '@site/src/lib/use-site-path';
import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useHistory, useLocation } from '@docusaurus/router';
import {
  config,
  detailHref,
  launchFacts,
  loadHistory,
  loadYaml,
  modelHref,
  recipesOf,
  reportUrl,
  type History,
} from './data';
import { CopyButton, RecipeCard, SourceState } from './components';
import { ModelOverviewCard } from './ModelOverviewCard';
import { useCatalog } from './useCatalog';
import {
  catalogReturnTo,
  legacyRecipeReportHref,
  recipeTab,
  recipeTabHref,
  recipeTabs,
  type RecipeTab,
} from './routes';
import ReportPanel from './ReportPanel';
import CatalogSelect from './CatalogSelect';
import RecipeOverview from './RecipeOverview';
import styles from './styles.module.css';

export default function DetailPage({ kind }: { kind: 'model' | 'recipe' }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const identity = ['modelId', 'recipeId', 'dataVersion', 'version'].map(
    (key) => params.get(key),
  );
  return (
    <DetailContent key={JSON.stringify([kind, ...identity])} kind={kind} />
  );
}
function DetailContent({ kind }: { kind: 'model' | 'recipe' }) {
  const { siteHref } = useSitePath();
  const browser = useIsBrowser(),
    location = useLocation(),
    history = useHistory();
  const params = new URLSearchParams(browser ? location.search : ''),
    modelId = params.get('modelId') ?? '',
    recipeId = params.get('recipeId') ?? '',
    requestedVersion = params.get('version') ?? '',
    activeTab = recipeTab(params.get('tab')),
    returnTo = catalogReturnTo(params.get('returnTo'));
  const [openedPerformance, setOpenedPerformance] = useState(false);
  useEffect(() => {
    if (activeTab === 'performance') setOpenedPerformance(true);
  }, [activeTab]);
  const legacyReport =
    browser && kind === 'recipe'
      ? legacyRecipeReportHref(location.search, location.hash)
      : null;
  useEffect(() => {
    if (legacyReport) history.replace(siteHref(legacyReport));
  }, [history, legacyReport, siteHref]);
  const state = useCatalog(params.get('dataVersion') ?? ''),
    c = state.catalog;
  const model = c.models.find((m) => m.name === modelId),
    recipes = useMemo(
      () => recipesOf(c).filter((r) => r.model.name === modelId),
      [c, modelId],
    );
  const recipe = recipes.find((r) => r.variant.id === recipeId);
  const [revisions, setRevisions] = useState<History | null>(null),
    [historyError, setHistoryError] = useState(''),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setRevisions(null);
    setHistoryError('');
    if (!recipe || state.unavailable) return;
    const abort = new AbortController();
    loadHistory(recipe, abort.signal)
      .then((h) => {
        if (!abort.signal.aborted) setRevisions(h);
      })
      .catch(() => {
        if (!abort.signal.aborted) setHistoryError('版本历史暂时不可用。');
      });
    return () => abort.abort();
  }, [recipe?.key, c.commit, state.unavailable, retry]);
  const revision = requestedVersion
    ? revisions?.revisions.find((r) => r.version === requestedVersion)
    : null;
  const versionState = !requestedVersion
    ? 'ready'
    : !revisions
      ? historyError
        ? 'history-error'
        : 'loading'
      : revision
        ? 'ready'
        : 'missing';
  const configurationCommit = revision?.commit ?? recipe?.variant.commit;
  const configurationDigest = revision?.digest ?? recipe?.variant.digest;
  useEffect(() => {
    setText('');
    setError('');
    if (!recipe || state.unavailable) return;
    if (versionState === 'loading' || versionState === 'history-error') {
      if (versionState === 'history-error')
        setError('历史读取失败，不能确认指定版本。');
      return;
    }
    if (versionState === 'missing') {
      setError('指定配方版本不在所选目录的历史中。');
      return;
    }
    const abort = new AbortController();
    loadYaml(
      recipe.variant,
      abort.signal,
      configurationCommit,
      configurationDigest,
    )
      .then((t) => {
        if (!abort.signal.aborted) setText(t);
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : '配方加载失败');
      });
    return () => abort.abort();
  }, [
    recipe?.key,
    c.commit,
    state.unavailable,
    versionState,
    configurationCommit,
    configurationDigest,
    retry,
  ]);
  const facts = useMemo(() => {
    try {
      return text ? launchFacts(text) : null;
    } catch {
      return null;
    }
  }, [text]);
  const invalid = !modelId || (kind === 'recipe' && !recipeId),
    missing = !invalid && (!model || (kind === 'recipe' && !recipe));
  function chooseVersion(v: string) {
    const p = new URLSearchParams(location.search);
    if (v) p.set('version', v);
    else p.delete('version');
    history.push(location.pathname + '?' + p.toString());
  }
  function chooseTab(tab: RecipeTab) {
    if (tab !== activeTab)
      history.push(siteHref(recipeTabHref(location.search, tab)));
  }
  function moveTabFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
    const index = recipeTabs.findIndex(
      (tab) => tab.id === event.currentTarget.dataset.tab,
    );
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % recipeTabs.length
        : event.key === 'ArrowLeft'
          ? (index + recipeTabs.length - 1) % recipeTabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? recipeTabs.length - 1
              : null;
    if (next == null) return;
    event.preventDefault();
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    buttons?.[next]?.focus();
  }
  return (
    <Layout
      title={
        kind === 'recipe' && recipe
          ? `${recipe.variant.id} · 配方详情`
          : (model?.displayName ?? '模型与配方详情')
      }
      description="查阅模型配方、部署配置、版本历史与性能测评。"
    >
      <Head>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <main id="main-content" className={`${styles.page} ${styles.detailPage}`}>
        <div className={styles.container}>
          <div className={styles.topbar}>
            <nav aria-label="面包屑">
              <Link to={returnTo}>模型目录</Link>
              <span>/</span>
              {kind === 'recipe' && model && !state.unavailable && (
                <>
                  <Link to={modelHref(model, c.commit, returnTo)}>
                    {model.displayName ?? model.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span>{kind === 'model' ? '模型详情' : '配方详情'}</span>
            </nav>
            <SourceState {...state} />
          </div>
          {!browser ? (
            <section>
              <h1>模型与配方详情</h1>
              <p className={styles.notice}>
                实时模型和配方详情需要 JavaScript。
                <a href={config.baseUrl}>阅读原始目录</a>
              </p>
            </section>
          ) : invalid ? (
            <div className={styles.empty}>
              <h1>详情参数不完整</h1>
              <p>请从目录中的模型或配方入口访问。</p>
              <Link to={returnTo}>返回模型目录</Link>
            </div>
          ) : state.unavailable ? (
            <div className={styles.empty}>
              <h1>
                {state.status === 'loading'
                  ? '正在读取指定目录版本…'
                  : '目录版本不可用'}
              </h1>
              <p>{state.error}</p>
              <Link to="/models">打开当前目录</Link>
            </div>
          ) : missing ? (
            <div className={styles.empty}>
              <h1>
                {state.status === 'loading'
                  ? '正在确认记录…'
                  : state.status === 'error'
                    ? '来源不可用，尚无法确认记录'
                    : '未找到模型或配方'}
              </h1>
              <p>
                所选标识：{modelId}
                {recipeId && ` / ${recipeId}`}
              </p>
              <Link to={returnTo}>返回模型目录</Link>
            </div>
          ) : (
            model && (
              <>
                {kind === 'model' ? (
                  <>
                    <ModelOverviewCard model={model} />
                    <section
                      className={styles.recipeSection}
                      aria-labelledby="model-recipes-title"
                    >
                      <div className={styles.sectionHeading}>
                        <h2 id="model-recipes-title">
                          可用部署配方 ·{' '}
                          <span className={styles.sectionCount}>
                            {recipes.length}
                          </span>
                        </h2>
                      </div>
                      <div className={styles.grid}>
                        {recipes.map((r) => (
                          <RecipeCard
                            key={r.key}
                            r={r}
                            context="model"
                            version={c.commit}
                            returnTo={returnTo}
                            copy={() => loadYaml(r.variant)}
                          />
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  recipe && (
                    <>
                      <RecipeOverview
                        recipe={recipe}
                        recipes={recipes}
                        version={c.commit}
                        returnTo={returnTo}
                      />
                      <div
                        className={styles.recipeTabs}
                        role="tablist"
                        aria-label="配方详情"
                      >
                        {recipeTabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`recipe-tab-${tab.id}`}
                            data-tab={tab.id}
                            aria-controls={`recipe-panel-${tab.id}`}
                            aria-selected={activeTab === tab.id}
                            tabIndex={activeTab === tab.id ? 0 : -1}
                            onClick={() => chooseTab(tab.id)}
                            onKeyDown={moveTabFocus}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <section
                        id="recipe-panel-deployment"
                        role="tabpanel"
                        aria-labelledby="recipe-tab-deployment"
                        tabIndex={0}
                        hidden={activeTab !== 'deployment'}
                        className={`${styles.detailBox} ${styles.tabPanel}`}
                      >
                        <div className={styles.detailTop}>
                          <h2>部署配置</h2>
                          <label className={styles.recipeVersion}>
                            <span>配方版本</span>
                            <CatalogSelect
                              label="配方版本"
                              value={requestedVersion}
                              onValueChange={chooseVersion}
                              options={[
                                {
                                  value: '',
                                  label: `当前版本 ${recipe.variant.version}`,
                                },
                                ...(requestedVersion && !revision
                                  ? [
                                      {
                                        value: requestedVersion,
                                        label: `${requestedVersion} · 待确认版本`,
                                      },
                                    ]
                                  : []),
                                ...(revisions?.revisions.map((r) => ({
                                  value: r.version,
                                  label: `${r.version} · ${r.releaseDate ?? '日期未提供'}`,
                                })) ?? []),
                              ]}
                            />
                          </label>
                        </div>
                        {requestedVersion &&
                          requestedVersion !== recipe.variant.version && (
                            <p className={styles.notice}>
                              当前查看配置版本：{requestedVersion}
                              。上方硬件和引擎摘要对应当前配方版本：
                              {recipe.variant.version}。
                            </p>
                          )}
                        {historyError && (
                          <p role="status">
                            {historyError}{' '}
                            <button onClick={() => setRetry((n) => n + 1)}>
                              重试
                            </button>
                          </p>
                        )}
                        {error ? (
                          <p role="alert">
                            {error}{' '}
                            <button onClick={() => setRetry((n) => n + 1)}>
                              重试
                            </button>
                          </p>
                        ) : !text ? (
                          <p role="status">正在加载并校验配置…</p>
                        ) : (
                          <>
                            <div className={styles.detailTop}>
                              <p>原始 YAML · SHA-256 校验通过</p>
                              <CopyButton
                                getText={() => Promise.resolve(text)}
                              />
                            </div>
                            <pre className={styles.code}>
                              <code>{text}</code>
                            </pre>
                            {facts && (
                              <details className={styles.more}>
                                <summary>启动参数</summary>
                                <pre className={styles.code}>
                                  <code>
                                    {facts.args.length
                                      ? facts.args.join('\n')
                                      : '未提供 extraArgs'}
                                  </code>
                                </pre>
                                {facts.context != null && (
                                  <p>
                                    上下文配置：
                                    {String(facts.context) || '未设置'}
                                  </p>
                                )}
                              </details>
                            )}
                          </>
                        )}
                      </section>
                      <section
                        id="recipe-panel-performance"
                        role="tabpanel"
                        aria-labelledby="recipe-tab-performance"
                        tabIndex={0}
                        hidden={activeTab !== 'performance'}
                        className={styles.tabPanel}
                      >
                        {reportUrl(recipe) ? (
                          <>
                            {requestedVersion && (
                              <p className={styles.notice}>
                                当前选择的配置版本：{requestedVersion}
                                。报告对应测量版本：
                                {recipe.tuning[0]?.optimized}
                              </p>
                            )}
                            {(openedPerformance ||
                              activeTab === 'performance') && (
                              <ReportPanel
                                r={recipe}
                                commit={c.commit}
                                active={activeTab === 'performance'}
                              />
                            )}
                          </>
                        ) : (
                          <div className={styles.detailBox}>
                            <h2>性能对照</h2>
                            <p className={styles.notice} role="status">
                              该配方暂无可用对照报告，可继续查看部署配置与版本历史。
                            </p>
                          </div>
                        )}
                      </section>
                      <section
                        id="recipe-panel-history"
                        role="tabpanel"
                        aria-labelledby="recipe-tab-history"
                        tabIndex={0}
                        hidden={activeTab !== 'history'}
                        className={`${styles.detailBox} ${styles.tabPanel}`}
                      >
                        <h2>版本历史</h2>
                        {historyError ? (
                          <p role="status">
                            {historyError}{' '}
                            <button onClick={() => setRetry((n) => n + 1)}>
                              重试
                            </button>
                          </p>
                        ) : !revisions ? (
                          <p role="status">正在读取版本历史…</p>
                        ) : (
                          <ol className={styles.history}>
                            {revisions?.revisions.map((r) => (
                              <li key={r.digest}>
                                <strong>v{r.version}</strong>
                                <span>{r.releaseDate ?? '日期未提供'}</span>
                                <p>{r.subject}</p>
                                <Link
                                  to={detailHref(
                                    recipe,
                                    c.commit,
                                    r.version,
                                    returnTo,
                                  )}
                                >
                                  查看 v{r.version} 配置 →
                                </Link>{' '}
                                {r.commit && (
                                  <a
                                    href={`${config.repository}/blob/${r.commit}/${recipe.variant.path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    固定提交 {r.commit.slice(0, 7)} ↗
                                  </a>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </section>
                      <div className={styles.actions}>
                        <Link to={returnTo}>返回模型目录</Link>
                      </div>
                    </>
                  )
                )}
              </>
            )
          )}
        </div>
      </main>
    </Layout>
  );
}
