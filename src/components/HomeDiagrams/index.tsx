import { translate } from '@docusaurus/Translate';
import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

type DiagramIconName = 'hub' | 'memory' | 'developer_board' | 'account_tree';

function DiagramIcon({ name }: { name: DiagramIconName }) {
  return (
    <span className={styles.diagramIcon} aria-hidden="true">
      {name}
    </span>
  );
}

const ecosystem = [
  {
    icon: 'hub',
    title: translate({ id: 'site.f392b2e9649a', message: '上层应用生态' }),
    description: translate({
      id: 'site.16b004ffab58',
      message: '标准化  API 接入，支持各类 Agent 框架。',
    }),
  },
  {
    icon: 'memory',
    title: translate({
      id: 'site.39bc64bbc91f',
      message: '模域 ModelSphere 核心底座',
    }),
    description: translate({
      id: 'site.dc956c11f710',
      message: '工业级路由调度、SLO 弹缩、零感知断流自愈与推理引擎编排。',
    }),
  },
  {
    icon: 'developer_board',
    title: translate({ id: 'site.ab33ee65f2ee', message: '下层多元异构算力' }),
    description: translate({
      id: 'site.856f3ee6db16',
      message: '统一拓扑算力纳管，消除芯片生态壁垒与厂商绑定。',
    }),
  },
] as const;

export function ArchitectureDiagram() {
  const { i18n } = useDocusaurusContext();
  const diagramUrl = useBaseUrl(
    i18n.currentLocale === 'en'
      ? '/diagrams/modelsphere-architecture.en.svg'
      : '/diagrams/modelsphere-architecture.png',
  );
  return (
    <figure
      className={styles.architecture}
      aria-label={translate({
        id: 'site.8f575cabd8c0',
        message: 'ModelSphere 系统分层架构与算力调度拓扑',
      })}
      data-home-diagram="architecture"
      data-home-architecture
    >
      <div className={styles.ecosystem}>
        {ecosystem.map((tier) => (
          <div className={styles.ecosystemTier} key={tier.title}>
            <div className={styles.tierTitle}>
              <DiagramIcon name={tier.icon} />
              <strong>{tier.title}</strong>
            </div>
            <p>{tier.description}</p>
          </div>
        ))}
      </div>
      <div className={styles.topology}>
        <div className={styles.topologyHeading}>
          <strong>
            <DiagramIcon name="account_tree" />
            {translate({
              id: 'site.0101783bda9e',
              message: '系统分层架构与算力调度拓扑',
            })}
          </strong>
          <span className={styles.topologyStatus}>
            {translate({
              id: 'site.317f4acab44f',
              message: '全栈分层调度协同流',
            })}
          </span>
        </div>
        <div className={styles.topologyBody}>
          <img
            src={diagramUrl}
            alt={translate({
              id: 'site.0a4af1dd5219',
              message:
                '模域 ModelSphere 系统分层架构与算力调度拓扑：上层应用生态通过 ModelSphere 的路由、限流、PD 分离、KV 缓存、自动扩缩容、断流续写和 AutoTune，连接 vLLM、SGLang 等推理引擎与多元异构算力。',
            })}
            width={2675}
            height={744}
          />
        </div>
      </div>
    </figure>
  );
}

export function QosDiagram() {
  return (
    <figure
      className={styles.mechanism}
      aria-label={translate({
        id: 'site.340bc68d8384',
        message: 'QoS 请求检查与限流机制示意',
      })}
      data-home-diagram="qos"
    >
      <div className={styles.diagramHeader}>
        <span>
          {translate({ id: 'site.aaa967021a52', message: '请求保护路径' })}
        </span>
        <span className={styles.infoBadge}>
          {translate({ id: 'site.95da713cb4a5', message: '机制示意' })}
        </span>
      </div>
      <div className={styles.qosFlow}>
        <div className={styles.flowNode}>
          <span className={styles.nodeSymbol} aria-hidden="true">
            ↗
          </span>
          <strong>
            {translate({ id: 'site.3b5151864eab', message: '推理请求' })}
          </strong>
          <span>
            {translate({ id: 'site.7f2c9744f20c', message: '进入服务入口' })}
          </span>
        </div>
        <span className={styles.flowArrow} aria-hidden="true">
          →
        </span>
        <div className={`${styles.flowNode} ${styles.flowCheck}`}>
          <span className={styles.nodeSymbol} aria-hidden="true">
            ◇
          </span>
          <strong>
            {translate({ id: 'site.0a334d6e7c58', message: 'SLO 检查' })}
          </strong>
          <span>TTFT / OTPS</span>
        </div>
        <svg
          className={styles.branchLines}
          viewBox="0 0 48 136"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className={styles.routePath} d="M2 68H16V32H44m-6-5 6 5-6 5" />
          <path className={styles.backoffPath} d="M16 68v36h28m-6-5 6 5-6 5" />
        </svg>
        <div className={styles.flowOutcomes}>
          <div className={styles.routeOutcome}>
            <strong>
              {translate({
                id: 'site.5807ed1817b9',
                message: '满足要求 → 正常路由',
              })}
            </strong>
            <span>
              {translate({ id: 'site.83815bddfab7', message: '进入推理服务' })}
            </span>
          </div>
          <div className={styles.backoffOutcome}>
            <strong>
              {translate({
                id: 'site.8e6adde9d95c',
                message: '超出限制 → HTTP 429',
              })}
            </strong>
            <span>
              {translate({
                id: 'site.9c76b16d5ed6',
                message: 'Retry-After · 客户端退避重试',
              })}
            </span>
          </div>
        </div>
      </div>
      <figcaption className={styles.mechanismCaption}>
        {translate({
          id: 'site.f49fbb74705e',
          message: '机制示意：检查服务质量要求，超限时返回限流响应。',
        })}
      </figcaption>
    </figure>
  );
}

