import React, { useRef } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import {
  FaultTolerance,
  QosScaling,
  AutotuneEvolution,
  Benchmarks,
  GetStarted,
} from '@site/src/components/HomeSections';
import { useHomeMotion } from '@site/src/components/HomeMotion';
import styles from './index.module.css';

const sources = {
  deployment:
    'https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/README.zh-CN.md#快速开始',
  hardware:
    'https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/README.zh-CN.md#核心特性',
  catalog: '/models',
  continuation:
    'https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/docs/deploy-a-model.md#continuation-gateway-optional',
  continuationSupport:
    'https://github.com/modelsphere/continuation_gateway#readme',
  qos: 'https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/docs/openresty.md',
  scaling:
    'https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/docs/autoscaling.md',
  autotune:
    'https://github.com/modelsphere/llm-autotune/blob/c627ccfc1aeb59590f3732978eb771110488f558/docs/workflow.md',
  github: 'https://github.com/modelsphere/modelsphere',
};

type IconName =
  | 'arrow'
  | 'github'
  | 'server'
  | 'chip'
  | 'rocket'
  | 'tune'
  | 'check'
  | 'book'
  | 'route';
function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'arrow' && <path d="M4 12h16m-6-6 6 6-6 6" />}
      {name === 'github' && (
        <path
          fill="currentColor"
          stroke="none"
          d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
        />
      )}
      {name === 'server' && (
        <>
          <rect x="4" y="3" width="16" height="7" rx="2" />
          <rect x="4" y="14" width="16" height="7" rx="2" />
          <path d="M8 6.5h.01M8 17.5h.01M12 6.5h5M12 17.5h5" />
        </>
      )}
      {name === 'chip' && (
        <>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z" />
        </>
      )}
      {name === 'rocket' && (
        <>
          <path d="M14 4c3-2 6-2 6-2s0 3-2 6l-7 8-5-5 8-7ZM6 11l-3 1-1 5 5-1m4 0-1 5 5-1 1-3M4 20l3-3" />
          <circle cx="15" cy="7" r="1" />
        </>
      )}
      {name === 'tune' && (
        <>
          <path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h10m4 0h2" />
          <circle cx="13" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="16" cy="18" r="2" />
        </>
      )}
      {name === 'check' && <path d="m5 12 4 4L19 6" />}
      {name === 'book' && (
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" />
      )}
      {name === 'route' && (
        <>
          <circle cx="5" cy="5" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M5 7v6a6 6 0 0 0 6 6h6M9 5h6a4 4 0 0 1 0 8h-2m-3-3 3 3-3 3" />
        </>
      )}
    </svg>
  );
}
function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeading} data-home-intro>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      <p className={styles.sectionDescription}>{description}</p>
    </div>
  );
}
type CapabilityIconName =
  | 'settings'
  | 'bolt'
  | 'rocket_launch'
  | 'science'
  | 'published_with_changes'
  | 'adjust';
