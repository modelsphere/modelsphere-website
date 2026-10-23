import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useLocation } from '@docusaurus/router';
import { config, detailHref, modelHref, recipesOf, reportUrl } from './data';
import { SourceState } from './components';
import { useCatalog } from './useCatalog';
import { catalogReturnTo } from './routes';
import ReportPanel from './ReportPanel';
import styles from './styles.module.css';

export default function ReportPage() {
  const browser = useIsBrowser(),
    location = useLocation();
  const params = new URLSearchParams(browser ? location.search : ''),
    modelId = params.get('modelId') ?? '',
    recipeId = params.get('recipeId') ?? '',
    returnTo = catalogReturnTo(params.get('returnTo'));
  const state = useCatalog(params.get('dataVersion') ?? ''),
    c = state.catalog;
  const recipe = recipesOf(c).find(
    (r) => r.model.name === modelId && r.variant.id === recipeId,
  );
  const title = recipe
    ? `${recipe.model.displayName ?? modelId} · 对照报告`
    : '对照报告';
  const invalid = !modelId || !recipeId;
  return (
    <Layout
      title={title}
      description="查看部署配方的基线、调优配置与源报告记录。"
    >
      <Head>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <main id="main-content" className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topbar}>
            <nav aria-label="面包屑">
              <Link to={returnTo}>模型目录</Link>
              {recipe && !state.unavailable && (
                <>
                  <span>/</span>
                  <Link to={modelHref(recipe.model, c.commit, returnTo)}>
                    {recipe.model.displayName ?? modelId}
                  </Link>
                </>
              )}
              <span>/</span>
              <span>对照报告</span>
            </nav>
            <SourceState {...state} />
          </div>
          {!browser ? (
            <section>
              <h1>对照报告</h1>
              <p className={styles.notice}>
                对照报告需要 JavaScript。
                <a href={config.baseUrl}>阅读原始目录</a>
              </p>
            </section>
          ) : invalid ? (
            <section className={styles.empty}>
              <h1>报告参数不完整</h1>
              <p>请从模型目录或部署配方中的报告入口访问。</p>
            </section>
          ) : state.unavailable ? (
            <section className={styles.empty}>
              <h1>
                {state.status === 'loading'
                  ? '正在读取指定目录版本…'
                  : '目录版本不可用'}
              </h1>
              <p>{state.error}</p>
              <Link to="/models">打开当前目录</Link>
            </section>
          ) : !recipe ? (
            <section className={styles.empty}>
              <h1>
                {state.status === 'loading'
                  ? '正在确认记录…'
                  : state.status === 'error'
                    ? '来源不可用，尚无法确认记录'
                    : '未找到模型或配方'}
              </h1>
              <p>
                所选标识：{modelId} / {recipeId}
              </p>
            </section>
          ) : (
            <>
              <header className={styles.detailHero}>
                <span className={styles.eyebrow}>PERFORMANCE REPORT</span>
                <h1>{title}</h1>
                <p>部署配方：{recipe.variant.id}</p>
                <Link to={detailHref(recipe, c.commit, undefined, returnTo)}>
                  查看部署配方与历史 →
                </Link>
              </header>
              {reportUrl(recipe) ? (
                <ReportPanel
                  key={recipe.key + c.commit}
                  r={recipe}
                  commit={c.commit}
                />
              ) : (
                <p className={styles.notice} role="status">
                  该配方暂无可用对照报告，请查看部署配方或选择其他配方。
                </p>
              )}
            </>
          )}
          <div className={styles.actions}>
            <Link to={returnTo}>返回模型目录</Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
