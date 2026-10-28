import { useSitePath } from '@site/src/lib/use-site-path';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React from 'react';
import './styles.css';

// Markup and labels transcribed from the selected Stitch screen; keep data-home hooks intact.
export function FaultTolerance() {
  return (
    <section
      className="w-full py-12 px-margin bg-slate-50/70 border-b border-slate-200/70"
      id="fault-tolerance"
      data-home-design=""
      aria-label="大模型推理断流续写"
      aria-description="按设计稿展示的机制、配置与性能示例，不代表运行时状态、实测证明或服务保证。"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex items-center gap-2" data-home-intro="">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-code-sm text-code-sm text-emerald-600 font-bold uppercase tracking-widest">
            {'CORE MECHANISM 01 · FAULT TOLERANCE'}
          </span>
        </div>
        <div
          className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-12 items-start"
          data-home-pair=""
          data-home-reveal="panel"
        >
          <div className="xl:col-span-5 flex flex-col gap-6">
            <div data-home-intro="">
              <h2
                className="font-headline-lg text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight"
                id="continuation-title"
              >
                <a
                  href="https://github.com/modelsphere/modelsphere/blob/d5c892d2c1747b9411b423dae5c776d0c84a8003/docs/deploy-a-model.md#continuation-gateway-optional"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  大模型推理断流续写：
                </a>
              </h2>
              <p className="font-headline-lg text-3xl xl:text-4xl font-extrabold text-emerald-600 tracking-tight leading-tight mt-1">
                {'\n100% 隔离服务崩溃断流\n'}
              </p>
              <div>
                <br />
              </div>
              <p></p>
            </div>
            <div className="flex flex-col gap-4 text-slate-700">
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-600 shadow-sm">
                  <span
                    className="material-symbols-outlined text-[17px]"
                    aria-hidden="true"
                  >
                    {'radar'}
                  </span>
                </div>
                <div className="font-body-md text-sm leading-relaxed">
                  <strong className="text-slate-900 font-semibold">
                    {'Hang-Watcher 旁路秒级探活：'}
                  </strong>
                  {
                    '\n独立旁路探针实时监听引擎的 Token Emit 时间戳，若单 Token 生成等待时长超过动态阈值（如 150ms 超出 P99.9），立即将节点判定为 Hang 状态并下发熔断。\n'
                  }
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-600 shadow-sm">
                  <span
                    className="material-symbols-outlined text-[17px]"
                    aria-hidden="true"
                  >
                    {'replay'}
                  </span>
                </div>
                <div className="font-body-md text-sm leading-relaxed">
                  <strong className="text-slate-900 font-semibold">
                    {'Token 上下文状态重放：'}
                  </strong>
                  {
                    '\n网关层实时缓存当前流式对话已吐出的 Token 1~N，并在检测到节点异常时，自动向健康节点发起包含历史 Token 的接续 Prefill 请求。\n'
                  }
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-600 shadow-sm">
                  <span
                    className="material-symbols-outlined text-[17px]"
                    aria-hidden="true"
                  >
                    {'hub'}
                  </span>
                </div>
                <div className="font-body-md text-sm leading-relaxed">
                  <strong className="text-slate-900 font-semibold">
                    {'客户端 SSE 无感知透明接力：'}
                  </strong>
                  {
                    '\n客户端浏览器或 API Client 的长连接永不中断，直接在 Token N+1 处无缝追加输出，前端对话 UI 毫无卡死与重试刷新感。\n'
                  }
                  <div>
                    <br />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-2 font-code-sm text-xs">
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/90 shadow-sm">
                {'\nResumption SLA: < 200ms\n'}
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200 shadow-sm">
                {'\nZero-Drop Guarantee\n'}
              </span>
            </div>
          </div>
          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 font-code-sm text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-900 font-bold uppercase tracking-wider">
                  {'TOKEN RESUMPTION SEQUENCE ENGINE'}
                </span>
              </div>
              <span className="text-slate-500">
                {'E2E TIME: 168ms FAILOVER'}
              </span>
            </div>
            <div className="flex flex-col gap-3 font-body-sm text-xs leading-normal">
              <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold font-code-sm">
                      {'01'}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {'正常流式推理阶段'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-code-sm bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {'STREAMING'}
                  </span>
                </div>
                <p className="text-slate-600">
                  {'\n客户端保持 SSE 长连接；网关将请求分流至 '}
                  <strong className="text-sky-700">{'模型服务 A'}</strong>
                  {'；服务依次生成并吐出 Token 1 → 2 → 3 → 4 → 5。\n'}
                </p>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-code-sm text-[11px] text-slate-600 flex items-center gap-1.5 overflow-x-auto shadow-inner">
                  <span className="text-slate-400 select-none">
                    {'Client SSE:'}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {'[Tok 1]'}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {'[Tok 2]'}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {'[Tok 3]'}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {'[Tok 4]'}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {'[Tok 5] ...'}
                  </span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold font-code-sm">
                      {'02'}
                    </span>
                    <span className="font-bold text-red-900 text-sm">
                      {'突发故障 & 旁路探针捕获'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-code-sm bg-red-100 text-red-700 border border-red-300">
                    {'HANG DETECTED (140ms)'}
                  </span>
                </div>
                <p className="text-slate-700">
                  <strong className="text-red-700">{'模型服务 A'}</strong>
                  {
                    ' 遭遇 GPU 显存死锁或 CUDA Illegal Memory Access，生成中断。Hang-Watcher 探针在 140ms 内检测到 Token Emit 超时，通知网关切断与 A 的通道。\n'
                  }
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold font-code-sm">
                      {'03'}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {'携带上下文无缝切换健康节点'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-code-sm bg-sky-100 text-sky-700 border border-sky-300">
                    {'RE-ROUTING'}
                  </span>
                </div>
                <p className="text-slate-700">
                  {
                    '\n聚合调度网关截取已吐出的 Token 1~5，结合 L3 KV Cache 共享句柄，瞬间重定向发送至健康备用节点 '
                  }
                  <strong className="text-sky-700">{'模型服务 B'}</strong>
                  {'。\n'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-code-sm">
                      {'04'}
                    </span>
                    <span className="font-bold text-emerald-900 text-sm">
                      {'断点接续与透明推流'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-code-sm bg-emerald-100 text-emerald-700 border border-emerald-300">
                    {'SEAMLESS RESUME'}
                  </span>
                </div>
                <p className="text-slate-700">
                  <strong className="text-emerald-700">{'模型服务 B'}</strong>
                  {
                    ' 极速计算并接续生成 Token 6 → 7 → 8... 网关直接追加注入原 SSE 流，客户端用户界面毫无感知，零丢字体验。\n'
                  }
                </p>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 font-code-sm text-[11px] text-slate-700 flex items-center gap-1.5 overflow-x-auto shadow-inner">
                  <span className="text-slate-400 select-none">
                    {'Client SSE Resumed:'}
                  </span>
                  <span className="text-slate-400">{'[1-5 Done]'}</span>
                  <span className="text-emerald-700 font-bold">
                    {'[Tok 6]'}
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {'[Tok 7]'}
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {'[Tok 8]'}
                  </span>
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-600 animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export function QosScaling() {
  return (
    <section
      className="w-full py-12 px-margin bg-white border-b border-slate-200/70"
      id="qos-scaling"
      data-home-design=""
      aria-label="服务质量保障与弹性伸缩"
      aria-description="按设计稿展示的机制、配置与性能示例，不代表运行时状态、实测证明或服务保证。"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-2" data-home-intro="">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[18px] text-sky-600"
              aria-hidden="true"
            >
              {'tune'}
            </span>
            <span className="font-code-sm text-code-sm text-sky-600 font-bold uppercase tracking-widest">
              {'CORE MECHANISM 02 · QOS & DYNAMIC SCALING'}
            </span>
          </div>
          <h2 className="font-headline-lg text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {'\n服务质量保障与 SLO 动态弹性伸缩\n'}
          </h2>
          <p className="font-body-md text-sm text-slate-600 leading-relaxed">
            {
              '\n告别单一粗暴的 TPM/RPM 静态限流，建立基于首字延迟 (TTFT) 与每秒产出 (OTPS) 的生产级实时反馈调控。\n'
            }
          </p>
        </div>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
          data-home-pair=""
          data-home-reveal="panel"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-sky-600 text-[22px]"
                    aria-hidden="true"
                  >
                    {'speed'}
                  </span>
                  <h3 className="font-headline-sm text-slate-900 font-bold text-lg md:text-[20px] tracking-tight">
                    {'QoS 动态限流 (TTFT / OTPS)'}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold font-code-sm bg-sky-50 text-sky-600 border border-sky-100 uppercase tracking-wide">
                  {'AUTO-THROTTLE'}
                </span>
              </div>
              <p className="font-body-md text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 mb-4">
                {
                  '\n静态限流无法感知 Prefill 算力饱和引发的排队雪崩。ModelSphere 动态监测首字延迟。当 TTFT 突破阈值时，网关在毫秒级返回携带 Retry-After: 120ms 的智能 429 退避，避免集群被拖死。\n'
                }
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-inner gap-4 font-code-sm text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="font-bold text-slate-800">
                    {'kimi-k3-nginx-ingress-0'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {'TTFT: 68.6s (Degraded)'}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {'OTPS: 42.4 tok/s'}
                  </span>
                </div>
              </div>
              <div className="relative w-full h-36 bg-slate-50/60 rounded-lg p-2.5 flex flex-col justify-between border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between z-10 text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-red-600 font-semibold">
                      <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
                      {' TTFT (ms)'}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-3 h-0.5 border-t border-dashed border-emerald-500 inline-block"></span>
                      {' OTPS (tok/s)'}
                    </span>
                  </div>
                  <span className="text-slate-400 font-medium">
                    {'Threshold: 10,000ms'}
                  </span>
                </div>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none p-3 overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 400 120"
                >
                  <defs>
                    <linearGradient id="ttftGlow" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="rgb(var(--color-home-source-ef4444-rgb))"
                        stopOpacity="0.25"
                      ></stop>
                      <stop
                        offset="100%"
                        stopColor="rgb(var(--color-home-source-ef4444-rgb))"
                        stopOpacity="0.0"
                      ></stop>
                    </linearGradient>
                  </defs>
                  <line
                    stroke="rgb(var(--color-home-source-e2e8f0-rgb))"
                    strokeDasharray="3,3"
                    strokeWidth="1"
                    x1="10"
                    x2="390"
                    y1="30"
                  ></line>
                  <line
                    stroke="rgb(var(--color-home-source-e2e8f0-rgb))"
                    strokeDasharray="3,3"
                    strokeWidth="1"
                    x1="10"
                    x2="390"
                    y1="65"
                  ></line>
                  <line
                    stroke="rgb(var(--color-home-source-e2e8f0-rgb))"
                    strokeDasharray="3,3"
                    strokeWidth="1"
                    x1="10"
                    x2="390"
                    y1="95"
                  ></line>
                  <line
                    stroke="rgb(var(--color-home-source-f59e0b-rgb))"
                    strokeDasharray="4,3"
                    strokeWidth="1.5"
                    x1="10"
                    x2="390"
                    y1="55"
                  ></line>
                  <text
                    fill="rgb(var(--color-home-source-d97706-rgb))"
                    fontFamily="monospace"
                    fontSize="9"
                    fontWeight="600"
                    x="335"
                    y="51"
                  >
                    {'Threshold'}
                  </text>
                  <line
                    stroke="rgb(var(--color-home-source-ef4444-rgb))"
                    strokeDasharray="3,3"
                    strokeWidth="1.5"
                    x1="195"
                    x2="195"
                    y1="10"
                  ></line>
                  <path
                    d="M 10 95 Q 120 95, 155 75 T 195 20 Q 235 75, 275 95 T 390 95 L 390 115 L 10 115 Z"
                    fill="url(#ttftGlow)"
                  ></path>
                  <path
                    d="M 10 95 Q 120 95, 155 75 T 195 20 Q 235 75, 275 95 T 390 95"
                    fill="none"
                    stroke="rgb(var(--color-home-source-ef4444-rgb))"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  ></path>
                  <circle
                    cx="195"
                    cy="20"
                    fill="rgb(var(--color-home-source-ef4444-rgb))"
                    r="4.5"
                  ></circle>
                  <circle
                    className="animate-ping"
                    cx="195"
                    cy="20"
                    fill="rgb(var(--color-home-source-ef4444-rgb))"
                    opacity="0.6"
                    r="7"
                  ></circle>
                  <path
                    d="M 10 40 Q 110 40, 150 55 T 195 85 Q 240 55, 280 40 T 390 40"
                    fill="none"
                    stroke="rgb(var(--color-home-source-10b981-rgb))"
                    strokeDasharray="5,3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                  <circle
                    cx="195"
                    cy="85"
                    fill="rgb(var(--color-home-source-10b981-rgb))"
                    r="3.5"
                  ></circle>
                </svg>
                <div className="flex items-center justify-between text-[10px] text-slate-400 z-10 pt-2 border-t border-slate-200/80 mt-auto">
                  <span>{'00:00:00'}</span>
                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-semibold">
                    {'429 Dynamic Throttle Event (Triggered at 00:02:15)'}
                  </span>
                  <span>{'00:05:00'}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 border border-slate-100 rounded-lg bg-slate-50/70 p-2 text-center text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px]">
                    {'Mitigation Action'}
                  </span>
                  <span className="font-bold text-red-600">
                    {'429 Auto-Backoff'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px]">
                    {'Retry-After'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {'120ms Dynamic'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px]">
                    {'Recovery Latency'}
                  </span>
                  <span className="font-bold text-emerald-600">
                    {'< 350ms Stable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-emerald-600 text-[22px]"
                    aria-hidden="true"
                  >
                    {'auto_mode'}
                  </span>
                  <h3 className="font-headline-sm text-slate-900 font-bold text-lg md:text-[20px] tracking-tight">
                    {'SLO 弹性扩缩容 (K8s HPA/EDA)'}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold font-code-sm bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase tracking-wide">
                  {'GPU UTIL 85%+'}
                </span>
              </div>
              <p className="font-body-md text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 mb-4">
                {
                  '\n随并发需求毫秒级调整推理 Pod 副本；非高峰期高优模型借用闲置芯片，使集群整体 GPU 利用率从行业平均 45% 大幅跃升至 85% 以上，且缩容时保证就绪请求排空再释放。\n'
                }
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-inner gap-4">
              <div className="flex items-center justify-between font-code-sm text-xs">
                <span className="text-slate-800 font-bold">
                  {'glm-5.2-prod-pool Scale Trace'}
                </span>
                <span className="text-emerald-600 font-semibold">
                  {'Current: 16 Replicas (Active)'}
                </span>
              </div>
              <div className="relative w-full h-36 bg-slate-50/60 rounded-lg p-2 flex flex-col justify-between border border-slate-100 font-code-sm text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    {'16 Pods'}
                  </span>
                  <span className="text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                    {'Peak Burst: 18,200 QPS'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{'12 Pods'}</span>
                  <span className="text-slate-400">{'Midday Load'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span>{'8 Pods'}</span>
                  <span className="text-slate-400">{'Night Idle Base'}</span>
                </div>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none p-3 overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 400 120"
                >
                  <path
                    d="M 10 95 L 80 95 L 80 55 L 180 55 L 180 20 L 300 20 L 300 55 L 390 55"
                    fill="none"
                    stroke="rgb(var(--color-home-source-007bb9-rgb))"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  ></path>
                  <circle
                    cx="80"
                    cy="55"
                    fill="rgb(var(--color-home-source-007bb9-rgb))"
                    r="3.5"
                  ></circle>
                  <circle
                    cx="180"
                    cy="20"
                    fill="rgb(var(--color-home-source-007bb9-rgb))"
                    r="4.5"
                  ></circle>
                  <circle
                    cx="300"
                    cy="20"
                    fill="rgb(var(--color-home-source-007bb9-rgb))"
                    r="3.5"
                  ></circle>
                  <circle
                    cx="300"
                    cy="55"
                    fill="rgb(var(--color-home-source-007bb9-rgb))"
                    r="3.5"
                  ></circle>
                </svg>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 border border-slate-100 rounded-lg bg-slate-50/70 p-2 text-center font-code-sm text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px]">
                    {'Scale-Up'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {'< 1.2s Warm'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px]">
                    {'Graceful Drain'}
                  </span>
                  <span className="font-bold text-emerald-600">
                    {'Zero Drop'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px]">
                    {'Hardware Sharing'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {'B300 + 昇腾'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export function AutotuneEvolution() {
  const flowRef = React.useRef<HTMLDivElement>(null);

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
      className="w-full py-12 px-margin bg-slate-50/70 border-b border-slate-200/70"
      id="autotune-evolution"
      data-home-design=""
      aria-label="性能持续优化"
      aria-description="按设计稿展示的机制、配置与性能示例，不代表运行时状态、实测证明或服务保证。"
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
            {'Tuning-Agent 性能持续优化'}
          </h2>
          <p className="font-body-md text-sm text-slate-600 leading-relaxed whitespace-nowrap">
            {
              '\n      告别繁冗的人工基准盲测。ModelSphere 将线上真实请求、低谷空闲算力、网格化超参搜索与零停机灰度上线串联成全自动化演进飞轮。\n    '
            }
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
              <span>{'演进范式跃迁'}</span>
            </div>
            <h3 className="font-headline-sm text-2xl font-bold text-slate-900 leading-snug tracking-tight mb-2">
              {'从“人工盲测”跨越到“自主演进”'}
            </h3>
            <p className="font-body-md text-sm text-slate-600 mb-6 leading-relaxed">
              {'用空闲算力持续榨干硬件潜能，让 LLM 推理服务越用越快。'}
            </p>
            <div className="flex flex-col gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-code-sm bg-sky-100 text-sky-800 border border-sky-200 flex-shrink-0 mt-0.5">
                  {'采样更准'}
                </span>
                <p className="font-body-sm text-xs text-slate-700 leading-relaxed">
                  <span className="text-slate-400">{'静态数据集测试'}</span>
                  {' → '}
                  <strong className="text-slate-900">
                    {'7 天滑动窗口真实流量特征蓄水'}
                  </strong>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-code-sm bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0 mt-0.5">
                  {'成本更低'}
                </span>
                <p className="font-body-sm text-xs text-slate-700 leading-relaxed">
                  <span className="text-slate-400">{'占用生产资源压测'}</span>
                  {' → '}
                  <strong className="text-slate-900">
                    {'夜间低峰期闲置算力并发网格搜索'}
                  </strong>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-code-sm bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0 mt-0.5">
                  {'交付更稳'}
                </span>
                <p className="font-body-sm text-xs text-slate-700 leading-relaxed">
                  <span className="text-slate-400">{'停机重启更新参数'}</span>
                  {' → '}
                  <strong className="text-slate-900">
                    {'冠军方案自动验证，生产环境零停机热加载'}
                  </strong>
                </p>
              </div>
            </div>
          </div>
          <div
            className="xl:col-span-7 flex flex-col justify-between gap-3 relative z-10 w-full home-autotune-flow"
            ref={flowRef}
          >
            <div className="flex justify-center w-full">
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
                      {'线上推理服务'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {'稳定运行'}
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-slate-600 mb-2 leading-tight">
                  {'稳定运行，持续提供高质量低时延高可用服务'}
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
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
                      {'自动化上线'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {'生产灰度'}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {'最优配置自动部署，零丢流热加载'}
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
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center py-1">
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
                    {'持续性能优化闭环'}
                  </h4>
                  <span className="mt-1 px-1.5 py-0.5 rounded-full bg-white/90 border border-sky-200 text-sky-800 font-code-sm text-[8px] font-semibold shadow-sm">
                    {'AUTOTUNE ENGINE'}
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
                      {'收集流量数据'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {'特征蓄水'}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {'构建滑动窗口数据集与前缀拓扑'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                      {'产出并验证配置'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    {'真实负载'}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {'基于真实负载比选出冠军推理方案'}
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
                      {'利用空闲算力调优'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {'低峰搜索'}
                  </span>
                </div>
                <p className="font-body-sm text-[10px] text-slate-600 mb-1.5 leading-tight">
                  {'夜间低峰期并发搜索更优推理超参'}
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
  return (
    <section
      className="w-full py-space-xl px-margin bg-white border-b border-slate-200/70"
      id="benchmarks"
      data-home-design=""
      aria-label="透明可复现的真实实测"
      aria-description="按设计稿展示的机制、配置与性能示例，不代表运行时状态、实测证明或服务保证。"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <span className="font-label-caps text-label-caps text-emerald-600 uppercase tracking-widest font-semibold">
              {'Empirical Telemetry'}
            </span>
            <h2 className="font-headline-lg text-headline-lg text-slate-900 font-bold tracking-tight">
              {'\n              透明可复现的真实实测'}
            </h2>
            <p className="font-body-md text-body-md text-slate-600">
              {
                '公开完整的基准输入输出分布、硬件拓扑与权衡代价，每一次调优收益皆可复核。\n            '
              }
            </p>
          </div>
          <div className="flex items-center gap-space-xs text-slate-500 font-code-sm text-code-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{'Verified on MLPerf & LLMBench harness'}</span>
          </div>
        </div>
        <div className="w-full overflow-x-auto rounded-xl bg-white border border-slate-200 shadow-sm">
          <table
            className="w-full text-left font-body-md text-body-md"
            aria-label="设计稿性能实测对照示例"
            data-design-example=""
          >
            <thead className="bg-slate-50 border-b border-slate-200 font-label-caps text-label-caps text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-space-md px-space-md">{'模型与架构'}</th>
                <th className="py-space-md px-space-md">{'硬件环境'}</th>
                <th className="py-space-md px-space-md">
                  {'负载场景 (Prompt+Output)'}
                </th>
                <th className="py-space-md px-space-md">
                  {'吞吐对比 (Default vs Tuned)'}
                </th>
                <th className="py-space-md px-space-md">{'性能飞跃'}</th>
                <th className="py-space-md px-space-md">
                  {'调优技术与代价说明'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-code-sm text-code-sm text-slate-700">
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-space-md px-space-md font-bold text-slate-900">
                  {'MiMo-V2.5'}
                </td>
                <td className="py-space-md px-space-md text-slate-500">
                  {'8 × NVIDIA H100'}
                </td>
                <td className="py-space-md px-space-md text-slate-600">
                  {'50k + 1.5k (长上下文)'}
                </td>
                <td className="py-space-md px-space-md">
                  <span className="text-slate-400">{'13,900'}</span>
                  {' → '}
                  <span className="text-sky-600 font-bold">
                    {'30,600 tok/s'}
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {'+119.9%'}
                  </span>
                </td>
                <td className="py-space-md px-space-md text-body-sm text-slate-600">
                  {
                    '\n                  并发 4→26; TTFT 4.81s→7.66s (符合 SLO ≤ 8s); GPQA 精度微降 3.03% (显式折中)\n                '
                  }
                </td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <td className="py-space-md px-space-md font-bold text-slate-900">
                  {'DeepSeek-V4.1-Flash'}
                </td>
                <td className="py-space-md px-space-md text-slate-500">
                  {'8 × NVIDIA H100'}
                </td>
                <td className="py-space-md px-space-md text-slate-600">
                  {'50k + 1.5k / 8k + 1k'}
                </td>
                <td className="py-space-md px-space-md">
                  <span className="text-slate-500 font-medium">
                    {'长文大幅跃升'}
                  </span>
                  {' / 常用平稳\n                '}
                </td>
                <td className="py-space-md px-space-md">
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {'+89.5% / +5.0%'}
                  </span>
                </td>
                <td className="py-space-md px-space-md text-body-sm text-slate-600">
                  {
                    '\n                  客观体现“负载改变收益改变”，AutoTune 针对超长上下文自适应调整 Chunk 分块\n                '
                  }
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-space-md px-space-md font-bold text-slate-900">
                  {'Qwen3.6-35B-A3B'}
                </td>
                <td className="py-space-md px-space-md text-slate-500">
                  {'2 × NVIDIA H800'}
                </td>
                <td className="py-space-md px-space-md text-slate-600">
                  {'Agentic (c=8 并发多轮)'}
                </td>
                <td className="py-space-md px-space-md">
                  <span className="text-slate-400">{'6,200'}</span>
                  {' → '}
                  <span className="text-sky-600 font-bold">
                    {'8,016 tok/s'}
                  </span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {'+29.3%'}
                  </span>
                </td>
                <td className="py-space-md px-space-md text-body-sm text-slate-600">
                  {
                    '\n                  SGLang + FlashAttention-3 + FP8 + Chunked Prefill 32768 + extra_buffer 深度融合\n                '
                  }
                </td>
              </tr>
              <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <td className="py-space-md px-space-md font-bold text-slate-900">
                  {'GLM-5.3 (NVFP4)'}
                </td>
                <td className="py-space-md px-space-md text-slate-500">
                  {'4 × NVIDIA B300'}
                </td>
                <td className="py-space-md px-space-md text-slate-600">
                  {'全量生产仿真混合集'}
                </td>
                <td className="py-space-md px-space-md">
                  <span className="text-slate-500">{'基线对比'}</span>
                  {' → '}
                  <span className="text-sky-600 font-bold">{'最高峰值'}</span>
                </td>
                <td className="py-space-md px-space-md">
                  <span className="px-2 py-1 rounded bg-sky-100 text-sky-800 font-bold border border-sky-200">
                    {'+195.3%'}
                  </span>
                </td>
                <td className="py-space-md px-space-md text-body-sm text-slate-600">
                  {
                    '\n                  AutoTune 搜索至最优 TP4 单节点拓扑，集成 modelopt_fp4 极致内核\n                '
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
      aria-label="开始部署"
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
              {'\n        准备好让你的大模型推理集群提速了吗？\n      '}
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg max-w-3xl leading-relaxed mb-8 font-normal">
              {
                '全套源码完全开源，加入顶尖 AI Infra 工程师共建的下一代推理基础设施。\n      '
              }
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <a
              href={siteHref(
                String(siteConfig.customFields?.docsQuickstartHref ?? '/docs'),
              )}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-600 hover:bg-slate-50 transition-all font-semibold text-base shadow-md hover:shadow-lg"
            >
              <span>{'立即部署'}</span>
              <svg
                className="w-4 h-4 fill-current text-blue-600"
                viewBox="0 0 24 24"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
            </a>
            <a
              href="#home-community"
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
              <span>{'加入开发者交流群'}</span>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/80 font-code-sm text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              {'✓ Apache-2.0 Open Source'}
            </span>
            <span className="opacity-60">{'•'}</span>
            <span className="inline-flex items-center gap-1.5">
              {'✓ Helm Chart 1-Click Ready'}
            </span>
            <span className="opacity-60">{'•'}</span>
            <span className="inline-flex items-center gap-1.5">
              {'✓ Zero Cloud Lock-in'}
            </span>
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
      aria-label="页脚资源"
      aria-description="页脚状态、节点及 SHA 按设计稿展示为示例。"
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
                {'模域 ModelSphere'}
              </span>
            </div>
            <p className="font-body-md text-body-md text-slate-600 max-w-sm">
              {'让大模型推理从实验室能跑，到生产好用。'}
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
              {'开源代码'}
              <br />
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <a
                  href="https://github.com/modelsphere/modelsphere"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {'GitHub 仓库'}
                </a>
              </li>
              <li>
                <a href={siteHref('/models')}>{'Model Catalog 模型库'}</a>
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
              {'社区与生态'}
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <a href={siteHref('/blog')}>{'博客洞察'}</a>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title="即将开放"
                >
                  {'微信开发者群'}
                </span>
              </li>
              <li>{'ModelHubXC 信创模盒'}</li>
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider font-semibold">
              {'开发者资源'}
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <a href={siteHref('/docs')}>{'技术文档'}</a>
              </li>
              <li>
                <a href={siteHref('/blog')}>{'博客洞察'}</a>
              </li>
              <li></li>
              <li></li>
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider font-semibold">
              {'法律与开源'}
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-slate-600">
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title="即将开放"
                >
                  {'Apache 2.0 License'}
                </span>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title="即将开放"
                >
                  {'Security Advisory'}
                </span>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  data-path="architecture"
                  aria-disabled="true"
                  title="即将开放"
                >
                  {'Roadmap 演进图'}
                </span>
              </li>
              <li>
                <span
                  className="hover:text-sky-600 transition-colors"
                  aria-disabled="true"
                  title="即将开放"
                >
                  {'Code of Conduct'}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-space-lg border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-space-md font-code-sm text-code-sm text-slate-500">
          <div>
            {
              '© 2025 ModelSphere (模域) Open Source Project. All rights reserved.'
            }
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
