import React from 'react';
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
    title: '上层应用生态',
    description: '标准化\u00a0 API 接入，支持各类 Agent 框架。',
  },
  {
    icon: 'memory',
    title: '模域 ModelSphere 核心底座',
    description: '工业级路由调度、SLO 弹缩、零感知断流自愈与推理引擎编排。',
  },
  {
    icon: 'developer_board',
    title: '下层多元异构算力',
    description: '统一拓扑算力纳管，消除芯片生态壁垒与厂商绑定。',
  },
] as const;

export function ArchitectureDiagram() {
  const diagramUrl = useBaseUrl('/diagrams/modelsphere-architecture.png');
  return (
    <figure
      className={styles.architecture}
      aria-label="ModelSphere 系统分层架构与算力调度拓扑"
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
            系统分层架构与算力调度拓扑
          </strong>
          <span className={styles.topologyStatus}>全栈分层调度协同流</span>
        </div>
        <div className={styles.topologyBody}>
          <img
            src={diagramUrl}
            alt="模域 ModelSphere 系统分层架构与算力调度拓扑：上层应用生态通过 ModelSphere 的路由、限流、PD 分离、KV 缓存、自动扩缩容、断流续写和 AutoTune，连接 vLLM、SGLang 等推理引擎与多元异构算力。"
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
      aria-label="QoS 请求检查与限流机制示意"
      data-home-diagram="qos"
    >
      <div className={styles.diagramHeader}>
        <span>请求保护路径</span>
        <span className={styles.infoBadge}>机制示意</span>
      </div>
      <div className={styles.qosFlow}>
        <div className={styles.flowNode}>
          <span className={styles.nodeSymbol} aria-hidden="true">
            ↗
          </span>
          <strong>推理请求</strong>
          <span>进入服务入口</span>
        </div>
        <span className={styles.flowArrow} aria-hidden="true">
          →
        </span>
        <div className={`${styles.flowNode} ${styles.flowCheck}`}>
          <span className={styles.nodeSymbol} aria-hidden="true">
            ◇
          </span>
          <strong>SLO 检查</strong>
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
            <strong>满足要求 → 正常路由</strong>
            <span>进入推理服务</span>
          </div>
          <div className={styles.backoffOutcome}>
            <strong>超出限制 → HTTP 429</strong>
            <span>Retry-After · 客户端退避重试</span>
          </div>
        </div>
      </div>
      <figcaption className={styles.mechanismCaption}>
        机制示意：检查服务质量要求，超限时返回限流响应。
      </figcaption>
    </figure>
  );
}

export function ScalingDiagram() {
  return (
    <figure
      className={styles.mechanism}
      aria-label="SLO 弹性伸缩机制示意，需求变化后调整副本，遵守边界和冷却期"
      data-home-diagram="scaling"
    >
      <div className={styles.diagramHeader}>
        <span>需求与副本响应</span>
        <span className={styles.infoBadge}>机制示意</span>
      </div>
      <div className={styles.chartLegend} aria-hidden="true">
        <span>
          <i className={styles.demandLegend} /> 请求需求
        </span>
        <span>
          <i className={styles.replicaLegend} /> 服务副本
        </span>
      </div>
      <div className={styles.scalingChart}>
        <span className={styles.chartAxis}>相对变化</span>
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
          <span>需求增长</span>
          <span>扩容响应</span>
          <span>冷却观察</span>
          <span>释放副本</span>
        </div>
      </div>
      <figcaption className={styles.mechanismCaption}>
        机制示意：按服务质量目标调整副本；曲线不代表实测数据。
      </figcaption>
    </figure>
  );
}

const autotuneSteps = [
  { title: '线上推理服务', detail: '以服务场景定义调优目标', symbol: '↗' },
  { title: '收集流量特征', detail: '准备代表性负载与输入', symbol: '≋' },
  { title: '空闲算力调优', detail: '分配资源，搜索候选配置', symbol: '⌘' },
  { title: '产出并验证配置', detail: '阅读报告，核对收益与约束', symbol: '✓' },
  { title: '受控交付部署', detail: '确认配置后部署候选方案', symbol: '↗' },
] as const;

export function AutotuneDiagram() {
  return (
    <figure
      className={styles.autotune}
      aria-label="AutoTune 预览版五步流程，配置经确认后受控部署"
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
          <strong>持续性能优化</strong>
          <span>AutoTune</span>
        </div>
      </div>
      <figcaption className={styles.autotuneCaption}>
        <span className={styles.infoBadge}>预览版流程</span>
        配置经操作者确认后交付部署。
      </figcaption>
    </figure>
  );
}
