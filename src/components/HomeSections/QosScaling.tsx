import { translate } from '@docusaurus/Translate';
import React from 'react';
import styles from './qos-scaling.module.css';

function Symbol({ name }: { name: string }) {
  return (
    <span
      className={`material-symbols-outlined ${styles.symbol}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
// Geometry from Google's Material Symbols, matching the selected Stitch screen.
function RateIcon({
  name,
}: {
  name:
    | 'tune'
    | 'warning'
    | 'info'
    | 'insight'
    | 'arrow'
    | 'verified'
    | 'heartShield'
    | 'settingsSuggest'
    | 'shield'
    | 'document'
    | 'trend'
    | 'cube'
    | 'layers';
}) {
  const paths = {
    tune: 'M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z',
    warning:
      'm40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z',
    info: 'M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
    insight:
      'M240-80v-172q-57-52-88.5-121.5T120-520q0-150 105-255t255-105q125 0 221.5 73.5T827-615l52 205q5 19-7 34.5T840-360h-80v120q0 33-23.5 56.5T680-160h-80v80h-80v-160h160v-200h108l-38-155q-23-91-98-148t-172-57q-116 0-198 81t-82 197q0 60 24.5 114t69.5 96l26 24v208h-80Zm254-360Zm-14 120q17 0 28.5-11.5T520-360q0-17-11.5-28.5T480-400q-17 0-28.5 11.5T440-360q0 17 11.5 28.5T480-320Zm-30-128h61q0-25 6.5-40.5T544-526q18-20 35-40.5t17-53.5q0-42-32.5-71T483-720q-40 0-72.5 23T365-637l55 23q7-22 24.5-35.5T483-663q22 0 36.5 12t14.5 31q0 21-12.5 37.5T492-549q-20 21-31 42t-11 59Z',
    arrow: 'M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z',
    verified:
      'm344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32-76 128-136-58-136 58Zm34-102 102-44 104 44 56-96 110-26-10-112 74-84-74-86 10-112-110-24-58-96-102 44-104-44-56 96-110 24 10 112-74 86 74 84-10 114 110 24 58 96Zm102-318Zm-42 142 226-226-56-58-170 170-86-84-56 56 142 142Z',
    heartShield:
      'M480-320q102-92 131-129.5t29-74.5q0-36-26-62t-62-26q-21 0-40.5 8.5T480-580q-12-15-31-23.5t-41-8.5q-36 0-62 26t-26 62q0 19 5 35t22 37.5q17 21.5 48.5 52.5t84.5 79Zm0 240q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Z',
    settingsSuggest:
      'm18.525 9-1.1-2.4-2.4-1.1 2.4-1.1 1.1-2.4 1.1 2.4 2.4 1.1-2.4 1.1Zm2 7-.8-1.7-1.7-.8 1.7-.8.8-1.7.8 1.7 1.7.8-1.7.8Zm-13 6-.3-2.35q-.2-.075-.387-.2-.188-.125-.313-.25l-2.2.95L1.85 15.8l1.875-1.4v-.8L1.85 12.2l2.475-4.35 2.2.95q.125-.125.313-.25.187-.125.387-.2l.3-2.35h5l.3 2.35q.2.075.388.2.187.125.312.25l2.2-.95L18.2 12.2l-1.875 1.4v.8l1.875 1.4-2.475 4.35-2.2-.95q-.125.125-.312.25-.188.125-.388.2l-.3 2.35Zm2.5-5q1.25 0 2.125-.875T13.025 14q0-1.25-.875-2.125T10.025 11q-1.25 0-2.125.875T7.025 14q0 1.25.875 2.125t2.125.875Zm0-2q-.425 0-.713-.288-.287-.287-.287-.712t.287-.713Q9.6 13 10.025 13t.713.287q.287.288.287.713t-.287.712q-.288.288-.713.288Zm-.75 5h1.5l.2-1.8q.725-.2 1.238-.512.512-.313 1.012-.838l1.65.75.7-1.25-1.45-1.1q.2-.575.2-1.25t-.2-1.25l1.45-1.1-.7-1.25-1.65.75q-.5-.525-1.012-.838Q11.7 10 10.975 9.8l-.2-1.8h-1.5l-.2 1.8q-.725.2-1.237.512-.513.313-1.013.838l-1.65-.75-.7 1.25 1.45 1.1q-.2.575-.212 1.25-.013.675.212 1.25l-1.45 1.1.7 1.25 1.65-.75q.5.525 1.013.838.512.312 1.237.512Zm.75-6Z',
    shield:
      'm438-338 226-226-57-57-169 169-84-84-57 57 141 141Zm42 258q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Z',
    document:
      'M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z',
    trend:
      'm136-240-56-56 296-298 160 160 208-206H640v-80h240v240h-80v-104L536-320 376-480 136-240Z',
    cube: 'M480-80 120-280v-400l360-200 360 200v400L480-80ZM364-590q23-24 53-37t63-13q33 0 63 13t53 37l120-67-236-131-236 131 120 67Zm76 396v-131q-54-14-87-57t-33-98q0-11 1-20.5t4-19.5l-125-70v263l240 133Zm40-206q33 0 56.5-23.5T560-480q0-33-23.5-56.5T480-560q-33 0-56.5 23.5T400-480q0 33 23.5 56.5T480-400Zm40 206 240-133v-263l-125 70q3 10 4 19.5t1 20.5q0 55-33 98t-87 57v131Z',
    layers:
      'M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z',
  };
  return (
    <svg
      aria-hidden="true"
      className={styles.svgIcon}
      viewBox={name === 'settingsSuggest' ? '0 0 24 24' : '0 -960 960 960'}
      fill="currentColor"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function RateArrow({ primary = false }: { primary?: boolean }) {
  return (
    <div
      className={`${styles.rateArrow} ${primary ? styles.primaryArrow : ''}`}
      data-qos-arrow=""
      aria-hidden="true"
    >
      <RateIcon name="arrow" />
    </div>
  );
}

// Content and icon geometry follow the two selected Stitch screens.
export function QosScaling() {
  return (
    <>
      <DynamicRateLimiting />
      <DynamicScaling />
    </>
  );
}

function DynamicRateLimiting() {
  const gradient = React.useId();
  return (
    <section
      id="qos-scaling"
      data-home-design=""
      className={`w-full py-12 px-margin bg-slate-50/70 border-b border-slate-200/70 ${styles.section} ${styles.rateSection}`}
      aria-labelledby="dynamic-rate-title"
    >
      <div className={`${styles.rateContainer} mx-auto`}>
        <header className={styles.rateIntro} data-home-intro="">
          <span className={styles.introPill}>
            <i aria-hidden="true" />
            {translate({
              id: 'home.qos.ratePill',
              message: '全局吞吐与 SLO 自适应保障机制',
            })}
          </span>
          <h2 id="dynamic-rate-title" className={styles.title}>
            ModelSphere{' '}
            <span>
              {translate({ id: 'home.qos.rateTitle', message: '动态限流' })}
            </span>
            {translate({
              id: 'home.qos.rateTitleEnd',
              message: '：在保障服务质量的前提下，最大化算力利用',
            })}
          </h2>
          <p className={styles.valueBanner}>
            <span className={styles.shieldBadge}>
              <RateIcon name="shield" />
            </span>
            {translate({
              id: 'home.qos.rateSubtitle',
              message:
                '让平台上的所有大模型服务，都持续满足预期的服务质量（如响应速度、生成流畅度、确定性低抖动）',
            })}
          </p>
        </header>
        <div
          className={styles.rateWorkflow}
          data-home-pair=""
          data-home-reveal="panel"
        >
          <div className={styles.staticComparison}>
            <article className={styles.rateCard} data-qos-card="static">
              <div className={styles.rateBody}>
                <div className={styles.cardEyebrow} data-qos-card-header="">
                  <span className={styles.neutralPill}>
                    {translate({
                      id: 'home.qos.staticPill',
                      message: '传统静态模式',
                    })}
                  </span>
                  <RateIcon name="tune" />
                </div>
                <h3>
                  {translate({
                    id: 'home.qos.staticTitle',
                    message: '传统静态限流',
                  })}
                </h3>
                <p className={styles.cardSubtitle}>
                  {translate({
                    id: 'home.qos.staticSubtitle',
                    message: '按固定次数/固定上限一刀切配置硬阈值',
                  })}
                </p>
                <div className={styles.staticChart}>
                  <div className={styles.staticPlot}>
                    <div
                      className={styles.staticLimit}
                      data-qos-static-limit=""
                    >
                      <span>
                        {translate({
                          id: 'home.qos.concurrencyLimit',
                          message: '并发上限',
                        })}
                      </span>
                      <i />
                    </div>
                    <div className={styles.staticBars}>
                      <i data-qos-static-bar="" />
                      <i data-qos-static-bar="" />
                    </div>
                  </div>
                  <div className={styles.staticLabels}>
                    <div>
                      {translate({
                        id: 'home.qos.simpleRequest',
                        message: '简单请求',
                      })}
                      <small>
                        {translate({
                          id: 'home.qos.simpleDetail',
                          message: '（算力有富余）',
                        })}
                      </small>
                    </div>
                    <div>
                      {translate({
                        id: 'home.qos.complexRequest',
                        message: '复杂请求',
                      })}
                      <small>
                        {translate({
                          id: 'home.qos.complexDetail',
                          message: '（容易变慢）',
                        })}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              <p className={styles.cardFootnote}>
                <RateIcon name="info" />
                <span>
                  {translate({
                    id: 'home.qos.staticNote',
                    message: '固定阈值无法感知真实算力负载，旱涝不均。',
                  })}
                </span>
              </p>
            </article>
            <article
              className={`${styles.rateCard} ${styles.problemCard}`}
              data-qos-card="challenge"
            >
              <RateArrow />
              <div className={styles.rateBody}>
                <div className={styles.cardEyebrow} data-qos-card-header="">
                  <span className={styles.warningPill}>
                    {translate({
                      id: 'home.qos.problemPill',
                      message: '核心矛盾与挑战',
                    })}
                  </span>
                  <RateIcon name="warning" />
                </div>
                <h3>
                  {translate({
                    id: 'home.qos.problemTitle',
                    message: '为什么静态限流很难做好？',
                  })}
                </h3>
                <p className={styles.cardSubtitle}>
                  {translate({
                    id: 'home.qos.problemSubtitle',
                    message: '大模型计算特征具备非线性的本质波动',
                  })}
                </p>
                <div className={styles.problems}>
                  <div className={styles.problem}>
                    <span className={styles.iconTile}>
                      <RateIcon name="document" />
                    </span>
                    <div>
                      <h4>
                        {translate({
                          id: 'home.qos.differentRequests',
                          message: '请求差异巨大',
                        })}
                      </h4>
                      <p>
                        {translate({
                          id: 'home.qos.differentRequestsDetail',
                          message:
                            '简单日常问答与 32k+ 长代码分析的显存占用、KV Cache 与时长相差可达数十倍。',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className={styles.problem}>
                    <span className={styles.iconTile}>
                      <RateIcon name="trend" />
                    </span>
                    <div>
                      <div className={styles.problemHeading}>
                        <h4>
                          {translate({
                            id: 'home.qos.changingCapacity',
                            message: '处理能力实时变化',
                          })}
                        </h4>
                        <span className={styles.detailPill}>
                          {translate({
                            id: 'home.qos.capacityPill',
                            message: '时变动态拓扑',
                          })}
                        </span>
                      </div>
                      <p>
                        {translate({
                          id: 'home.qos.changingCapacityDetail',
                          message:
                            '受批量并发 (Continuous Batching)、注意力矩阵填充度及节点网络负载等多重变量动态影响。',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className={styles.cardFootnote}>
                <RateIcon name="insight" />
                <span>
                  {translate({
                    id: 'home.qos.problemNote',
                    message:
                      '传统 APM 指标在 Transformer 架构下无法作为静态阈值依据。',
                  })}
                </span>
              </p>
            </article>
          </div>
          <article
            className={`${styles.rateCard} ${styles.solutionCard}`}
            data-qos-card="adaptive"
          >
            <RateArrow primary />
            <div className={styles.rateBody}>
              <div className={styles.cardEyebrow} data-qos-card-header="">
                <span className={styles.successPill}>
                  {translate({
                    id: 'home.qos.solutionPill',
                    message: 'AI 自适应调度内核',
                  })}
                </span>
                <span className={`${styles.iconTile} ${styles.cubeBadge}`}>
                  <RateIcon name="cube" />
                </span>
              </div>
              <div className={styles.solutionHeading}>
                <div>
                  <h3>
                    {translate({
                      id: 'home.qos.solutionTitle',
                      message: 'ModelSphere 动态限流',
                    })}
                  </h3>
                  <p>
                    {translate({
                      id: 'home.qos.solutionDetail',
                      message: '感知微观硬件负载，毫秒级呼吸调整并发门限',
                    })}
                  </p>
                </div>
              </div>
              <div className={styles.dynamicChart}>
                <div className={styles.dynamicChartHeading}>
                  <span data-qos-axis="y">
                    {translate({
                      id: 'home.qos.capacityHeading',
                      message: '并发能力度量 (Concurrency / Capacity)',
                    })}
                  </span>
                  <span className={styles.liveStatus}>
                    <i aria-hidden="true" />
                    {translate({
                      id: 'home.qos.liveStatus',
                      message: '实时自适应跟随',
                    })}
                  </span>
                </div>
                <div className={styles.dynamicPlot}>
                  <span
                    className={`${styles.pointAnnotation} ${styles.openNote}`}
                    data-qos-point="open"
                  >
                    <i className={styles.chartPoint} aria-hidden="true" />
                  </span>
                  <span
                    className={`${styles.pointAnnotation} ${styles.tightenNote}`}
                    data-qos-point="tighten"
                  >
                    <i className={styles.chartPoint} aria-hidden="true" />
                  </span>
                  <span
                    className={`${styles.chartNote} ${styles.openChartNote}`}
                    data-qos-annotation="open"
                  >
                    {translate({
                      id: 'home.qos.openNote',
                      message: '性能充足 自动放开 (98% 满载)',
                    })}
                  </span>
                  <span
                    className={`${styles.chartNote} ${styles.tightenChartNote}`}
                    data-qos-annotation="tighten"
                  >
                    {translate({
                      id: 'home.qos.tightenNote',
                      message: '延迟攀升 及时收紧保护',
                    })}
                  </span>
                  <svg
                    viewBox="0 0 320 120"
                    fill="none"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={translate({
                      id: 'home.qos.rateChart',
                      message: '并发上限随实时处理能力动态调整的曲线',
                    })}
                  >
                    <defs>
                      <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--color-home-primary)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-home-primary)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <line
                      stroke="var(--color-border-default)"
                      strokeDasharray="3 3"
                      x1="0"
                      x2="320"
                      y1="30"
                      y2="30"
                    />
                    <line
                      stroke="var(--color-border-default)"
                      strokeDasharray="3 3"
                      x1="0"
                      x2="320"
                      y1="70"
                      y2="70"
                    />
                    <line
                      stroke="var(--color-border-default)"
                      x1="0"
                      x2="320"
                      y1="110"
                      y2="110"
                    />
                    <path
                      d="M 0,90 Q 50,15 110,35 T 210,85 T 320,40 L 320,110 L 0,110 Z"
                      fill={`url(#${gradient})`}
                    />
                    <path
                      d="M 0,90 Q 50,15 110,35 T 210,85 T 320,40"
                      stroke="var(--color-home-primary)"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
                <div className={styles.chartFooter}>
                  <p className={styles.chartLegend}>
                    <i />
                    {translate({
                      id: 'home.qos.dynamicLimit',
                      message: '并发上限按 SLO 实时调整',
                    })}
                  </p>
                  <span data-qos-axis="x">
                    {translate({
                      id: 'home.qos.sampleWindow',
                      message: '时序窗口: 50ms采样周期',
                    })}
                  </span>
                </div>
              </div>
            </div>
            <p className={`${styles.cardFootnote} ${styles.solutionNote}`}>
              <RateIcon name="verified" />
              <span>
                {translate({
                  id: 'home.qos.solutionNote',
                  message: '弹性水位线动态吸顶，不浪费任何一颗 GPU 周期。',
                })}
              </span>
            </p>
          </article>
        </div>
        <div className={styles.benefits}>
          <div>
            <span className={styles.iconTile}>
              <RateIcon name="layers" />
            </span>
            <div>
              <div className={styles.benefitHeading}>
                <h3>
                  {translate({
                    id: 'home.qos.utilization',
                    message: '更高利用率',
                  })}
                </h3>
              </div>
              <p>
                {translate({
                  id: 'home.qos.utilizationDetail',
                  message:
                    '算力充裕时系统自动弹性放量，消除闲置气泡时间，让昂贵的高性能计算资源发挥极致产出。',
                })}
              </p>
            </div>
          </div>
          <div>
            <span className={styles.iconTile}>
              <RateIcon name="heartShield" />
            </span>
            <div>
              <div className={styles.benefitHeading}>
                <h3>
                  {translate({
                    id: 'home.qos.stability',
                    message: '更稳定体验',
                  })}
                </h3>
              </div>
              <p>
                {translate({
                  id: 'home.qos.stabilityDetail',
                  message:
                    '高峰期或遇超长复杂任务时毫秒级退避防护，杜绝雪崩效应，稳固首字延迟 (TTFT) 及吐字速率。',
                })}
              </p>
            </div>
          </div>
          <div>
            <span className={styles.iconTile}>
              <RateIcon name="settingsSuggest" />
            </span>
            <div>
              <div className={styles.benefitHeading}>
                <h3>
                  {translate({
                    id: 'home.qos.operations',
                    message: '更低运维成本',
                  })}
                </h3>
              </div>
              <p>
                {translate({
                  id: 'home.qos.operationsDetail',
                  message:
                    '告别平台工程师繁琐的人工压测与反复设参，多模型混部场景下自主适应吞吐基线并持续自我进化。',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScalingChart() {
  const id = React.useId();
  return (
    <div className={styles.scalingChart}>
      <div className={styles.chartHeading}>
        <span>
          {translate({
            id: 'home.qos.allDayTrend',
            message: '24小时算力分配趋势 (两者分配比例之和 = 100%)',
          })}
        </span>
        <strong>
          {translate({
            id: 'home.qos.dynamicUtilization',
            message: '算力分配比例合计: 100%',
          })}
        </strong>
      </div>
      <div className={styles.stackedPlot}>
        <svg
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 600 130"
          role="img"
          aria-label={translate({
            id: 'home.qos.scalingChart',
            message: '全天 GLM 5.3 与 MiniMax M3 算力分配比例互补，总和为 100%',
          })}
        >
          <defs>
            <linearGradient id={`${id}-glm`} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-home-tag-blue)"
                stopOpacity="0.75"
              />
              <stop
                offset="100%"
                stopColor="var(--color-home-tag-blue)"
                stopOpacity="0.35"
              />
            </linearGradient>
            <linearGradient id={`${id}-minimax`} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-home-tag-violet)"
                stopOpacity="0.06"
              />
              <stop
                offset="100%"
                stopColor="var(--color-home-tag-violet)"
                stopOpacity="0.4"
              />
            </linearGradient>
            <pattern
              height="26"
              id={`${id}-grid`}
              patternUnits="userSpaceOnUse"
              width="60"
            >
              <path
                d="M 60 0 L 0 0 0 26"
                stroke="var(--color-border-default)"
                strokeDasharray="2 3"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect
            fill={`url(#${id}-grid)`}
            height="130"
            opacity="0.8"
            width="600"
          />
          <rect fill={`url(#${id}-minimax)`} height="130" width="600" />
          <path
            d="M 0 0 L 600 0 L 600 26 C 560 26, 520 26, 480 30 C 440 38, 410 65, 360 78 C 300 90, 260 104, 200 104 C 140 104, 100 80, 50 36 C 25 26, 10 26, 0 26 Z"
            fill={`url(#${id}-glm)`}
          />
          <path
            d="M 0 26 C 10 26, 25 26, 50 36 C 100 80, 140 104, 200 104 C 260 104, 300 90, 360 78 C 410 65, 440 38, 480 30 C 520 26, 560 26, 600 26"
            stroke="var(--color-home-tag-blue)"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <line
            opacity="0.6"
            stroke="var(--color-home-tag-blue)"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            x1="200"
            x2="200"
            y1="0"
            y2="130"
          />
          <circle
            cx="200"
            cy="104"
            fill="var(--color-background-surface)"
            r="4.5"
            stroke="var(--color-home-tag-blue)"
            strokeWidth="2.5"
          />
          <line
            opacity="0.6"
            stroke="var(--color-home-muted)"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            x1="360"
            x2="360"
            y1="0"
            y2="130"
          />
          <circle
            cx="360"
            cy="78"
            fill="var(--color-background-surface)"
            r="4"
            stroke="var(--color-home-tag-blue)"
            strokeWidth="2"
          />
          <line
            opacity="0.6"
            stroke="var(--color-home-tag-violet)"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            x1="520"
            x2="520"
            y1="0"
            y2="130"
          />
          <circle
            cx="520"
            cy="28"
            fill="var(--color-background-surface)"
            r="4.5"
            stroke="var(--color-home-tag-violet)"
            strokeWidth="2.5"
          />
        </svg>
        <span className={styles.glmCoverage}>
          {translate({
            id: 'home.qos.glmCoverage',
            message: 'GLM 5.3 算力覆盖区 ↑',
          })}
        </span>
        <span className={styles.minimaxCoverage}>
          {translate({
            id: 'home.qos.minimaxCoverage',
            message: 'MiniMax M3 算力覆盖区 ↓',
          })}
        </span>
      </div>
      <div className={styles.timeAxis}>
        <span>00:00</span>
        <span className={styles.glm}>
          {translate({
            id: 'home.qos.morningAxis',
            message: '09:00 (蓝80% : 紫20%)',
          })}
        </span>
        <span>
          {translate({
            id: 'home.qos.afternoonAxis',
            message: '15:00 (蓝60% : 紫40%)',
          })}
        </span>
        <span className={styles.minimax}>
          {translate({
            id: 'home.qos.nightAxis',
            message: '23:00 (蓝20% : 紫80%)',
          })}
        </span>
        <span>24:00</span>
      </div>
    </div>
  );
}

function DynamicScaling() {
  const scenarios = [
    {
      title: translate({
        id: 'home.qos.morningTitle',
        message: '白天高峰 09:00',
      }),
      detail: translate({
        id: 'home.qos.morningDetail',
        message: '办公模型流量大',
      }),
      glm: 8,
      ratio: ['GLM 80% (8卡)', 'MiniMax 20% (2卡)'],
    },
    {
      title: translate({
        id: 'home.qos.afternoonTitle',
        message: '日常时段 15:00',
      }),
      detail: translate({
        id: 'home.qos.afternoonDetail',
        message: '流量均衡',
      }),
      glm: 6,
      ratio: ['GLM 60% (6卡)', 'MiniMax 40% (4卡)'],
    },
    {
      title: translate({
        id: 'home.qos.nightTitle',
        message: '深夜高峰 23:00',
      }),
      detail: translate({
        id: 'home.qos.nightDetail',
        message: '夜间任务流量大',
      }),
      glm: 2,
      ratio: ['GLM 20% (2卡)', 'MiniMax 80% (8卡)'],
    },
  ];
  return (
    <section
      id="dynamic-scaling"
      data-home-design=""
      className={`w-full py-12 px-margin bg-white border-b border-slate-200/70 ${styles.section}`}
      aria-labelledby="dynamic-scaling-title"
    >
      <div
        className={`max-w-7xl mx-auto ${styles.scalingLayout}`}
        data-home-pair=""
        data-home-reveal="panel"
      >
        <div className={styles.scalingCopy}>
          <div data-home-intro="" className={styles.scalingIntro}>
            <p className={styles.scalingPill}>
              <i className="animate-pulse" />
              {translate({
                id: 'home.qos.scalingPill',
                message: '智能算力调度 · 减少资源闲置',
              })}
            </p>
            <h2 id="dynamic-scaling-title" className={styles.title}>
              {translate({
                id: 'home.qos.scalingTitle',
                message: '算力动态扩缩容：',
              })}
              <br />
              <span>
                {translate({
                  id: 'home.qos.scalingTitleAccent',
                  message: '按模型流量实时分配',
                })}
              </span>
              <br />
              {translate({
                id: 'home.qos.scalingTitleEnd',
                message: '减少算力闲置',
              })}
            </h2>
            <p className={styles.scalingDescription}>
              {translate({
                id: 'home.qos.scalingDescription',
                message:
                  '解决传统模式下模型固定部署在指定算力上，导致低峰期算力空转浪费、高峰期算力不足的业务痛点。',
              })}
            </p>
          </div>
          <div className={styles.scalingFeatures}>
            <div>
              <span className={styles.iconTile}>
                <Symbol name="radar" />
              </span>
              <h3>
                {translate({
                  id: 'home.qos.measureUsage',
                  message: '实时判断模型使用量',
                })}
              </h3>
            </div>
            <div>
              <span className={styles.iconTile}>
                <Symbol name="sync_alt" />
              </span>
              <h3>
                {translate({
                  id: 'home.qos.scaleWithTraffic',
                  message: '算力随流量自动扩缩',
                })}
              </h3>
            </div>
            <div>
              <span className={`${styles.iconTile} ${styles.success}`}>
                <Symbol name="verified" />
              </span>
              <h3>
                {translate({
                  id: 'home.qos.eliminateIdle',
                  message: '减少低使用率资源浪费',
                })}
              </h3>
            </div>
          </div>
          <div className={styles.scalingBadges}>
            <span>
              <Symbol name="bolt" />
              {translate({
                id: 'home.qos.noStutter',
                message: '应对热门模型高峰',
              })}
            </span>
            <span>
              <Symbol name="shield" />
              {translate({
                id: 'home.qos.zeroIdle',
                message: '提升资源利用率',
              })}
            </span>
          </div>
        </div>
        <div className={styles.scalingPanel}>
          <div className={styles.scalingComparison}>
            <div className={styles.negative}>
              <b aria-hidden="true">✕</b>
              <div>
                <strong>
                  {translate({
                    id: 'home.qos.fixedMode',
                    message: '传统固定绑定模式',
                  })}
                </strong>
                <p>
                  {translate({
                    id: 'home.qos.fixedModeDetail',
                    message: '模型低谷期大量算力闲置空转',
                  })}
                </p>
              </div>
            </div>
            <div className={styles.positive}>
              <b aria-hidden="true">✓</b>
              <div>
                <strong>
                  {translate({
                    id: 'home.qos.dynamicMode',
                    message: 'ModelSphere 动态调配',
                  })}
                </strong>
                <p>
                  {translate({
                    id: 'home.qos.dynamicModeDetail',
                    message: '算力随流量调配，减少集群闲置',
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className={styles.poolLegend}>
            <div className={styles.modelLegend}>
              <span>
                <i className={styles.glmSwatch} />
                <strong>GLM 5.3</strong>
                <small>
                  {translate({
                    id: 'home.qos.glmWorkload',
                    message: '办公/分析',
                  })}
                </small>
              </span>
              <span>
                <i className={styles.minimaxSwatch} />
                <strong>MiniMax M3</strong>
                <small>
                  {translate({
                    id: 'home.qos.minimaxWorkload',
                    message: '代码/批处理',
                  })}
                </small>
              </span>
            </div>
            <p>
              <Symbol name="view_in_ar" />
              {translate({
                id: 'home.qos.gpuPool',
                message: '集群算力总池：固定 10 张 GPU 算力卡，实时无感流转',
              })}
            </p>
          </div>
          <ScalingChart />
          <div className={styles.scenarios}>
            {scenarios.map((scenario, index) => (
              <React.Fragment key={scenario.glm}>
                {index > 0 && (
                  <div
                    className={`${styles.scenarioArrow} ${index === 2 ? styles.minimax : styles.glm}`}
                  >
                    <span className="animate-pulse">
                      <Symbol name="east" />
                    </span>
                    <span>
                      {index === 1 ? (
                        <>
                          {translate({
                            id: 'home.qos.reallocateFirst',
                            message: '实时感知',
                          })}
                          <br />
                          {translate({
                            id: 'home.qos.reallocateSecond',
                            message: '调配',
                          })}
                        </>
                      ) : (
                        <>
                          {translate({
                            id: 'home.qos.autoFirst',
                            message: '自动',
                          })}
                          <br />
                          {translate({
                            id: 'home.qos.autoSecond',
                            message: '扩缩容',
                          })}
                        </>
                      )}
                    </span>
                  </div>
                )}
                <div
                  className={styles.scenario}
                  data-gpu-scenario={scenario.glm}
                >
                  <h3>{scenario.title}</h3>
                  <p>{scenario.detail}</p>
                  <div className={styles.ratios}>
                    <span className={styles.glm}>
                      {translate({
                        id: `home.qos.glm${scenario.glm}`,
                        message: scenario.ratio[0],
                      })}
                    </span>
                    <span className={styles.minimax}>
                      {translate({
                        id: `home.qos.minimax${10 - scenario.glm}`,
                        message: scenario.ratio[1],
                      })}
                    </span>
                  </div>
                  <div className={styles.gpuGrid}>
                    {Array.from({ length: 10 }, (_, gpu) => (
                      <div
                        key={gpu}
                        data-model={gpu < scenario.glm ? 'glm' : 'minimax'}
                        className={
                          gpu < scenario.glm ? styles.glmGpu : styles.minimaxGpu
                        }
                      >
                        <Symbol name="developer_board" />
                        <span>{String(gpu + 1).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <p className={styles.scalingSummary}>
            <Symbol name="electric_bolt" />
            <span>
              {translate({
                id: 'home.qos.summaryStart',
                message: '按模型流量调整算力分配，图中两者分配比例合计为 ',
              })}
              <strong>100%</strong>
              {translate({
                id: 'home.qos.summaryEnd',
                message: '，通过动态调配减少闲置',
              })}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
