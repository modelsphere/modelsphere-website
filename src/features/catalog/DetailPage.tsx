import { translateCopy } from '@site/src/lib/translate-copy';
import { translate } from '@docusaurus/Translate';
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
        if (!abort.signal.aborted)
          setHistoryError(
            translate({
              id: 'site.4dfcf4a367d7',
              message: '版本历史暂时不可用。',
            }),
          );
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
        setError(
          translate({
            id: 'site.29943560b92e',
            message: '历史读取失败，不能确认指定版本。',
          }),
        );
      return;
    }
    if (versionState === 'missing') {
      setError(
        translate({
          id: 'site.92e0aab9b6ec',
          message: '指定配方版本不在所选目录的历史中。',
        }),
      );
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
          setError(
            e instanceof Error
              ? e.message
              : translate({ id: 'site.e468b74b0da3', message: '配方加载失败' }),
          );
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
          ? translate(
              { id: 'site.fc599ecea048', message: '{v0} · 配方详情' },
              { v0: recipe.variant.id },
            )
          : (model?.displayName ??
            translate({ id: 'site.f7121092ad68', message: '模型与配方详情' }))
      }
      description={translate({
        id: 'site.bdddd3c76973',
        message: '查阅模型配方、部署配置、版本历史与性能测评。',
      })}
    >
      <Head>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <main id="main-content" className={`${styles.page} ${styles.detailPage}`}>
        <div className={styles.container}>
          <div className={styles.topbar}>
            <nav
              aria-label={translate({
                id: 'site.6770d01e7d15',
                message: '面包屑',
              })}
            >
              <Link to={returnTo}>
                {translate({ id: 'site.34b3cac2a496', message: '模型目录' })}
              </Link>
              <span>/</span>
              {kind === 'recipe' && model && !state.unavailable && (
                <>
                  <Link to={modelHref(model, c.commit, returnTo)}>
                    {model.displayName ?? model.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span>
                {kind === 'model'
                  ? translate({ id: 'site.e0af03d94875', message: '模型详情' })
                  : translate({ id: 'site.4fd2e35fdb77', message: '配方详情' })}
              </span>
            </nav>
            <SourceState {...state} />
          </div>
          {!browser ? (
            <section>
              <h1>
                {translate({
                  id: 'site.f7121092ad68',
                  message: '模型与配方详情',
                })}
              </h1>
              <p className={styles.notice}>
                {translate({
                  id: 'site.469cea37d375',
                  message: '实时模型和配方详情需要 JavaScript。',
                })}
                <a href={config.baseUrl}>
                  {translate({
                    id: 'site.441896a2fb30',
                    message: '阅读原始目录',
                  })}
                </a>
              </p>
            </section>
          ) : invalid ? (
            <div className={styles.empty}>
              <h1>
                {translate({
                  id: 'site.ffa44b075ded',
                  message: '详情参数不完整',
                })}
              </h1>
              <p>
                {translate({
                  id: 'site.84d882ee8275',
                  message: '请从目录中的模型或配方入口访问。',
                })}
              </p>
              <Link to={returnTo}>
                {translate({
                  id: 'site.2b89357b9abf',
                  message: '返回模型目录',
                })}
              </Link>
            </div>
          ) : state.unavailable ? (
            <div className={styles.empty}>
              <h1>
                {state.status === 'loading'
                  ? translate({
                      id: 'site.f77b18ff38e7',
                      message: '正在读取指定目录版本…',
                    })
                  : translate({
                      id: 'site.415e549d79fc',
                      message: '目录版本不可用',
                    })}
              </h1>
              <p>{translateCopy(state.error)}</p>
              <Link to="/models">
                {translate({
                  id: 'site.b7e877f61317',
                  message: '打开当前目录',
                })}
              </Link>
            </div>
          ) : missing ? (
            <div className={styles.empty}>
              <h1>
                {state.status === 'loading'
                  ? translate({
                      id: 'site.a25fa8489ab7',
                      message: '正在确认记录…',
                    })
                  : state.status === 'error'
                    ? translate({
                        id: 'site.b82f67fe4758',
                        message: '来源不可用，尚无法确认记录',
                      })
                    : translate({
                        id: 'site.f4d62b6efdba',
                        message: '未找到模型或配方',
                      })}
              </h1>
              <p>
                {translate({ id: 'site.b4c50e4f241c', message: '所选标识：' })}
                {modelId}
                {recipeId && ` / ${recipeId}`}
              </p>
              <Link to={returnTo}>
                {translate({
                  id: 'site.2b89357b9abf',
                  message: '返回模型目录',
                })}
              </Link>
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
                          {translate({
                            id: 'site.6fdd43b3efe0',
                            message: '可用部署配方 ·',
                          })}{' '}
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
                        aria-label={translate({
                          id: 'site.4fd2e35fdb77',
                          message: '配方详情',
                        })}
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
                            {translate({ message: tab.label })}
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
                          <h2>
                            {translate({
                              id: 'site.ccbf90f527b4',
                              message: '部署配置',
                            })}
                          </h2>
                          <label className={styles.recipeVersion}>
                            <span>
                              {translate({
                                id: 'site.46d945476414',
                                message: '配方版本',
                              })}
                            </span>
                            <CatalogSelect
                              label={translate({
                                id: 'site.46d945476414',
                                message: '配方版本',
                              })}
                              value={requestedVersion}
                              onValueChange={chooseVersion}
                              options={[
                                {
                                  value: '',
                                  label: translate(
                                    {
                                      id: 'site.3fca94b2e016',
                                      message: '当前版本 {v0}',
                                    },
                                    { v0: recipe.variant.version },
                                  ),
                                },
                                ...(requestedVersion && !revision
                                  ? [
                                      {
                                        value: requestedVersion,
                                        label: translate(
                                          {
                                            id: 'site.34d6246305c8',
                                            message: '{v0} · 待确认版本',
                                          },
                                          { v0: requestedVersion },
                                        ),
                                      },
                                    ]
                                  : []),
                                ...(revisions?.revisions.map((r) => ({
                                  value: r.version,
                                  label: `${r.version} · ${r.releaseDate ?? translate({ id: 'site.020ef0cc6f35', message: '日期未提供' })}`,
                                })) ?? []),
                              ]}
                            />
                          </label>
                        </div>
                        {requestedVersion &&
                          requestedVersion !== recipe.variant.version && (
                            <p className={styles.notice}>
                              {translate({
                                id: 'site.8e0e739d7303',
                                message: '当前查看配置版本：',
                              })}
                              {requestedVersion}
                              {translate({
                                id: 'site.6d9bb8268bbe',
                                message:
                                  '。上方硬件和引擎摘要对应当前配方版本：',
                              })}
                              {recipe.variant.version}
                              {translate({
                                id: 'site.punctuation.period',
                                message: '。',
                              })}
                            </p>
                          )}
                        {historyError && (
                          <p role="status">
                            {historyError}{' '}
                            <button onClick={() => setRetry((n) => n + 1)}>
                              {translate({
                                id: 'site.b8784c8dd563',
                                message: '重试',
                              })}
                            </button>
                          </p>
                        )}
                        {error ? (
                          <p role="alert">
                            {translateCopy(error)}{' '}
                            <button onClick={() => setRetry((n) => n + 1)}>
                              {translate({
                                id: 'site.b8784c8dd563',
                                message: '重试',
                              })}
                            </button>
                          </p>
                        ) : !text ? (
                          <p role="status">
                            {translate({
                              id: 'site.2a71ba752529',
                              message: '正在加载并校验配置…',
                            })}
                          </p>
                        ) : (
                          <>
                            <div className={styles.detailTop}>
                              <p>
                                {translate({
                                  id: 'site.d148e4e0a931',
                                  message: '原始 YAML · SHA-256 校验通过',
                                })}
                              </p>
                              <CopyButton
                                getText={() => Promise.resolve(text)}
                              />
                            </div>
                            <pre className={styles.code}>
                              <code>{text}</code>
                            </pre>
                            {facts && (
                              <details className={styles.more}>
                                <summary>
                                  {translate({
                                    id: 'site.fcde9d2b09cf',
                                    message: '启动参数',
                                  })}
                                </summary>
                                <pre className={styles.code}>
                                  <code>
                                    {facts.args.length
                                      ? facts.args.join('\n')
                                      : translate({
                                          id: 'site.3a13a6807552',
                                          message: '未提供 extraArgs',
                                        })}
                                  </code>
                                </pre>
                                {facts.context != null && (
                                  <p>
                                    {translate({
                                      id: 'site.326269a0aa1f',
                                      message: '上下文配置：',
                                    })}
                                    {String(facts.context) ||
                                      translate({
                                        id: 'site.2f5f1d6fbfb0',
                                        message: '未设置',
                                      })}
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
                                {translate({
                                  id: 'site.d59062525d2e',
                                  message: '当前选择的配置版本：',
                                })}
                                {requestedVersion}
                                {translate({
                                  id: 'site.e2a710c27f4f',
                                  message: '。报告对应测量版本：',
                                })}
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
                            <h2>
                              {translate({
                                id: 'site.f64c61d8fac6',
                                message: '性能对照',
                              })}
                            </h2>
                            <p className={styles.notice} role="status">
                              {translate({
                                id: 'site.d1e4dea594b6',
                                message:
                                  '该配方暂无可用对照报告，可继续查看部署配置与版本历史。',
                              })}
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
                        <h2>
                          {translate({
                            id: 'site.bb58d709f19d',
                            message: '版本历史',
                          })}
                        </h2>
                        {historyError ? (
                          <p role="status">
                            {historyError}{' '}
                            <button onClick={() => setRetry((n) => n + 1)}>
                              {translate({
                                id: 'site.b8784c8dd563',
                                message: '重试',
                              })}
                            </button>
                          </p>
                        ) : !revisions ? (
                          <p role="status">
                            {translate({
                              id: 'site.730152325ab2',
                              message: '正在读取版本历史…',
                            })}
                          </p>
                        ) : (
                          <ol className={styles.history}>
                            {revisions?.revisions.map((r) => (
                              <li key={r.digest}>
                                <strong>v{r.version}</strong>
                                <span>
                                  {r.releaseDate ??
                                    translate({
                                      id: 'site.020ef0cc6f35',
                                      message: '日期未提供',
                                    })}
                                </span>
                                <p>{r.subject}</p>
                                <Link
                                  to={detailHref(
                                    recipe,
                                    c.commit,
                                    r.version,
                                    returnTo,
                                  )}
                                >
                                  {translate({
                                    id: 'site.56b1715ede54',
                                    message: '查看 v',
                                  })}
                                  {r.version}{' '}
                                  {translate({
                                    id: 'site.6a0cd8002a08',
                                    message: ' 配置 →',
                                  })}
                                </Link>{' '}
                                {r.commit && (
                                  <a
                                    href={`${config.repository}/blob/${r.commit}/${recipe.variant.path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {translate({
                                      id: 'site.929ff74a3b68',
                                      message: '固定提交 ',
                                    })}
                                    {r.commit.slice(0, 7)} ↗
                                  </a>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </section>
                      <div className={styles.actions}>
                        <Link to={returnTo}>
                          {translate({
                            id: 'site.2b89357b9abf',
                            message: '返回模型目录',
                          })}
                        </Link>
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