export function ScalingDiagram() {
  return (
    <figure
      className={styles.mechanism}
      aria-label={translate({
        id: 'site.09362d2788c7',
        message: 'SLO 弹性伸缩机制示意，需求变化后调整副本，遵守边界和冷却期',
      })}
      data-home-diagram="scaling"
    >
      <div className={styles.diagramHeader}>
        <span>
          {translate({ id: 'site.cd52bc125d5f', message: '需求与副本响应' })}
        </span>
        <span className={styles.infoBadge}>
          {translate({ id: 'site.95da713cb4a5', message: '机制示意' })}
        </span>
      </div>
      <div className={styles.chartLegend} aria-hidden="true">
        <span>
          <i className={styles.demandLegend} />{' '}
          {translate({ id: 'site.e978b66589bf', message: ' 请求需求' })}
        </span>
        <span>
          <i className={styles.replicaLegend} />{' '}
          {translate({ id: 'site.944591925157', message: ' 服务副本' })}
        </span>
      </div>
      <div className={styles.scalingChart}>
        <span className={styles.chartAxis}>
          {translate({ id: 'site.d26b480dd563', message: '相对变化' })}
        </span>
        <svg viewBox="0 0 480 144" aria-hidden="true">
          <path
            className={styles.gridLine}
            d="M12 24H468M12 64H468M12 104H468"
          />
          <path className={styles.axisLine} d="M12 8V128H468" />
          <path
            className={styles.demandPath}
            d="M12 108C58 108 70 100 100 94S145 80 170 54 205 24 245 29 290 46 320 68 350 93 390 100 435 106 468 106"
          />
          <path
            className={styles.replicaPath}
            d="M12 112H110V88H180V48H270V66H340V88H410V112H468"
          />
        </svg>
        <div className={styles.chartStages} aria-hidden="true">
          <span>
            {translate({ id: 'site.58ea3addd7ef', message: '需求增长' })}
          </span>
          <span>
            {translate({ id: 'site.e28ab28eba82', message: '扩容响应' })}
          </span>
          <span>
            {translate({ id: 'site.5341c36ba310', message: '冷却观察' })}
          </span>
          <span>
            {translate({ id: 'site.0541281d4674', message: '释放副本' })}
          </span>
        </div>
      </div>
      <figcaption className={styles.mechanismCaption}>
        {translate({
          id: 'site.04d10e7e5587',
          message: '机制示意：按服务质量目标调整副本；曲线不代表实测数据。',
        })}
      </figcaption>
    </figure>
  );
}

const autotuneSteps = [
  {
    title: translate({ id: 'site.15f0b92fe41e', message: '线上推理服务' }),
    detail: translate({
      id: 'site.ab2c8f045d4f',
      message: '以服务场景定义调优目标',
    }),
    symbol: '↗',
  },
  {
    title: translate({ id: 'site.7c9f676819cf', message: '收集流量特征' }),
    detail: translate({
      id: 'site.a7dfb02d383e',
      message: '准备代表性负载与输入',
    }),
    symbol: '≋',
  },
  {
    title: translate({ id: 'site.6242b65a776c', message: '空闲算力调优' }),
    detail: translate({
      id: 'site.9483f90db1ec',
      message: '分配资源，搜索候选配置',
    }),
    symbol: '⌘',
  },
  {
    title: translate({ id: 'site.3a8d95379980', message: '产出并验证配置' }),
    detail: translate({
      id: 'site.774796fe0151',
      message: '阅读报告，核对收益与约束',
    }),
    symbol: '✓',
  },
  {
    title: translate({ id: 'site.a5aef2a2cfc5', message: '受控交付部署' }),
    detail: translate({
      id: 'site.8da9c5ba9708',
      message: '确认配置后部署候选方案',
    }),
    symbol: '↗',
  },
] as const;

export function AutotuneDiagram() {
  return (
    <figure
      className={styles.autotune}
      aria-label={translate({
        id: 'site.58283660b4ac',
        message: 'AutoTune 预览版五步流程，配置经确认后受控部署',
      })}
      data-home-diagram="autotune"
    >
      <div className={styles.autotuneFlow}>
        <ol className={styles.autotuneSteps}>
          {autotuneSteps.map((step, index) => (
            <li className={styles.autotuneStep} key={step.title}>
              <div className={styles.autotuneStepHeader}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <strong>{step.title}</strong>
              </div>
              <p>{step.detail}</p>
              <div className={styles.stepIllustration} aria-hidden="true">
                <span>{step.symbol}</span>
                <i />
                <i />
                <i />
              </div>
            </li>
          ))}
        </ol>
        <div className={styles.autotuneCenter} aria-hidden="true">
          <span className={styles.cycleSymbol}>↻</span>
          <strong>
            {translate({ id: 'site.541df25f2a2b', message: '持续性能优化' })}
          </strong>
          <span>AutoTune</span>
        </div>
      </div>
      <figcaption className={styles.autotuneCaption}>
        <span className={styles.infoBadge}>
          {translate({ id: 'site.9d81bf342869', message: '预览版流程' })}
        </span>
        {translate({
          id: 'site.3436bda5460b',
          message: '配置经操作者确认后交付部署。',
        })}
      </figcaption>
    </figure>
  );
}
