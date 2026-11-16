import { translate } from '@docusaurus/Translate';
import { useSitePath } from '@site/src/lib/use-site-path';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React from 'react';
import './styles.css';

export { FaultTolerance } from './FaultTolerance';

export { QosScaling } from './QosScaling';

export function AutotuneEvolution() {
  const flowRef = React.useRef<HTMLDivElement>(null);
  const arrowId = React.useId();

  React.useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const cards = Array.from(
      flow.querySelectorAll<HTMLElement>('[data-autotune-step]'),
    );
    const updateConnectors = () => {
      const boxes = [1, 2, 3, 4, 5].map((step) => {
        const card = cards.find(
          (element) => element.dataset.autotuneStep === String(step),
        )!;
        const left = card.offsetLeft;
        const top = card.offsetTop;
        return {
          left,
          top,
          right: left + card.offsetWidth,
          bottom: top + card.offsetHeight,
          x: left + card.offsetWidth / 2,
          y: top + card.offsetHeight / 2,
        };
      });
      const [one, , three, four, five] = boxes;
      const circularPaths = () => {
        const core = flow.querySelector<HTMLElement>('.home-autotune-core')!;
        const center = {
          x: core.offsetLeft + core.offsetWidth / 2,
          y: core.offsetTop + core.offsetHeight / 2,
        };
        const bounds = boxes.map((box) => ({
          left: box.left - 6,
          right: box.right + 6,
          top: box.top - 6,
          bottom: box.bottom + 6,
        }));
        const minimumRadius = Math.max(
          ...bounds.map((box) =>
            Math.hypot(
              Math.max(box.left - center.x, 0, center.x - box.right),
              Math.max(box.top - center.y, 0, center.y - box.bottom),
            ),
          ),
        );
        const radius = Math.max(
          minimumRadius + 2,
          Math.min(
            core.offsetWidth * 1.55,
            Math.min(three.bottom, four.bottom) - center.y - 8,
          ),
        );
        const intervals = bounds.map((box, index) => {
          const reference = [
            -Math.PI / 2,
            0,
            Math.PI / 2,
            Math.PI / 2,
            Math.PI,
          ][index];
          const angles: number[] = [];
          const record = (x: number, y: number) => {
            if (
              x < box.left - 0.01 ||
              x > box.right + 0.01 ||
              y < box.top - 0.01 ||
              y > box.bottom + 0.01
            )
              return;
            let angle = Math.atan2(y - center.y, x - center.x);
            while (angle < reference - Math.PI) angle += 2 * Math.PI;
            while (angle > reference + Math.PI) angle -= 2 * Math.PI;
            angles.push(angle);
          };
          for (const x of [box.left, box.right]) {
            const dx = x - center.x;
            if (Math.abs(dx) > radius) continue;
            const dy = Math.sqrt(Math.max(0, radius ** 2 - dx ** 2));
            record(x, center.y - dy);
            record(x, center.y + dy);
          }
          for (const y of [box.top, box.bottom]) {
            const dy = y - center.y;
            if (Math.abs(dy) > radius) continue;
            const dx = Math.sqrt(Math.max(0, radius ** 2 - dy ** 2));
            record(center.x - dx, y);
            record(center.x + dx, y);
          }
          return { start: Math.min(...angles), end: Math.max(...angles) };
        });
        const point = (angle: number) => ({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        });
        return intervals.map((interval, index) => {
          const next = intervals[(index + 1) % intervals.length];
          const end =
            index === intervals.length - 1
              ? next.start + 2 * Math.PI
              : next.start;
          let from = point(interval.end);
          let to = point(end);
          if (index !== 2) {
            const source = boxes[index];
            const target = boxes[(index + 1) % boxes.length];
            from = {
              x: Math.max(
                source.left + 12,
                Math.min(source.right - 12, from.x),
              ),
              y: index < 2 ? source.bottom + 6 : source.top - 6,
            };
            to = {
              x: Math.max(target.left + 12, Math.min(target.right - 12, to.x)),
              y: index < 2 ? target.top - 6 : target.bottom + 6,
            };
          }
          const chord = Math.hypot(to.x - from.x, to.y - from.y);
          const arcRadius = Math.max(16, chord * 0.8);
          return `M ${from.x} ${from.y} A ${arcRadius} ${arcRadius} 0 0 1 ${to.x} ${to.y}`;
        });
      };
      const paths = window.matchMedia('(min-width: 768px)').matches
        ? circularPaths()
        : [
            ...boxes
              .slice(0, 4)
              .map(
                (box, index) =>
                  `M ${box.x} ${box.bottom + 5} A 14 14 0 0 1 ${boxes[index + 1].x} ${boxes[index + 1].top - 7}`,
              ),
            `M ${five.left - 4} ${five.y} H 10 Q 2 ${five.y} 2 ${five.y - 8} V ${one.y + 8} Q 2 ${one.y} 10 ${one.y} H ${one.left - 4}`,
          ];
      flow
        .querySelectorAll<SVGPathElement>('[data-autotune-connector]')
        .forEach((path, index) => {
          path.setAttribute('d', paths[index]);
          const start = path.getPointAtLength(0);
          const length = path.getTotalLength();
          const end = path.getPointAtLength(length);
          const headLength = Math.min(10, length * 0.28);
          const headWidth = Math.min(14, Math.max(7, headLength * 1.45));
          // Sweep a uniform-width fill around the existing centerline.
          const shaftWidth =
            !window.matchMedia('(min-width: 768px)').matches && index === 4
              ? 3.2
              : headWidth * 0.43;
          const shaftLength = length - headLength;
          const edges: { x: number; y: number }[][] = [[], []];
          const frame = (distance: number) => {
            const point = path.getPointAtLength(distance);
            const before = path.getPointAtLength(Math.max(0, distance - 0.5));
            const after = path.getPointAtLength(
              Math.min(length, distance + 0.5),
            );
            const dx = after.x - before.x;
            const dy = after.y - before.y;
            const magnitude = Math.hypot(dx, dy);
            return { point, nx: -dy / magnitude, ny: dx / magnitude };
          };
          const samples = Math.max(16, Math.ceil(shaftLength));
          for (let sample = 0; sample <= samples; sample += 1) {
            const progress = sample / samples;
            const { point, nx, ny } = frame(shaftLength * progress);
            const halfWidth = shaftWidth / 2;
            edges[0].push({
              x: point.x + nx * halfWidth,
              y: point.y + ny * halfWidth,
            });
            edges[1].push({
              x: point.x - nx * halfWidth,
              y: point.y - ny * halfWidth,
            });
          }
          const headEdges: { x: number; y: number }[][] = [[], []];
          const headSamples = Math.max(8, Math.ceil(headLength));
          for (let sample = 0; sample <= headSamples; sample += 1) {
            const progress = sample / headSamples;
            const { point, nx, ny } = frame(
              shaftLength + headLength * progress,
            );
            const halfWidth = (headWidth / 2) * (1 - progress);
            headEdges[0].push({
              x: point.x + nx * halfWidth,
              y: point.y + ny * halfWidth,
            });
            headEdges[1].push({
              x: point.x - nx * halfWidth,
              y: point.y - ny * halfWidth,
            });
          }
          const outline = [
            ...edges[0],
            ...headEdges[0],
            ...headEdges[1].slice(0, -1).reverse(),
            ...edges[1].reverse(),
          ];
          flow
            .querySelector(
              `[data-autotune-ribbon="${path.dataset.autotuneConnector}"]`,
            )!
            .setAttribute(
              'd',
              `${outline.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`,
            );
          const gradient = flow.querySelector(
            `[data-autotune-gradient="${path.dataset.autotuneConnector}"]`,
          )!;
          for (const [name, value] of Object.entries({
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
          }))
            gradient.setAttribute(name, String(value));
        });
    };
    updateConnectors();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateConnectors);
      return () => window.removeEventListener('resize', updateConnectors);
    }
    const observer = new ResizeObserver(updateConnectors);
    observer.observe(flow);
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    if (typeof IntersectionObserver === 'undefined') {
      flow.dataset.autotuneRunning = 'true';
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        flow.dataset.autotuneRunning = String(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(flow);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="w-full py-12 px-margin bg-white border-b border-slate-200/70"
      id="autotune-evolution"
      data-home-design=""
      aria-label={translate({
        id: 'site.e9a6e8e7991e',
        message: '性能持续优化',
      })}
      aria-description={translate({
        id: 'site.a52a481c1137',
        message:
          '按设计稿展示的机制、配置与性能示例，不代表运行时状态、实测证明或服务保证。',
      })}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-2" data-home-intro="">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[18px] text-sky-600"
              aria-hidden="true"
            >
              {'change_circle'}
            </span>
            <span className="font-code-sm text-code-sm text-sky-600 font-bold uppercase tracking-widest">
              {'CORE MECHANISM 03 · CONTINUOUS SELF-EVOLUTION'}
            </span>
          </div>
          <h2 className="font-headline-lg text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {translate({
              id: 'site.04c52c423435',
              message: 'Tuning Agent 性能持续优化',
            })}
          </h2>
          <p className="font-body-md text-sm text-slate-600 leading-relaxed whitespace-nowrap">
            {translate({
              id: 'site.e4e65d542ec8',
              message:
                '\n      告别繁冗的人工基准盲测。ModelSphere 将线上真实请求、低谷空闲算力、网格化超参搜索与零停机灰度上线串联成全自动化演进飞轮。\n    ',
            })}
          </p>
        </div>
        <div
          className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative home-loop-canvas"
          data-home-pair=""
          data-home-reveal="panel"
        >
          <div className="xl:col-span-5 flex flex-col justify-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-code-sm text-xs w-fit mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse"></span>
              <span>
                {translate({
                  id: 'site.6054a2fd5372',
                  message: '演进范式跃迁',
                })}
              </span>
            </div>
            <h3 className="font-headline-sm text-2xl font-bold text-slate-900 leading-snug tracking-tight mb-2">
              {translate({
                id: 'site.ec073b0edf7e',
                message: '从“人工盲测”跨越到“自主演进”',
              })}
            </h3>
            <p className="font-body-md text-sm text-slate-600 mb-6 leading-relaxed">
              {translate({
                id: 'site.8baa61b6a1aa',
                message:
                  '用空闲算力持续榨干硬件潜能，让 LLM 推理服务越用越快。',
              })}
            </p>
            <div className="flex flex-col gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-code-sm bg-sky-100 text-sky-800 border border-sky-200 flex-shrink-0 mt-0.5">
                  {translate({ id: 'site.45bc36393c8b', message: '采样更准' })}
                </span>
                <p className="font-body-sm text-xs text-slate-700 leading-relaxed">
                  <span className="text-slate-400">
                    {translate({
                      id: 'site.ca1f46545b3a',
                      message: '静态数据集测试',
                    })}
                  </span>
                  {' → '}
                  <strong className="text-slate-900">
                    {translate({
                      id: 'site.51f3302d2b27',
                      message: '7 天滑动窗口真实流量特征蓄水',
                    })}
                  </strong>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-code-sm bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0 mt-0.5">
                  {translate({ id: 'site.7017dcf74465', message: '成本更低' })}
                </span>
                <p className="font-body-sm text-xs text-slate-700 leading-relaxed">
                  <span className="text-slate-400">
                    {translate({
                      id: 'site.9b5db700cd4b',
                      message: '占用生产资源压测',
                    })}
                  </span>
                  {' → '}
                  <strong className="text-slate-900">
                    {translate({
                      id: 'site.a4c039468112',
                      message: '夜间低峰期闲置算力并发网格搜索',
                    })}
                  </strong>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-code-sm bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0 mt-0.5">
                  {translate({ id: 'site.8768d9a795d5', message: '交付更稳' })}
                </span>
                <p className="font-body-sm text-xs text-slate-700 leading-relaxed">
                  <span className="text-slate-400">
                    {translate({
                      id: 'site.c2f315ee2543',
                      message: '停机重启更新参数',
                    })}
                  </span>
                  {' → '}
                  <strong className="text-slate-900">
                    {translate({
                      id: 'site.138b5fd6020a',
                      message: '冠军方案自动验证，生产环境零停机热加载',
                    })}
                  </strong>
                </p>
              </div>
            </div>
          </div>
          <div
            className="xl:col-span-7 flex flex-col justify-between gap-3 relative z-10 w-full home-autotune-flow"
            ref={flowRef}
          >
            <svg
              className="home-autotune-connectors"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                {['1-2', '2-3', '3-4', '4-5', '5-1'].map((connection) => (
                  <linearGradient
                    key={connection}
                    id={`${arrowId}-${connection}`}
                    data-autotune-gradient={connection}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--autotune-link-start)"
                      stopOpacity="0"
                    />
                    <stop
                      offset="48%"
                      stopColor="var(--autotune-link-middle)"
                    />
                    <stop offset="100%" stopColor="var(--autotune-link-end)" />
                  </linearGradient>
                ))}
              </defs>
              {['1-2', '2-3', '3-4', '4-5', '5-1'].map((connection, index) => (
                <React.Fragment key={connection}>
                  <path
                    className="home-autotune-guide"
                    data-autotune-connector={connection}
                  />
                  <path
                    className="home-autotune-link"
                    data-autotune-ribbon={connection}
                    fill={`url(#${arrowId}-${connection})`}
                    style={
                      {
                        '--autotune-link-delay': `${index * -0.65}s`,
                      } as React.CSSProperties
                    }
                  />
                </React.Fragment>
              ))}
            </svg>
            <div className="flex justify-center w-full home-autotune-row">
              <div
                className="w-full max-w-sm bg-white/95 backdrop-blur rounded-xl border border-sky-200 shadow-sm p-2.5 home-autotune-step"
                data-autotune-step="1"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold font-code-sm text-[10px] flex items-center justify-center shadow-sm home-autotune-number">
                      {'1'}
                    </span>
                    <span className="font-headline-sm text-slate-900 font-bold text-xs sm:text-sm tracking-tight home-autotune-title">
                      {translate({
                        id: 'site.15f0b92fe41e',
                        message: '线上推理服务',
                      })}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {translate({
                      id: 'site.b9b42c232cf6',
                      message: '稳定运行',
                    })}
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-slate-600 mb-2 leading-tight">
                  {translate({
                    id: 'site.0b2b2f8f71a2',
                    message: '稳定运行，持续提供高质量低时延高可用服务',
                  })}
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-around gap-1.5 shadow-inner">
                  <div className="flex flex-col gap-0.5 p-1 rounded bg-slate-900 text-sky-400 border border-slate-800 shadow-sm flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-code-sm text-slate-400">
                        {'NODE-01'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded overflow-hidden">
                      <div className="bg-sky-500 h-full w-3/4"></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1 rounded bg-slate-900 text-sky-400 border border-slate-800 shadow-sm flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-code-sm text-slate-400">
                        {'NODE-02'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded overflow-hidden">
                      <div className="bg-sky-500 h-full w-4/5"></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1 rounded bg-slate-900 text-sky-400 border border-slate-800 shadow-sm flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-code-sm text-slate-400">
                        {'NODE-03'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded overflow-hidden">
                      <div className="bg-sky-500 h-full w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center home-autotune-row">
              <div
                className="md:col-span-4 bg-white/95 backdrop-blur rounded-xl border border-emerald-200/90 shadow-sm p-2.5 home-autotune-step"
                data-autotune-step="5"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold font-code-sm text-[9px] flex items-center justify-center shadow-sm home-autotune-number">
                      {'5'}
                    </span>
                    <span className="font-headline-sm text-slate-900 font-bold text-xs tracking-tight home-autotune-title">
                      {translate({
                        id: 'site.56d89537b868',
                        message: '自动化上线',
                      })}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {translate({
                      id: 'site.a762c19d9aca',
                      message: '生产灰度',
                    })}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {translate({
                    id: 'site.2818b323ef17',
                    message: '最优配置自动部署，零丢流热加载',
                  })}
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-between gap-1.5 shadow-inner">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <span
                      className="material-symbols-outlined text-[15px]"
                      aria-hidden="true"
                    >
                      {'rocket_launch'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 font-code-sm text-[9px]">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold">{'Config Push'}</span>
                      <span className="text-emerald-600 font-bold">
                        {'100%'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[8px]">
                      {'Rolling Deploy'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center py-1 home-autotune-core-panel">
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-b from-sky-100/80 via-white to-sky-50 border border-white shadow-md flex flex-col items-center justify-center p-2 text-center select-none home-autotune-core">
                  <div className="absolute -inset-1 rounded-full border border-dashed border-sky-300 animate-pulse pointer-events-none opacity-60"></div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-sm mb-1">
                    <span
                      className="material-symbols-outlined text-[16px] home-autotune-sync"
                      aria-hidden="true"
                    >
                      {'sync'}
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-slate-900 font-extrabold text-xs tracking-tight leading-tight">
                    {translate({
                      id: 'site.6b338826b141',
                      message: '持续性能优化闭环',
                    })}
                  </h4>
                  <span className="mt-1 px-1.5 py-0.5 rounded-full bg-white/90 border border-sky-200 text-sky-800 font-code-sm text-[8px] font-semibold shadow-sm">
                    {'TUNING AGENT'}
                  </span>
                </div>
              </div>
              <div
                className="md:col-span-4 bg-white/95 backdrop-blur rounded-xl border border-amber-200/90 shadow-sm p-2.5 home-autotune-step"
                data-autotune-step="2"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold font-code-sm text-[9px] flex items-center justify-center shadow-sm home-autotune-number">
                      {'2'}
                    </span>
                    <span className="font-headline-sm text-slate-900 font-bold text-xs tracking-tight home-autotune-title">
                      {translate({
                        id: 'site.5d303f96e6f3',
                        message: '收集流量数据',
                      })}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {translate({
                      id: 'site.003a7e708d44',
                      message: '特征蓄水',
                    })}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {translate({
                    id: 'site.48732aeaef82',
                    message: '构建滑动窗口数据集与流量压力模式',
                  })}
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 flex items-center gap-1.5 shadow-inner">
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <span
                      className="material-symbols-outlined text-[15px]"
                      aria-hidden="true"
                    >
                      {'database'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 font-code-sm text-[9px]">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold">{'Window'}</span>
                      <span className="text-amber-600 font-bold">
                        {'7 Days'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[8px]">
                      {'Prompt Profiler'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 home-autotune-row home-autotune-bottom-row">
              <div
                className="bg-white/95 backdrop-blur rounded-xl border border-teal-200/90 shadow-sm p-2.5 home-autotune-step"
                data-autotune-step="4"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white font-bold font-code-sm text-[9px] flex items-center justify-center shadow-sm home-autotune-number">
                      {'4'}
                    </span>
                    <span className="font-headline-sm text-slate-900 font-bold text-xs tracking-tight home-autotune-title">
                      {translate({
                        id: 'site.3a8d95379980',
                        message: '产出并验证配置',
                      })}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    {translate({
                      id: 'site.11f6c0ce2b39',
                      message: '真实负载',
                    })}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {translate({
                    id: 'site.9afaa4f936fa',
                    message: '基于真实负载比选出冠军推理方案',
                  })}
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-between gap-2 shadow-inner">
                  <div className="flex items-end gap-1 h-5 flex-1">
                    <div className="w-2.5 bg-slate-300 rounded-t h-1.5"></div>
                    <div className="w-2.5 bg-sky-300 rounded-t h-2.5"></div>
                    <div className="w-2.5 bg-sky-400 rounded-t h-3.5"></div>
                    <div className="w-2.5 bg-sky-600 rounded-t h-5 relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-amber-500">
                        {'★'}
                      </span>
                    </div>
                    <div className="flex flex-col ml-1 font-code-sm text-[9px] text-slate-700">
                      <span className="font-bold text-teal-700">
                        {'+48.6%'}
                      </span>
                      <span className="text-slate-500 text-[8px]">
                        {'SLO P99<200ms'}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <span
                      className="material-symbols-outlined text-[15px]"
                      aria-hidden="true"
                    >
                      {'emoji_events'}
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="bg-white/95 backdrop-blur rounded-xl border border-indigo-200/90 shadow-sm p-2.5 home-autotune-step"
                data-autotune-step="3"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold font-code-sm text-[9px] flex items-center justify-center shadow-sm home-autotune-number">
                      {'3'}
                    </span>
                    <span className="font-headline-sm text-slate-900 font-bold text-xs tracking-tight home-autotune-title">
                      {translate({
                        id: 'site.d767694607d3',
                        message: '利用空闲算力调优',
                      })}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {translate({
                      id: 'site.b6ad2f1e3dca',
                      message: '低峰搜索',
                    })}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {translate({
                    id: 'site.a149e0e2f633',
                    message: '夜间低峰期并发搜索更优推理超参',
                  })}
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-between gap-1.5 shadow-inner">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                      <span
                        className="material-symbols-outlined text-[15px]"
                        aria-hidden="true"
                      >
                        {'bedtime'}
                      </span>
                    </div>
                    <div className="font-code-sm text-[9px] text-slate-600">
                      <span className="font-bold text-slate-900 block leading-none">
                        {'02:00~06:00'}
                      </span>
                      <span className="text-[8px] text-indigo-600">
                        {'Night Tuning'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 w-20 font-code-sm text-[8px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>{'Chunk/TP'}</span>
                      <span className="text-indigo-600 font-semibold">
                        {'18 Sets'}
                      </span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-4/5 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export function Benchmarks() {
  const { siteHref } = useSitePath();
  const {
    i18n: { currentLocale },
  } = useDocusaurusContext();
  const title = translate({
    id: 'site.7da06f878c58',
    message: '性能调优模型 Day-0 部署',
  });
  return (
    <section
      className="w-full py-space-xl px-margin bg-slate-50/70 border-b border-slate-200/70"
      id="benchmarks"
      data-home-design=""
      aria-label={title}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-caps text-label-caps text-emerald-600 uppercase tracking-widest font-semibold">
            {'Day-0 Deployment'}
          </span>
          <h2 className="font-headline-lg text-headline-lg text-slate-900 font-bold tracking-tight">
            {title}
          </h2>
          <p className="font-body-md text-body-md text-slate-600">
            {translate({
              id: 'home.deployment.description',
              message:
                '在 Console 模型库中选择模型与部署变体，使用已调优配置一键部署。',
            })}
          </p>
        </div>
        <figure className="home-console-preview">
          <div
            className="home-console-scroller"
            role="region"
            aria-label={translate({
              id: 'home.deployment.previewRegion',
              message: 'Console 模型库截图，可横向滚动查看',
            })}
            tabIndex={0}
          >
            <div className="home-console-frame">
              <img
                className="home-console-screenshot"
                src={siteHref(
                  currentLocale === 'en'
                    ? '/screenshots/console-model-catalog-en.png'
                    : '/screenshots/console-model-catalog.png',
                )}
                alt={translate({
                  id: 'home.deployment.screenshotAlt',
                  message:
                    'Console 模型库：按提升排序，浏览模型、部署变体与调优收益标签。',
                })}
                width={2566}
                height={1522}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
export function GetStarted() {
  const { siteHref } = useSitePath();
  const { siteConfig } = useDocusaurusContext();
  return (
    <section
      className="w-full px-margin py-space-md"
      id="get-started"
      data-home-design=""
      aria-label={translate({ id: 'site.2209fac93619', message: '开始部署' })}
    >
      <div
        className="relative max-w-7xl mx-auto rounded-2xl overflow-hidden shadow-xl text-center text-white py-16 px-6 sm:px-8"
        data-home-reveal="panel"
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[240px] bg-sky-400/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl mx-auto">
          <div
            data-home-intro=""
            className="home-cta-intro flex flex-col items-center w-full"
          >
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white/95 text-xs sm:text-sm font-medium tracking-wide mb-6 shadow-sm">
              {'\n        Production Ready Infrastructure\n      '}
            </div>
            <h2
              className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight"
              id="cta-title"
            >
              {translate({
                id: 'site.8bc9ff0b2fc6',
                message:
                  '\n        准备好让你的大模型推理集群提速了吗？\n      ',
              })}
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg max-w-3xl leading-relaxed mb-8 font-normal">
              {translate({
                id: 'site.69b036360050',
                message:
                  '全套源码完全开源，加入顶尖 AI Infra 工程师共建的下一代推理基础设施。\n      ',
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={siteHref(
                String(siteConfig.customFields?.docsQuickstartHref ?? '/docs'),
              )}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-600 hover:bg-slate-50 transition-all font-semibold text-base shadow-md hover:shadow-lg"
            >
              <span>
                {translate({ id: 'site.432ef28ba8ed', message: '立即部署' })}
              </span>
              <svg
                className="w-4 h-4 fill-current text-blue-600"
                viewBox="0 0 24 24"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
            </a>
            <a
              href={siteHref('/community#community-wechat-group')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white transition-all font-semibold text-base shadow-sm hover:shadow-md"
            >
              <svg
                className="w-5 h-5 fill-none stroke-current stroke-2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                ></path>
              </svg>
              <span>
                {translate({
                  id: 'site.6f0b3350f913',
                  message: '加入开发者交流群',
                })}
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
export function HomeFooter() {
  const { siteHref } = useSitePath();
  return (
    <footer
      className="w-full bg-white border-t border-slate-200 site-footer home-source-footer"
      id="home-footer"
      data-home-design=""
      aria-label={translate({ id: 'site.aba19a1bf2ae', message: '页脚资源' })}
      aria-description={translate({
        id: 'site.7cf2a56a3f5c',
        message: '页脚状态、节点及 SHA 按设计稿展示为示例。',
      })}
    >
      <div className="w-full max-w-7xl mx-auto px-margin py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-space-xl mb-space-xl">
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <img
                alt="ModelSphere Logo"
                className="h-7 w-auto object-contain"
                src={siteHref('/brand/modelsphere-symbol.png')}
                width="35"
                height="28"
              />
              <span className="font-headline-sm text-headline-sm text-slate-900 font-bold">
                {translate({
                  id: 'site.df36818e82c3',
                  message: '模域 ModelSphere',
                })}
              </span>
            </div>
            <p className="font-body-md text-body-md text-slate-600 max-w-sm">
              {translate({
                id: 'site.20e8091eb03d',
                message: '让大模型推理从实验室能跑，到生产好用。',
              })}
            </p>
            <div className="flex items-center gap-space-sm pt-space-xs">
              <div className="flex items-center gap-1.5 px-space-xs py-1 rounded bg-slate-100 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-code-sm text-code-sm text-emerald-700 font-medium">
                  {'All Systems Operational'}
                </span>
              </div>
              <div className="px-space-xs py-1 rounded bg-slate-100 border border-slate-200 font-code-sm text-code-sm text-slate-600 font-medium">
                {'K8s v1.28+ Ready'}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider font-semibold">
              {translate({ id: 'site.3dac0de92967', message: '开源代码' })}
              <br />
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <a
                  href="https://github.com/modelsphere/modelsphere"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {translate({
                    id: 'site.720f02a99a32',
                    message: 'GitHub 仓库',
                  })}
                </a>
              </li>
              <li>
                <a href={siteHref('/models')}>
                  {translate({
                    id: 'site.1be2b13bec98',
                    message: '模型与调优',
                  })}
                </a>
              </li>
              <li></li>
              <li></li>
            </ul>
          </div>
          <div
            className="flex flex-col gap-space-sm"
            id="home-community"
            tabIndex={-1}
          >
            <span className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider font-semibold">
              {translate({ id: 'site.8c59843609d4', message: '社区与生态' })}
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <a href={siteHref('/blog')}>
                  {translate({ id: 'site.87e8f72399c9', message: '博客洞察' })}
                </a>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title={translate({
                    id: 'site.1349f51625ad',
                    message: '即将开放',
                  })}
                >
                  {translate({
                    id: 'site.6bd1de08068e',
                    message: '微信开发者群',
                  })}
                </span>
              </li>
              <li>
                {translate({
                  id: 'site.c61b1e0bcaa7',
                  message: 'ModelHubXC 信创模盒',
                })}
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider font-semibold">
              {translate({ id: 'site.f0009e1a62b1', message: '开发者资源' })}
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <a href={siteHref('/docs')}>
                  {translate({ id: 'site.6bca6751018f', message: '技术文档' })}
                </a>
              </li>
              <li>
                <a href={siteHref('/blog')}>
                  {translate({ id: 'site.87e8f72399c9', message: '博客洞察' })}
                </a>
              </li>
              <li></li>
              <li></li>
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider font-semibold">
              {translate({ id: 'site.7a1ed67b3cce', message: '法律与开源' })}
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title={translate({
                    id: 'site.1349f51625ad',
                    message: '即将开放',
                  })}
                >
                  {'Apache 2.0 License'}
                </span>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title={translate({
                    id: 'site.1349f51625ad',
                    message: '即将开放',
                  })}
                >
                  {'Security Advisory'}
                </span>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  data-path="architecture"
                  aria-disabled="true"
                  title={translate({
                    id: 'site.1349f51625ad',
                    message: '即将开放',
                  })}
                >
                  {translate({
                    id: 'site.7fb31e61f2a1',
                    message: 'Roadmap 演进图',
                  })}
                </span>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title={translate({
                    id: 'site.1349f51625ad',
                    message: '即将开放',
                  })}
                >
                  {'Code of Conduct'}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-space-lg border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-space-md font-code-sm text-code-sm text-slate-500">
          <div>
            {translate({
              id: 'site.ba465cbc14a4',
              message:
                '© 2025 ModelSphere (模域) Open Source Project. All rights reserved.',
            })}
          </div>
          <div className="flex items-center gap-space-md">
            <span>{'Telemetry Node: AP-EAST-01'}</span>
            <span>{'SHA: 4f8b9e1'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
