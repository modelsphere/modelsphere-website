import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useHistory, useLocation } from '@docusaurus/router';
import { config } from './data';
import { recipeTabHref } from './routes';
import styles from './styles.module.css';

// Keep published report links usable after consolidating recipe details.
export default function ReportPage() {
  const browser = useIsBrowser();
  const location = useLocation();
  const history = useHistory();
  const target = recipeTabHref(browser ? location.search : '', 'performance');
  useEffect(() => {
    if (browser) history.replace(target);
  }, [browser, history, target]);
  return (
    <Layout title="配方详情" description="在配方详情中查看性能对照。">
      <Head>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <main id="main-content" className={styles.page}>
        <div className={styles.container}>
          <h1>正在打开配方详情…</h1>
          <p className={styles.notice}>
            对照报告需要 JavaScript。请在配方详情的“性能对照”标签中阅读。
            <a href={config.baseUrl}>阅读原始目录</a>
          </p>
          <Link to={browser ? target : '/models'}>
            {browser ? '打开配方详情' : '返回模型目录'}
          </Link>
        </div>
      </main>
    </Layout>
  );
}