function CapabilityIcon({ name }: { name: CapabilityIconName }) {
  return (
    <span className={styles.capabilityIcon} aria-hidden="true">
      {name}
    </span>
  );
}
const capabilities: {
  icon: CapabilityIconName;
  title: string;
  tag: string;
  tone: string;
  description: string;
  href: string;
  linkLabel: string;
}[] = [
  {
    icon: 'settings',
    title: '开箱即用，面向生产',
    tag: 'Day One Ready',
    tone: 'blue',
    description:
      '几分钟内即可搭建面向生产环境的AI推理平台，开箱即具备模型服务、调度、弹性伸缩、可观测性和运维等核心能力。提供直观的统一WebUI面板，无需复杂的底层调优即可轻松接管集群。',
    href: sources.deployment,
    linkLabel: '了解部署方式',
  },
  {
    icon: 'bolt',
    title: '统一支持多种异构加速器',
    tag: 'Any Accelerator',
    tone: 'green',
    description:
      '通过统一的平台无缝运行在多种异构AI硬件之上。原生兼容通用GPU，并深度基于EngineX适配华为昇腾、天数智芯、摩尔线程、海光等加速芯片，实现混合节点的统一纳管。',
    href: sources.hardware,
    linkLabel: '查看硬件与引擎说明',
  },
  {
    icon: 'rocket_launch',
    title: '第一时间性能调优和部署',
    tag: 'Zero-Day Ready',
    tone: 'green',
    description:
      '紧跟快速演进的模型生态，通过我们的推理性能优化社区，第一时间完成新模型适配和调优，让最新大模型能够快速导入、配置并部署到生产环境。',
    href: sources.catalog,
    linkLabel: '浏览模型与部署配方',
  },
  {
    icon: 'science',
    title: '性能优化持续演进',
    tag: 'AutoTune Inside',
    tone: 'amber',
    description:
      '持续集成最新的推理优化能力，通过内置AutoTune根据模型、硬件和真实业务负载自动调优，在延迟、吞吐和资源效率之间持续获得更优表现。',
    href: sources.autotune,
    linkLabel: '了解 AutoTune 工作流',
  },
];
function CapabilityDetail({ index }: { index: number }) {
  if (index === 0)
    return (
      <div
        className={styles.deploymentDetail}
        aria-description="按设计稿展示的配置示例，非运行时监控数据。"
      >
        <div>
          <span>
            <CapabilityIcon name="published_with_changes" />
            <span>自动弹性伸缩 (Auto-Scaling)</span>
          </span>
          <strong>ENABLED: 4-32 Pods</strong>
        </div>
        <div>
          <span>
            <CapabilityIcon name="adjust" />
            <span>基于服务质量的动态限流算法</span>
          </span>
          <strong>TTFT &lt; 10s, OPTS &gt; 20</strong>
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className={styles.hardwareDetail}>
        {['华为昇腾', '天数智芯', '摩尔线程', '海光 DCU'].map((name) => (
          <span key={name}>
            <i aria-hidden="true" />
            {name}
          </span>
        ))}
        <span className={styles.hardwareMore}>...</span>
      </div>
    );
  if (index === 2)
    return (
      <div
        className={styles.catalogDetail}
        aria-description="按设计稿展示的模型与认证示例，实际适配范围请查看模型调优库。"
      >
        <div>
          <span>即日认证模型库</span>
          <strong>100% 官方适配通过</strong>
        </div>
        <div className={styles.recipeChips}>
          {[
            'DeepSeek-V4-Pro',
            'DeepSeek-V4-Flash-0731',
            'Qwen3.8-2.4T-A95B',
            'Kimi-K3',
            'MiniMax-M3',
            'GLM-5.3-Flash',
          ].map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>
    );
  return (
    <div
      className={styles.tuningDetail}
      aria-description="设计稿吞吐对比示例，不代表实测性能或收益保证。"
    >
      <div className={styles.throughputHeading}>
        <span>相对吞吐（优化后=100%）</span>
        <strong>较基准提升约285%</strong>
      </div>
      <div className={styles.throughputRow}>
        <div>
          <span>常规基准产能</span>
          <strong>26%</strong>
        </div>
        <div className={styles.throughputTrack}>
          <span className={styles.baselineBar} />
        </div>
      </div>
      <div className={styles.throughputRow}>
        <div>
          <span>优化后产能</span>
          <strong>100% 满血</strong>
        </div>
        <div className={styles.throughputTrack}>
          <span className={styles.optimizedBar} />
        </div>
      </div>
    </div>
  );
}
function CapabilityDescription({ index }: { index: number }) {
  if (index !== 2) return <>{capabilities[index].description}</>;
  return (
    <>
      紧跟快速演进的模型生态，通过我们的
      <a
        className={styles.communityLink}
        href="#benchmarks"
        aria-label="推理性能优化社区"
      >
        推理性能优化社区
      </a>
      ，第一时间完成新模型适配和调优，让最新大模型能够快速导入、配置并部署到生产环境。
    </>
  );
}
export default function Home() {
  const root = useRef<HTMLElement>(null);
  useHomeMotion(root);
  return (
    <Layout
      title="大模型推理基础设施"
      description="模域 ModelSphere：基于 Kubernetes 的开源大模型推理基础设施，连接模型部署、异构算力、服务质量控制与负载驱动的性能优化。"
    >
      <Head>
        <title>模域 ModelSphere | 大模型推理基础设施</title>
      </Head>
      <main ref={root} id="main-content" data-home-page className={styles.page}>
        <section id="hero" className={styles.hero} aria-labelledby="home-title">
          <div className={styles.container}>
            <div
              className={styles.heroTags}
              role="list"
              aria-label="首页能力速览"
            >
              <span role="listitem" data-home-tag="architecture">
                <span>先进推理服务架构</span>
              </span>
              <span role="listitem" data-home-tag="day-one">
                <span>新模型首日高性能部署</span>
              </span>
              <span role="listitem" data-home-tag="hardware">
                <span>广泛异构算力统一纳管</span>
              </span>
              <span role="listitem" data-home-tag="evolution">
                <span>性能持续自演进</span>
              </span>
            </div>
            <div className={styles.heroCopy}>
              <h1 id="home-title" data-home-hero="title">
                模域 ModelSphere<span>生产级算力部署与推理优化开源平台</span>
              </h1>
              <p className={styles.heroLead} data-home-hero="lead">
                让大模型推理从“能跑”到“生产好用”，让每张 GPU 化身高效 Token
                产线。
              </p>
              <p
                className={styles.heroDescription}
                data-home-hero="description"
              >
                基于 Kubernetes 构建，将模型部署、缓存感知路由、
                <a href="#qos-scaling">按 SLO 弹性伸缩</a>
                、全维可观测性、
                <a href="#fault-tolerance">挂起故障秒级自愈</a>与{' '}
                <a href="#autotune-evolution">AutoTune 闭环</a>
                组织成一套工业级推理调度系统，帮助开发者在复杂异构算力上稳定承载大规模生产流量。
              </p>
            </div>
            <div className={styles.heroActions}>
              <Link
                className={`${styles.action} ${styles.primaryAction}`}
                to="/docs"
              >
                快速开始 Quickstart
                <Icon name="arrow" />
              </Link>
              <a
                className={styles.action}
                href={sources.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="github" />
                GitHub 源码仓库<span className="sr-only">（新窗口打开）</span>
              </a>
              <Link className={styles.action} to={sources.catalog}>
                <Icon name="tune" />
                模型调优库 (Model Catalog)
              </Link>
            </div>
          </div>
        </section>
        <section
          id="comparison"
          className={styles.section}
          aria-label="四大核心技术"
        >
          <div className={styles.container}>
            <SectionHeading
              eyebrow="Architectural Pillars"
              title="四大核心技术：直击大模型落地深水区"
              description="为生产级严肃工程而生。模域将前沿学术成果与大规模线上运维沉淀收敛为标准化的平台体系。"
            />
            <div
              className={styles.capabilityGrid}
              data-home-reveal="comparison"
              data-home-pair=""
            >
              {capabilities.map((card, index) => (
                <article
                  key={card.title}
                  className={styles.capabilityCard}
                  data-tone={card.tone}
                >
                  <div className={styles.cardHeading}>
                    <div>
                      <span className={styles.iconTile}>
                        <CapabilityIcon name={card.icon} />
                      </span>
                      <h3>
                        <a
                          className={styles.cardTitleLink}
                          href={card.href}
                          target={
                            card.href.startsWith('/') ? undefined : '_blank'
                          }
                          rel={
                            card.href.startsWith('/')
                              ? undefined
                              : 'noopener noreferrer'
                          }
                          aria-label={
                            card.href.startsWith('/')
                              ? card.linkLabel
                              : `${card.linkLabel}（新窗口打开）`
                          }
                        >
                          {card.title}
                        </a>
                      </h3>
                    </div>
                    <span className={styles.badge}>{card.tag}</span>
                  </div>
                  <p>
                    <CapabilityDescription index={index} />
                  </p>
                  <div className={styles.capabilityDetail}>
                    <CapabilityDetail index={index} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <FaultTolerance />
        <QosScaling />
        <AutotuneEvolution />
        <Benchmarks />
        <GetStarted />
      </main>
    </Layout>
  );
}
