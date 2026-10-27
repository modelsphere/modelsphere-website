import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { baselineInfo, config } from '../../features/catalog/data';
import styles from '../../features/catalog/styles.module.css';
export default function Evidence() {
  return (
    <Layout
      title="目录数据来源与可靠性"
      description="明确区分来源记录、规则解释与源数据缺失信息。"
    >
      <main id="main-content" className={`${styles.page} ${styles.evidence}`}>
        <div className={styles.container}>
          <div className={styles.topbar}>
            <Link to="/models">← 模型目录</Link>
          </div>
          <h1>目录数据来源与可靠性</h1>
          <p>
            “有来源”表示能追溯到公开记录，不表示本站独立复测或提供生产认证。当前数据源：
            <a href={config.baseUrl}>Model Catalog</a>。
          </p>
          <section>
            <h2>明确记录，有可核查来源</h2>
            <ul>
              <li>
                模型标识、名称、家族、技术标签、简介与 Hugging Face 仓库引用。
              </li>
              <li>
                配方标识、版本、引擎名称、镜像引用、Chart 要求、硬件型号、GPU
                数量与部署拓扑。
              </li>
              <li>
                已提交的完整 YAML、其 SHA-256、Git
                提交、配方发布日期与版本历史。配置加载后校验 SHA-256。
              </li>
              <li>
                调优记录明确绑定的 baseline / optimized
                版本、各负载的记录增幅及原报告链接。
              </li>
              <li>
                模型数、配方数、调优对照组数和覆盖模型比例，均由当前目录计数。目录包含模拟模型；同一模型可有多组对照。
              </li>
            </ul>
          </section>
          <section>
            <h2>经过规则解释，存在缺省或口径限制</h2>
            <ul>
              <li>
                “吞吐量提升”取该配方已记录负载中的最大百分比，卡片同时显示负载和测量版本；排序使用同一数值。
              </li>
              <li>
                统计卡按每个优化配方的最新测量版本逐组统计；每组取最佳负载增幅，没有分负载时取记录中的
                uplift。中位数、范围与最佳提升均由这些有效值计算，缺失值不参与；最佳提升链接到对应配方的性能对照。
              </li>
              <li>
                缺少 defaultVariant
                时，沿用来源约定，以第一套配方作为默认项；“默认”不表示“官方基线”。
              </li>
              <li>
                缺少拓扑时按源协议解释为单节点；硬件简称为展示转换，完整名称保留在配置与筛选中。
              </li>
              <li>
                某些报告采用归一化到固定 GPU 数量的吞吐指标，baseline
                与候选可能使用不同 GPU 数量。数值与测量版本按原报告阅读。
              </li>
              <li>
                配方发布日期来自 Git
                提交，不是压测日期；本次读取或基线采集时间也不是上游验证时间。
              </li>
              <li>
                字段缺失时显示“未提供”，百分比不以 0
                补齐；参数仅展示配方明确包含的值，不根据配方名称补造。
              </li>
            </ul>
          </section>
          <section>
            <h2>当前源数据没有，页面不补造</h2>
            <ul>
              <li>
                全目录统一的生产验证、硬件适配认证、CERTIFIED、100% 官方适配和
                SLA。
              </li>
              <li>
                统一验证版本、实时同步状态、实时服务健康、集群可用 GPU
                库存，以及用户登录能力。
              </li>
              <li>
                统一口径的全目录吞吐提升中位数 /
                最高值结论和完整、独立复现证明。
              </li>
              <li>
                原设计中的 Qwen H800 +29.3%、Kimi H200 CuTe +49.2%、DeepSeek Pro
                Ascend 认证配方、Qwen3.6-2.4T-A96B，均不作为真实记录发布。
              </li>
            </ul>
          </section>
          <section>
            <h2>读取失败与版本边界</h2>
            <p>
              当前先使用公开 GitHub Pages / raw
              GitHub。读取失败保留带版本的构建基线，并提供重试。该公开源没有任意目录快照接口；无法恢复指定版本时显示不可用，不切换成其他版本。
            </p>
            <p>
              构建基线采集：{baselineInfo.retrievedAt}；数据提交：
              <a
                href={`${config.repository}/commit/${baselineInfo.dataCommit}`}
              >
                {baselineInfo.dataCommit}
              </a>
              。
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
