import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './community.module.css';

export default function Community() {
  return (
    <Layout
      title="社区生态"
      description="ModelSphere 社区生态即将开放。与开发者一起，连接模型、算力与更多可能。"
    >
      <main id="main-content" className={styles.page}>
        <section className={styles.content} aria-labelledby="community-title">
          <span className={styles.eyebrow}>COMMUNITY & ECOSYSTEM</span>
          <div className={styles.constellation} aria-hidden="true">
            <svg viewBox="0 0 240 180" fill="none">
              <ellipse cx="120" cy="90" rx="100" ry="64" />
              <ellipse
                cx="120"
                cy="90"
                rx="64"
                ry="80"
                transform="rotate(45 120 90)"
              />
              <path d="m38 52 82 38 80-24M120 90l-22 68" />
              <circle cx="38" cy="52" r="7" />
              <circle cx="200" cy="66" r="6" />
              <circle cx="98" cy="158" r="5" />
            </svg>
            <span className={styles.symbol}>
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="11" r="4" />
                <path d="M8 25v-3a8 8 0 0 1 16 0v3M5 10a3 3 0 0 0 0 6m22-6a3 3 0 0 1 0 6M2 25v-3a6 6 0 0 1 3-5m25 8v-3a6 6 0 0 0-3-5" />
              </svg>
            </span>
          </div>
          <span className={styles.status}>社区生态 · 正在构建</span>
          <h1 id="community-title">
            Coming soon<span>…</span>
          </h1>
          <p className={styles.lead}>连接开发者，共建推理新生态。</p>
          <p className={styles.description}>
            我们正在为交流、协作与灵感准备一片新空间。
            <br />
            期待与你在这里相遇。
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} to="/docs">
              探索文档 <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.secondary} to="/">
              返回首页 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <span className={styles.signature}>OPEN SOURCE · BUILT TOGETHER</span>
        </section>
      </main>
    </Layout>
  );
}
