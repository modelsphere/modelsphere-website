import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
export default function DocsPreparing() {
  return (
    <Layout
      title="文档准备中"
      description="ModelSphere 正式开发者文档正在准备中"
    >
      <main id="main-content" className="entry-page">
        <p className="eyebrow">DOCUMENTATION</p>
        <h1>文档准备中</h1>
        <p className="entry-description">
          正式的开发者文档尚未发布。内容就绪后，你可以在这里阅读项目介绍、配置说明和部署指南。
        </p>
        <Link to="/">返回首页 →</Link>
      </main>
    </Layout>
  );
}
