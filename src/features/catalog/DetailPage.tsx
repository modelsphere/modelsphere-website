import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useHistory, useLocation } from '@docusaurus/router';
import {
  config,
  hardwareText,
  launchFacts,
  loadHistory,
  loadYaml,
  modelHref,
  recipesOf,
  reportUrl,
  topologyLabel,
  type History,
} from './data';
import { CopyButton, RecipeCard, SourceLinks, SourceState } from './components';
import { ModelOverviewCard } from './ModelOverviewCard';
import { useCatalog } from './useCatalog';
import { catalogReturnTo, legacyRecipeReportHref, reportHref } from './routes';
import styles from './styles.module.css';

export default function DetailPage({ kind }: { kind: 'model' | 'recipe' }) {
  const location = useLocation();
  return <DetailContent key={kind + location.search} kind={kind} />;
}
function DetailContent({ kind }: { kind: 'model' | 'recipe' }) {
  const browser = useIsBrowser(),
    location = useLocation(),
    history = useHistory();
  const params = new URLSearchParams(browser ? location.search : ''),
    modelId = params.get('modelId') ?? '',
    recipeId = params.get('recipeId') ?? '',
    requestedVersion = params.get('version') ?? '',
    returnTo = catalogReturnTo(params.get('returnTo'));
  const legacyReport =
    browser && kind === 'recipe'
      ? legacyRecipeReportHref(location.search, location.hash)
      : null;
  useEffect(() => {
    if (legacyReport) history.replace(legacyReport);
  }, [history, legacyReport]);
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
    if (!recipe) return;
    const abort = new AbortController();
    loadHistory(recipe, abort.signal)
      .then((h) => {
        if (!abort.signal.aborted) setRevisions(h);
      })
      .catch(() => {
        if (!abort.signal.aborted) setHistoryError('版本历史暂时不可用。');
      });
    return () => abort.abort();
  }, [recipe?.key, c.commit, retry]);
  const revision = requestedVersion
    ? revisions?.revisions.find((r) => r.version === requestedVersion)
    : null;
  useEffect(() => {
    setText('');
    setError('');
    if (!recipe) return;
    if (requestedVersion && !revisions) {
      if (historyError) setError('历史读取失败，不能确认指定版本。');
      return;
    }
    if (requestedVersion && !revision) {
      setError('指定配方版本不在所选目录的历史中。');
      return;
    }
    const abort = new AbortController();
    loadYaml(
      recipe.variant,
      abort.signal,
      revision?.commit ?? recipe.variant.commit,
      revision?.digest ?? recipe.variant.digest,
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
    requestedVersion,
    revisions,
    revision,
    retry,
    historyError,
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
  return (
    <Layout
      title={model?.displayName ?? '模型与配方详情'}
      description="查阅模型配方、固定版本配置、历史记录与测试来源。"
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
              <span>{kind === 'model' ? '模型详情' : '配方与历史'}</span>
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
                <ModelOverviewCard model={model} />
                {kind === 'model' ? (
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
                ) : (
                  recipe && (
                    <>
                      <section className={styles.detailBox}>
                        <div className={styles.detailTop}>
                          <div>
                            <h2>{recipe.variant.id}</h2>
                            <p>
                              配方版本{' '}
                              {requestedVersion || recipe.variant.version} ·
                              来源记录
                            </p>
                          </div>
                          <Link to={modelHref(model, c.commit, returnTo)}>
                            全部模型配方 →
                          </Link>
                        </div>
                        <div className={styles.conditionGrid}>
                          <div>
                            <strong>硬件</strong>
                            <p>{hardwareText(recipe.variant)}</p>
                          </div>
                          <div>
                            <strong>拓扑</strong>
                            <p>{topologyLabel(recipe.variant)}</p>
                          </div>
                          <div>
                            <strong>引擎 / Chart</strong>
                            <p>
                              {recipe.variant.engine} ·{' '}
                              {recipe.variant.chart.name}{' '}
                              {recipe.variant.chart.version}
                            </p>
                          </div>
                        </div>
                        <p>
                          {requestedVersion &&
                          requestedVersion !== recipe.variant.version
                            ? '上方硬件和引擎摘要为目录当前配方；所选历史版本的准确参数以以下已校验原文为准。'
                            : recipe.variant.description}
                        </p>
                        <SourceLinks r={recipe} />
                      </section>
                      <section className={styles.detailBox}>
                        <div className={styles.detailTop}>
                          <h2>配置与版本历史</h2>
                          <label>
                            配方版本{' '}
                            <select
                              aria-label="配方版本"
                              value={requestedVersion}
                              onChange={(e) => chooseVersion(e.target.value)}
                            >
                              <option value="">
                                当前版本 {recipe.variant.version}
                              </option>
                              {revisions?.revisions.map((r) => (
                                <option value={r.version} key={r.digest}>
                                  {r.version} · {r.releaseDate ?? '日期未提供'}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
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
                                <summary>
                                  原配方的启动参数（不补造运行命令）
                                </summary>
                                <pre className={styles.code}>
                                  <code>
                                    {facts.args.length
                                      ? facts.args.join('\n')
                                      : '来源未提供 extraArgs'}
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
                        <details className={styles.more}>
                          <summary>查看历史提交</summary>
                          <ol className={styles.history}>
                            {revisions?.revisions.map((r) => (
                              <li key={r.digest}>
                                <strong>v{r.version}</strong>
                                <span>{r.releaseDate ?? '日期未提供'}</span>
                                <p>{r.subject}</p>
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
                        </details>
                      </section>
                      {reportUrl(recipe) && (
                        <div className={styles.actions}>
                          <Link to={reportHref(recipe, c.commit, returnTo)}>
                            查看对照报告 →
                          </Link>
                        </div>
                      )}
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
