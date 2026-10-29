import { translate } from '@docusaurus/Translate';
import { useSitePath } from '@site/src/lib/use-site-path';
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
  const { siteHref } = useSitePath();
  const browser = useIsBrowser();
  const location = useLocation();
  const history = useHistory();
  const target = recipeTabHref(browser ? location.search : '', 'performance');
  useEffect(() => {
    if (browser) history.replace(siteHref(target));
  }, [browser, history, target, siteHref]);
  return (
    <Layout
      title={translate({ id: 'site.4fd2e35fdb77', message: '配方详情' })}
      description={translate({
        id: 'site.ed01dc6cea13',
        message: '在配方详情中查看性能对照。',
      })}
    >
      <Head>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <main id="main-content" className={styles.page}>
        <div className={styles.container}>
          <h1>
            {translate({
              id: 'site.15dcec90c0c4',
              message: '正在打开配方详情…',
            })}
          </h1>
          <p className={styles.notice}>
            {translate({
              id: 'site.4e3e8f09c593',
              message:
                '对照报告需要 JavaScript。请在配方详情的“性能对照”标签中阅读。',
            })}
            <a href={config.baseUrl}>
              {translate({ id: 'site.441896a2fb30', message: '阅读原始目录' })}
            </a>
          </p>
          <Link to={browser ? target : '/models'}>
            {browser
              ? translate({ id: 'site.8e1ba57d2cb6', message: '打开配方详情' })
              : translate({ id: 'site.2b89357b9abf', message: '返回模型目录' })}
          </Link>
        </div>
      </main>
    </Layout>
  );
}
