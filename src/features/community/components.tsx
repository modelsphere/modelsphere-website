import { translate } from '@docusaurus/Translate';
import React, { useRef } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useSitePath } from '@site/src/lib/use-site-path';
import { useHomeMotion } from '@site/src/components/HomeMotion';
import './styles.css';
import { CommunityCalendar } from './Calendar';

// GitHub profile names; fall back to the account ID when Name is empty.
const maintainerNames: Partial<Record<string, string>> = {
  lumianph: 'LU MIAN',
  zhanghaohit: 'ZHANG Hao',
  imneov: 'LiuFeng',
};

function MaintainerName({ login }: { login: string }) {
  const name = maintainerNames[login]?.trim() || login;
  return (
    <div className="flex items-center justify-between">
      <h4 className="font-headline-sm text-base md:text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
        {name}
      </h4>
    </div>
  );
}

// Verbatim copy and source classes from Stitch canvas “社区生态-更新2”.
// Unconfigured source actions do not claim a subscription or reminder was created.
export function CommunityHeader() {
  const symbol = useBaseUrl('/brand/modelsphere-symbol.png');
  return (
    <header
      className="fixed top-0 left-0 right-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] community-header"
      data-community-design=""
    >
      <div className="h-16 w-full px-6 md:px-8 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-2 group" to="/">
            <img
              alt="ModelSphere Logo"
              className="h-8 w-auto object-contain"
              src={symbol}
            />
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-lg font-bold text-slate-900 tracking-tight">
                {translate({ id: 'site.ffbb1a447f85', message: '模域' })}
              </span>
              <span className="font-code-lg text-sm text-sky-600 font-semibold tracking-tight">
                {'ModelSphere'}
              </span>
            </div>
          </Link>
        </div>
        <nav
          className="hidden xl:flex items-center gap-1 community-desktop-nav"
          aria-label={translate({ id: 'site.9bae68040509', message: '主导航' })}
        >
          <Link
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
            to="/"
          >
            {translate({ id: 'site.203c08e0d44a', message: '首页' })}
          </Link>
          <Link
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
            to="/models"
          >
            {translate({ id: 'site.34b3cac2a496', message: '模型目录' })}
          </Link>
          <Link
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
            to="/docs"
          >
            {translate({ id: 'site.fda4566fda7d', message: '文档指南' })}
          </Link>
          <Link
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
            to="/blog"
          >
            {translate({ id: 'site.7131e5de923b', message: '博客洞见' })}
          </Link>
          <Link
            aria-current="page"
            className="px-3 py-1.5 transition-all bg-sky-50 text-sky-700 border border-sky-100 font-semibold rounded-lg text-sm"
            to="/community"
          >
            {translate({ id: 'site.01cca2c2836f', message: '社区生态' })}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <a
            className="hidden md:flex items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-all shadow-sm"
            href="https://github.com/modelsphere"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span
              className="material-symbols-outlined text-[17px] text-amber-500 mr-1.5"
              aria-hidden="true"
            >
              {'star'}
            </span>
            <span className="font-code-sm text-xs font-semibold">{'Star'}</span>
          </a>
          <Link
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-sky-600 text-white font-body-sm text-sm font-semibold hover:bg-sky-700 shadow-sm transition-all shadow-sky-600/20"
            to="/docs"
          >
            {translate({ id: 'site.334c20e1a480', message: '快速开始' })}
          </Link>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
            <span
              className="material-symbols-outlined text-[18px]"
              aria-hidden="true"
            >
              {'person'}
            </span>
          </div>
        </div>
        <details
          className="community-mobile-menu"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}
        >
          <summary
            aria-label={translate({
              id: 'site.e35a36e26d52',
              message: '导航菜单',
            })}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <nav
            className="community-mobile-links"
            aria-label={translate({
              id: 'site.a1d579490367',
              message: '移动主导航',
            })}
            onClick={(event) => {
              if ((event.target as Element).closest('a'))
                event.currentTarget.closest('details')?.removeAttribute('open');
            }}
          >
            <Link
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
              to="/"
            >
              {translate({ id: 'site.203c08e0d44a', message: '首页' })}
            </Link>
            <Link
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
              to="/models"
            >
              {translate({ id: 'site.34b3cac2a496', message: '模型目录' })}
            </Link>
            <Link
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
              to="/docs"
            >
              {translate({ id: 'site.fda4566fda7d', message: '文档指南' })}
            </Link>
            <Link
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-body-md text-sm transition-all"
              to="/blog"
            >
              {translate({ id: 'site.7131e5de923b', message: '博客洞见' })}
            </Link>
            <Link
              aria-current="page"
              className="px-3 py-1.5 transition-all bg-sky-50 text-sky-700 border border-sky-100 font-semibold rounded-lg text-sm"
              to="/community"
            >
              {translate({ id: 'site.01cca2c2836f', message: '社区生态' })}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
export function CommunityContent() {
  const groupQr = useBaseUrl('/community/wechat-group-qr.png');
  const root = useRef<HTMLElement>(null);
  useHomeMotion(root, '#community-hero');
  return (
    <main
      ref={root}
      className="w-full bg-[#faf8ff] community-motion"
      id="main-content"
      data-community-design=""
    >
      <div className="flex flex-col w-full">
        <section
          className="relative w-full px-6 md:px-8 py-16 md:py-20 overflow-hidden bg-gradient-to-b from-sky-50/70 via-[#faf8ff] to-[#faf8ff] border-b border-slate-200/80"
          id="community-hero"
          aria-labelledby="community-hero-title"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[820px] h-[360px] bg-sky-200/30 rounded-full blur-[110px] pointer-events-none"></div>
          <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center text-center">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 font-code-sm text-xs text-slate-500 mb-4"
            >
              <Link className="hover:text-sky-600 transition-colors" to="/">
                {translate({ id: 'site.203c08e0d44a', message: '首页' })}
              </Link>
              <span className="text-slate-400">{'/'}</span>
              <span className="text-sky-700 font-medium">
                {translate({ id: 'site.8c59843609d4', message: '社区与生态' })}
              </span>
            </nav>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-label-caps text-xs shadow-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700 font-semibold">
                {'TRINITY ECOSYSTEM ARCHITECTURE'}
              </span>
            </div>

            <h1
              className="font-headline-lg text-3xl sm:text-4xl md:text-[44px] font-bold text-slate-900 tracking-tight max-w-4xl mx-auto mb-4 leading-tight"
              id="community-hero-title"
              data-home-hero="title"
            >
              {translate({
                id: 'site.0893c0424f2e',
                message: '\n      让 AI 基础设施优化成为全社会的',
              })}
              <span className="text-sky-600 drop-shadow-[0_2px_12px_rgba(2,132,199,0.18)]">
                {translate({ id: 'site.028a5f6e2be9', message: '“公共资产”' })}
              </span>
            </h1>
            <p
              className="font-body-md text-base md:text-lg text-slate-600 max-w-2xl mx-auto text-center mt-2 mb-6 leading-relaxed"
              data-home-hero="lead"
            >
              {translate({
                id: 'site.cbb8c5a8bdb7',
                message: '参与ModelSphere开源社区，共同推动AI基础设施发展。',
              })}
            </p>

            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 relative items-stretch text-left"></div>
          </div>
        </section>

        <section
          className="w-full px-6 md:px-8 py-20 bg-[#f8fafc] text-slate-800 relative overflow-hidden border-b border-slate-200/80"
          id="community-maintainers"
          aria-labelledby="community-maintainers-title"
        >
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-12 relative">
            <div
              className="flex flex-col items-center text-center gap-3 max-w-3xl mx-auto"
              data-home-intro=""
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-sky-700 font-label-caps text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold">
                  {'COMMUNITY LEADERSHIP & GOVERNANCE'}
                </span>
              </div>
              <h2
                className="font-headline-lg text-3xl md:text-4xl font-bold text-slate-900 tracking-tight"
                id="community-maintainers-title"
              >
                {translate({ id: 'site.9165f482a905', message: '社区维护者' })}
              </h2>
              <p className="font-body-md text-sm md:text-base text-slate-600 leading-relaxed">
                {translate({
                  id: 'site.31579bd3b6f1',
                  message:
                    '\nModelSphere 由以下维护者共同推进，负责项目架构方向、PR 严格评审与生产稳定版本发布。\n',
                })}
              </p>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              data-home-reveal="panel"
              data-home-pair=""
            >
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all group">
                <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-sky-400 via-teal-400 to-indigo-500 shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-bold font-headline-sm text-lg border border-slate-200/60">
                    {'LM'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <MaintainerName login="lumianph" />
                  <div className="flex items-center gap-2 font-code-sm text-xs truncate">
                    <span className="text-emerald-700 font-semibold">
                      {translate({
                        id: 'site.cbe1e8aa200d',
                        message: '范式智能（Phancy）',
                      })}
                    </span>
                    <span className="text-slate-300">{'•'}</span>
                    <a
                      className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
                      href="https://github.com/lumianph"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className="material-symbols-outlined text-[14px]"
                        aria-hidden="true"
                      >
                        {'code'}
                      </span>
                      <span className="">{'@lumianph'}</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all group">
                <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 via-sky-400 to-cyan-500 shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-bold font-headline-sm text-lg border border-slate-200/60">
                    {'ZH'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <MaintainerName login="zhanghaohit" />
                  <div className="flex items-center gap-2 font-code-sm text-xs truncate">
                    <span className="text-emerald-700 font-semibold">
                      {translate({
                        id: 'site.cbe1e8aa200d',
                        message: '范式智能（Phancy）',
                      })}
                    </span>
                    <span className="text-slate-300">{'•'}</span>
                    <a
                      className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
                      href="https://github.com/zhanghaohit"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className="material-symbols-outlined text-[14px]"
                        aria-hidden="true"
                      >
                        {'code'}
                      </span>
                      <span className="">{'@zhanghaohit'}</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all group">
                <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-500 shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-bold font-headline-sm text-lg border border-slate-200/60">
                    {'AF'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <MaintainerName login="aceforeverd" />
                  <div className="flex items-center gap-2 font-code-sm text-xs truncate">
                    <span className="text-emerald-700 font-semibold">
                      {translate({
                        id: 'site.cbe1e8aa200d',
                        message: '范式智能（Phancy）',
                      })}
                    </span>
                    <span className="text-slate-300">{'•'}</span>
                    <a
                      className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
                      href="https://github.com/aceforeverd"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className="material-symbols-outlined text-[14px]"
                        aria-hidden="true"
                      >
                        {'code'}
                      </span>
                      <span className="">{'@aceforeverd'}</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all group">
                <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-teal-400 via-sky-400 to-indigo-500 shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-bold font-headline-sm text-lg border border-slate-200/60">
                    {'RT'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <MaintainerName login="remotego" />
                  <div className="flex items-center gap-2 font-code-sm text-xs truncate">
                    <span className="text-emerald-700 font-semibold">
                      {translate({
                        id: 'site.cbe1e8aa200d',
                        message: '范式智能（Phancy）',
                      })}
                    </span>
                    <span className="text-slate-300">{'•'}</span>
                    <a
                      className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
                      href="https://github.com/remotego"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className="material-symbols-outlined text-[14px]"
                        aria-hidden="true"
                      >
                        {'code'}
                      </span>
                      <span className="">
                        {'@'}
                        <span className="">{'remotego'}</span>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all group md:col-span-2 lg:col-span-1">
                <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500 shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-bold font-headline-sm text-lg border border-slate-200/60">
                    {'IM'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <MaintainerName login="imneov" />
                  <div className="flex items-center gap-2 font-code-sm text-xs truncate">
                    <span className="text-emerald-700 font-semibold">
                      {translate({
                        id: 'site.3986f9785b06',
                        message: '睿思智联 (RiseUnion)',
                      })}
                    </span>
                    <span className="text-slate-300">{'•'}</span>
                    <a
                      className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
                      href="https://github.com/imneov"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className="material-symbols-outlined text-[14px]"
                        aria-hidden="true"
                      >
                        {'code'}
                      </span>
                      <span className="">{'@imneov'}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="w-full px-6 md:px-8 py-16 bg-[#f8fafc] border-b border-slate-200/80"
          id="community-calendar"
          aria-labelledby="community-calendar-title"
        >
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col gap-1.5" data-home-intro="">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600"></span>
                <span className="font-label-caps text-xs font-bold text-sky-700 tracking-widest uppercase">
                  {'TECH TALKS & BI-WEEKLY CALENDAR'}
                </span>
              </div>
              <h2
                className="font-headline-lg text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
                id="community-calendar-title"
              >
                {translate({
                  id: 'site.98fcedca6dd0',
                  message: '线上技术分享与社区例会日历',
                })}
              </h2>
              <p className="font-body-md text-sm text-slate-600">
                {translate({
                  id: 'site.721f5a8ebb14',
                  message: '社区技术分享与例会安排将在这里公布',
                })}
              </p>
            </div>

            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              data-home-reveal="panel"
              data-home-pair=""
            >
              <CommunityCalendar />
            </div>
          </div>
        </section>

        <section
          className="w-full px-6 md:px-8 py-16 bg-[#faf8ff] border-b border-slate-200/80"
          id="community-partners"
          aria-labelledby="community-partners-title"
        >
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-10">
            <div
              className="flex flex-col items-center text-center gap-2 max-w-3xl mx-auto"
              data-home-intro=""
            >
              <span className="font-label-caps text-xs font-bold text-sky-700 tracking-widest uppercase">
                {'INITIATORS & PARTNERS'}
              </span>
              <h2
                className="font-headline-lg text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
                id="community-partners-title"
              >
                {translate({
                  id: 'site.f330ad54f07f',
                  message: '社区发起单位与生态合作伙伴',
                })}
              </h2>
              <p className="font-body-md text-sm md:text-base text-slate-600">
                {translate({
                  id: 'site.3b8623b23db6',
                  message: '\n        模域 ModelSphere 开源社区由 ',
                })}
                <strong className="text-sky-700">
                  {translate({ id: 'site.c675275a63a8', message: '范式智能' })}
                </strong>
                {translate({ id: 'site.774163e6ec8a', message: ' 与 ' })}
                <strong className="text-sky-700">
                  {translate({ id: 'site.aeafd074c2fc', message: '睿思智联' })}
                </strong>
                {translate({
                  id: 'site.c8456611a220',
                  message: ' 共同发起\n      ',
                })}
              </p>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              data-home-reveal="panel"
              data-home-pair=""
            >
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 font-label-caps text-xs font-bold">
                      {translate({
                        id: 'site.2912bec6369c',
                        message:
                          '\n              CO-INITIATOR / 联合发起单位\n            ',
                      })}
                    </span>
                    <span
                      className="material-symbols-outlined text-sky-600 text-[22px]"
                      aria-hidden="true"
                    >
                      {'verified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-headline-sm font-bold text-xl shadow-sm">
                      {'\n              P\n            '}
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-xl font-bold text-slate-900">
                        {translate({
                          id: 'site.12e49b14f011',
                          message: '范式智能 (PHANCY)',
                        })}
                      </h3>
                      <p className="font-code-sm text-xs text-slate-500">
                        {'Enterprise AI Infrastructure'}
                      </p>
                    </div>
                  </div>
                  <p className="font-body-sm text-sm text-slate-600 leading-relaxed mb-6">
                    {translate({
                      id: 'site.3cc070cc56f5',
                      message:
                        '\n            作为社区联合发起方，负责提供工业级异构算力集群底座验证支持、海量信创芯片软硬件适配数据沉淀，以及企业级生产落地场景的持续拓展与规范制定。\n          ',
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-label-caps text-xs font-bold">
                      {translate({
                        id: 'site.2912bec6369c',
                        message:
                          '\n              CO-INITIATOR / 联合发起单位\n            ',
                      })}
                    </span>
                    <span
                      className="material-symbols-outlined text-indigo-600 text-[22px]"
                      aria-hidden="true"
                    >
                      {'verified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-700 flex items-center justify-center text-white font-headline-sm font-bold text-xl shadow-sm">
                      {'\n              R\n            '}
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-xl font-bold text-slate-900">
                        {translate({
                          id: 'site.3986f9785b06',
                          message: '睿思智联 (RiseUnion)',
                        })}
                      </h3>
                      <p className="font-code-sm text-xs text-slate-500">
                        {'Cloud-Native AI Middleware'}
                      </p>
                    </div>
                  </div>
                  <p className="font-body-sm text-sm text-slate-600 leading-relaxed mb-6">
                    {translate({
                      id: 'site.de57ac18e315',
                      message:
                        '\n            作为社区联合发起方，主导核心推理中间件研发、AutoTune 调优搜索算法、Kubernetes 云原生推理算子设计，以及面向极端并发的智能路由网关工程演进。\n          ',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="w-full bg-gradient-to-r from-sky-50 via-white to-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
              data-home-intro=""
            >
              <div className="flex flex-col gap-1 text-center md:text-left">
                <h4 className="font-headline-sm text-base font-bold text-slate-900">
                  {translate({
                    id: 'site.85906b73debe',
                    message: '硬件适配生态与企业共建伙伴计划',
                  })}
                </h4>
                <p className="font-body-sm text-sm text-slate-600">
                  {translate({
                    id: 'site.470e382248f4',
                    message: '欢迎更多芯片与企业团队加入社区生态共建。',
                  })}
                </p>
              </div>
              <a
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-body-sm text-sm font-semibold hover:bg-sky-700 transition-colors shadow-sm shrink-0"
                href="mailto:contact@modelsphere.org"
              >
                <span className="">
                  {translate({
                    id: 'site.e2caa71efc6d',
                    message: '申请加入生态共建',
                  })}
                </span>
                <span
                  className="material-symbols-outlined text-[16px]"
                  aria-hidden="true"
                >
                  {'arrow_forward'}
                </span>
              </a>
            </div>
          </div>
        </section>

        <section
          className="w-full px-6 md:px-8 py-16 bg-[#f8fafc] border-b border-slate-200/80"
          id="community-channels"
          aria-labelledby="community-channels-title"
        >
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-12">
            <div
              className="flex flex-col items-center text-center gap-2 max-w-2xl mx-auto"
              data-home-intro=""
            >
              <span className="font-label-caps text-xs font-bold text-sky-700 tracking-widest uppercase">
                {'CONNECT WITH US'}
              </span>
              <h2
                className="font-headline-lg text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
                id="community-channels-title"
              >
                {translate({
                  id: 'site.cebdad8111ec',
                  message: '社区交流与连接渠道',
                })}
              </h2>
              <p className="font-body-md text-sm text-slate-600">
                {translate({
                  id: 'site.89ab9255e823',
                  message:
                    '无论是架构探讨、集群选型，还是实时故障排查，随时随地与核心团队保持对话',
                })}
              </p>
            </div>

            <div
              className="grid grid-cols-1 gap-6 community-channels-grid"
              data-home-reveal="panel"
              data-home-pair=""
            >
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition-all group">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                      <span
                        className="material-symbols-outlined text-[24px]"
                        aria-hidden="true"
                      >
                        {'forum'}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 font-label-caps text-xs font-semibold">
                      {translate({
                        id: 'site.2e212e970075',
                        message: '实时答疑',
                      })}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg font-bold text-slate-900 mb-0.5">
                      {translate({
                        id: 'site.c6e8323544d9',
                        message: '微信技术交流群',
                      })}
                    </h3>
                    <span className="font-code-sm text-xs text-slate-500">
                      {'ModelSphere User SIG Group'}
                    </span>
                  </div>
                  <p className="font-body-sm text-sm text-slate-600 leading-relaxed">
                    {translate({
                      id: 'site.55454bf1b266',
                      message:
                        '\n            与核心架构师及生产 SRE 零距离交流，快速获得集群部署排障、配方微调建议及版本支持。\n          ',
                    })}
                  </p>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-center gap-2">
                    <a
                      className="community-group-qr bg-white border border-slate-200 rounded-lg shadow-sm"
                      href={groupQr}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={translate({
                        id: 'site.dd751622c21f',
                        message: '打开入群二维码原图',
                      })}
                    >
                      <img
                        className="w-full h-full"
                        src={groupQr}
                        alt={translate({
                          id: 'site.7842c842f4dd',
                          message: '微信技术交流群入群二维码',
                        })}
                        width={500}
                        height={500}
                      />
                    </a>
                    <span className="font-code-sm text-xs text-slate-500">
                      {translate({
                        id: 'site.6d84003b6085',
                        message: 'ModelSphere社群',
                      })}
                    </span>
                  </div>
                </div>
                <div className="pt-5 border-t border-slate-100 mt-4">
                  <a
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-sky-700 hover:bg-sky-50 font-body-sm text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    href={groupQr}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={translate({
                      id: 'site.8835a79bd079',
                      message: '打开入群二维码原图，使用微信扫码加入',
                    })}
                  >
                    <span className="">
                      {translate({
                        id: 'site.2fffee3edd5a',
                        message: '扫码加入技术交流微信群',
                      })}
                    </span>
                  </a>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <span
                        className="material-symbols-outlined text-[24px]"
                        aria-hidden="true"
                      >
                        {'terminal'}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-label-caps text-xs font-semibold">
                      {translate({
                        id: 'site.726e8fe3b48a',
                        message: '主干社区',
                      })}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg font-bold text-slate-900 mb-0.5">
                      {translate({
                        id: 'site.c9a0666ada33',
                        message: 'GitHub 开源社区',
                      })}
                    </h3>
                    <span className="font-code-sm text-xs text-slate-500">
                      {'github.com/modelsphere'}
                    </span>
                  </div>
                  <p className="font-body-sm text-sm text-slate-600 leading-relaxed">
                    {translate({
                      id: 'site.d5eed28ffc8f',
                      message:
                        '\n            Star 关注主干仓库，提交 Issue 报告环境问题，发起 PR 贡献代码或在 Discussions 规划下代算子。\n          ',
                    })}
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2 font-code-sm text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1">
                        <span
                          className="material-symbols-outlined text-slate-400 text-[15px]"
                          aria-hidden="true"
                        >
                          {'license'}
                        </span>
                        {' License'}
                      </span>
                      <span className="font-bold text-slate-700">
                        {'Apache-2.0'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 border-t border-slate-100 mt-4">
                  <a
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-all font-body-sm text-xs font-semibold shadow-sm"
                    href="https://github.com/modelsphere"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span
                      className="material-symbols-outlined text-[15px]"
                      aria-hidden="true"
                    >
                      {'star'}
                    </span>
                    <span className="">
                      {translate({
                        id: 'site.5581608eea5e',
                        message: '前往 GitHub 组织',
                      })}
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
export function CommunityFooter() {
  const symbol = useBaseUrl('/brand/modelsphere-symbol.png');
  const { siteHref } = useSitePath();
  return (
    <footer
      className="w-full bg-white border-t border-slate-200 community-footer"
      data-community-design=""
    >
      <div className="w-full px-6 md:px-8 py-14 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <img
                alt="ModelSphere Logo"
                className="h-7 w-auto object-contain"
                src={symbol}
              />
              <span className="font-headline-sm text-lg font-bold text-slate-900">
                {translate({
                  id: 'site.df36818e82c3',
                  message: '模域 ModelSphere',
                })}
              </span>
            </div>
            <p className="font-body-sm text-sm text-slate-600 max-w-sm leading-relaxed">
              <span className="">
                {translate({
                  id: 'site.df36818e82c3',
                  message: '模域 ModelSphere',
                })}
              </span>
              {translate({
                id: 'site.b0237d6403f1',
                message:
                  ' 是由范式智能（PHANCY）与睿思智联（RiseUnion）共同发起，面向大模型推理的开源生产级基础设施社区，打通异构算力适配、云原生集群调度与极限性能调优，让大模型从“实验室能跑”直通“生产好用”。',
              })}
            </p>
            <div className="flex items-center gap-3 font-code-sm text-xs text-slate-500 pt-1"></div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="font-label-caps text-xs text-slate-400 font-bold uppercase tracking-wider">
              {translate({ id: 'site.6db8afcd8915', message: '核心产品' })}
            </div>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/docs"
            >
              {translate({
                id: 'site.0cde2d8a5585',
                message: '推理引擎运行时',
              })}
            </Link>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/models"
            >
              {translate({ id: 'site.f7821c3f955a', message: '模型加速套件' })}
            </Link>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/models"
            >
              {translate({ id: 'site.5f7a4b1ece53', message: '性能基准测评' })}
            </Link>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/docs"
            >
              {translate({ id: 'site.7d1bb773a6bf', message: '分布式编排器' })}
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="font-label-caps text-xs text-slate-400 font-bold uppercase tracking-wider">
              {translate({ id: 'site.8c59843609d4', message: '社区与生态' })}
            </div>
            <a
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              href={siteHref('/community#community-channels')}
            >
              {translate({
                id: 'site.a39d5d6a8909',
                message: '开发者社区 SIG',
              })}
            </a>
            <a
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              href={siteHref('/community#community-maintainers')}
            >
              {translate({
                id: 'site.b78151d50c19',
                message: '社区维护者治理',
              })}
            </a>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/community"
            >
              {translate({ id: 'site.2bcf194ad150', message: '贡献者荣誉墙' })}
            </Link>
            <a
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              href={siteHref('/community#community-calendar')}
            >
              {translate({ id: 'site.536c0bc75f5d', message: '线上技术日历' })}
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="font-label-caps text-xs text-slate-400 font-bold uppercase tracking-wider">
              {translate({ id: 'site.f0009e1a62b1', message: '开发者资源' })}
            </div>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/docs"
            >
              {translate({ id: 'site.ed82269fbd7e', message: '快速接入文档' })}
            </Link>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/docs"
            >
              {'RESTful / gRPC API'}
            </Link>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/blog"
            >
              {translate({ id: 'site.85f3058b9a7e', message: '架构演进内幕' })}
            </Link>
            <Link
              className="font-body-sm text-sm text-slate-600 hover:text-sky-600 transition-colors"
              to="/blog"
            >
              {translate({ id: 'site.359c2cf95c95', message: '量化实战案例' })}
            </Link>
          </div>
        </div>
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-code-sm text-xs text-slate-500">
            {
              '© 2025 ModelSphere Foundation. Released under Apache-2.0 License.'
            }
          </div>
        </div>
      </div>
    </footer>
  );
}
