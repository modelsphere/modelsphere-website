import { translate } from '@docusaurus/Translate';
import React, { useEffect, useState, type ReactNode } from 'react';
import { usePluginData } from '@docusaurus/useGlobalData';
import type { CommunityEvent, CommunityIndex, CommunityMeeting } from './types';
import { eventActions, eventDate, eventStatus, selectEvents } from './events';

export function CommunityAction({
  href,
  className,
  children,
}: {
  href?: string;
  className: string;
  children: ReactNode;
}) {
  return href ? (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ) : (
    <button
      className={className}
      type="button"
      disabled
      aria-disabled="true"
      title={translate({
        id: 'site.4e3781d9fe4f',
        message: '尚未提供可用入口',
      })}
    >
      {children}
    </button>
  );
}
function nextMeetingLabel(meeting: CommunityMeeting, now: number) {
  if (meeting.example)
    return (
      meeting.nextLabel ??
      translate({ id: 'site.954d3f2da7c7', message: '下期例会时间待公布' })
    );
  return meeting.nextStartsAt && Date.parse(meeting.nextStartsAt) > now
    ? translate(
        { id: 'site.bea3c79e398f', message: '下一期例会：{v0}' },
        {
          v0: eventDate(
            meeting.nextStartsAt,
            meeting.timeZone,
            translate({ id: 'site.locale', message: 'zh-CN' }),
          ),
        },
      )
    : translate({ id: 'site.954d3f2da7c7', message: '下期例会时间待公布' });
}
const badgeClasses = {
  live: 'bg-rose-50 border-rose-200 text-rose-600',
  upcoming: 'bg-sky-50 border-sky-200 text-sky-700',
  recorded: 'bg-slate-100 border-slate-200 text-slate-600',
  ended: 'bg-slate-100 border-slate-200 text-slate-600',
};
function EventCard({ event, now }: { event: CommunityEvent; now: number }) {
  const status = eventStatus(event, now);
  const badge = event.example
    ? event.preview.badge
    : {
        live: translate({ id: 'site.9049fe96eb90', message: 'LIVE · 直播中' }),
        upcoming: translate({
          id: 'site.1a361d767b4e',
          message: 'UPCOMING · 预告',
        }),
        recorded: translate({
          id: 'site.a56664baeece',
          message: 'RECORDED · 往期回放',
        }),
        ended: translate({
          id: 'site.8e4e27c58386',
          message: 'ENDED · 已结束',
        }),
      }[status];
  const actionClass =
    status === 'live'
      ? 'shrink-0 px-4 py-2 rounded-xl bg-sky-600 text-white font-body-sm text-xs font-semibold hover:bg-sky-700 transition-colors shadow-sm'
      : status === 'upcoming'
        ? 'shrink-0 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-body-sm text-xs font-semibold transition-colors'
        : 'shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-700 font-body-sm text-xs font-semibold transition-all';
  return (
    <div
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-sky-300 hover:shadow-md transition-all"
      data-event-id={event.id}
      data-event-status={status}
      data-example={event.example || undefined}
      title={
        event.example
          ? translate({
              id: 'site.a6aa7a7a8149',
              message: '设计示例，仅在预览显示',
            })
          : undefined
      }
    >
      <div className="flex flex-col gap-1.5 community-event-copy">
        <div className="flex items-center gap-2 community-event-meta">
          <span
            className={`px-2 py-0.5 rounded-full border font-label-caps text-xs font-bold ${badgeClasses[status]}${status === 'live' ? ' flex items-center gap-1' : ''}`}
          >
            {status === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            )}
            {badge}
          </span>
          <span className="font-code-sm text-xs text-slate-500">
            {event.example
              ? event.preview.dateLabel
              : eventDate(
                  event.startsAt,
                  event.timeZone,
                  translate({ id: 'site.locale', message: 'zh-CN' }),
                )}
          </span>
        </div>
        <h4 className="font-headline-sm text-base font-bold text-slate-900">
          {event.title}
        </h4>
        <p className="font-body-sm text-xs text-slate-600">
          {translate(
            { id: 'site.cdfb4de102ae', message: '主讲人: {v0} ｜ {v1}' },
            { v0: event.speaker, v1: event.summary },
          )}
        </p>
      </div>
      <div className="community-event-actions">
        {eventActions(event, now).map((action) => (
          <CommunityAction
            key={translate({ message: action.label })}
            className={actionClass}
            href={action.href}
          >
            {status === 'recorded' && (
              <span
                className="material-symbols-outlined text-[16px]"
                aria-hidden="true"
              >
                play_circle
              </span>
            )}
            <span>{translate({ message: action.label })}</span>
          </CommunityAction>
        ))}
      </div>
    </div>
  );
}
function NoEvents() {
  return (
    <div
      className="community-events-empty bg-white rounded-2xl border border-slate-200"
      data-community-empty=""
    >
      <div
        className="community-events-empty-icon bg-sky-50 border border-sky-100 text-sky-600"
        aria-hidden="true"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="7" width="22" height="21" rx="4" />
          <path d="M10 4v6m12-6v6M5 14h22M12 20h8" />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-headline-sm text-xl font-bold text-slate-900">
          {translate({ id: 'site.36d0dfdd19e4', message: '暂无活动' })}
        </h3>
        <p className="font-body-md text-sm text-slate-600">
          {translate({
            id: 'site.d7e283c7e482',
            message: '新的社区活动将在这里公布，欢迎加入技术交流群参与交流。',
          })}
        </p>
      </div>
      <a
        className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-all font-body-sm text-xs font-semibold"
        href="#community-channels"
      >
        {translate({ id: 'site.63cf5ec0d286', message: '加入技术交流群' })}
        <span
          className="material-symbols-outlined text-[16px]"
          aria-hidden="true"
        >
          arrow_forward
        </span>
      </a>
    </div>
  );
}
export function CommunityCalendar() {
  const index = usePluginData('community-content') as CommunityIndex;
  const [now, setNow] = useState(() => Date.parse(index.generatedAt));
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [index.generatedAt]);
  const { featured, archive } = selectEvents(index.events, now);
  const meeting = index.meeting;
  if (!meeting && !featured.length && !archive.length) return <NoEvents />;
  return (
    <>
      {meeting ? (
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-sky-300/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-label-caps text-xs font-bold">
                {'BI-WEEKLY SYNC'}
              </span>
              <span className="flex items-center gap-1 font-code-sm text-xs text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {translate({
                  id: 'site.90200bca3781',
                  message: ' 周期固定\n            ',
                })}
              </span>
            </div>
            <h3 className="font-headline-sm text-xl font-bold text-slate-900 mb-2">
              {meeting.title}
            </h3>
            <div className="space-y-3 my-5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span
                  className="material-symbols-outlined text-sky-600 text-[20px] mt-0.5"
                  aria-hidden="true"
                >
                  {'schedule'}
                </span>
                <div>
                  <div className="font-code-lg text-xs font-bold text-slate-900">
                    {meeting.schedule}
                  </div>
                  <div className="font-body-sm text-xs text-slate-500 mt-0.5">
                    {nextMeetingLabel(meeting, now)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span
                  className="material-symbols-outlined text-teal-600 text-[20px] mt-0.5"
                  aria-hidden="true"
                >
                  {'videocam'}
                </span>
                <div>
                  <div className="font-code-lg text-xs font-bold text-slate-900">
                    {meeting.platform}
                  </div>
                  <div className="font-code-sm text-xs text-slate-600 mt-0.5">
                    {translate({
                      id: 'site.a5dae2ffab33',
                      message: '会议号: ',
                    })}
                    <strong className="text-sky-700">
                      {meeting.meetingUrl && !meeting.example ? (
                        <a
                          href={meeting.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {meeting.meetingNumber ??
                            translate({
                              id: 'site.0764b01cd0d6',
                              message: '进入会议',
                            })}
                        </a>
                      ) : (
                        (meeting.meetingNumber ??
                        translate({
                          id: 'site.32c728ffed5b',
                          message: '待公布',
                        }))
                      )}
                    </strong>
                    {meeting.joinNote ? ` (${meeting.joinNote})` : ''}
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <div className="font-label-caps text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                {translate({
                  id: 'site.44e6af891009',
                  message: '公开讨论标准议程：',
                })}
              </div>
              <ul className="space-y-2 font-body-sm text-xs text-slate-600">
                {meeting.agenda.map((item) => (
                  <li className="flex items-center gap-2" key={item}>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <CommunityAction
              href={meeting.example ? undefined : meeting.calendarUrl}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-600 text-white font-body-sm text-xs font-semibold hover:bg-sky-700 transition-colors shadow-sm"
            >
              <span
                className="material-symbols-outlined text-[16px]"
                aria-hidden="true"
              >
                {'calendar_add_on'}
              </span>
              <span className="">
                {translate({
                  id: 'site.94a8621d625f',
                  message: '订阅例会日历 (iCal)',
                })}
              </span>
            </CommunityAction>
            <CommunityAction
              href={meeting.minutesUrl}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-body-sm text-xs font-semibold transition-colors"
            >
              <span
                className="material-symbols-outlined text-[16px]"
                aria-hidden="true"
              >
                {'description'}
              </span>
              <span className="">
                {translate({
                  id: 'site.a4baa7d79235',
                  message: '纪要 & 议题提交',
                })}
              </span>
            </CommunityAction>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-sky-300/80 shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-sm text-xl font-bold text-slate-900">
            {translate({ id: 'site.8f417ce17785', message: '社区技术例会' })}
          </h3>
          <p className="font-body-md text-sm text-slate-600">
            {translate({
              id: 'site.4a67073b6a8e',
              message: '例会安排待公布。',
            })}
          </p>
        </div>
      )}
      <div
        className="lg:col-span-7 flex flex-col gap-4"
        aria-label={translate({
          id: 'site.2afccffad3ec',
          message: '社区活动列表',
        })}
        data-community-preview={index.preview}
      >
        {featured.map((event) => (
          <EventCard key={event.id} event={event} now={now} />
        ))}
        {!featured.length && <NoEvents />}
        {!!archive.length && (
          <details className="bg-white p-5 rounded-2xl border border-slate-200 community-event-archive">
            <summary className="font-body-md text-sm text-sky-700">
              {translate({
                id: 'site.60ee2a8db7df',
                message: '更多活动与往期记录（',
              })}
              {archive.length}
              {translate({ id: 'site.punctuation.closeParen', message: '）' })}
            </summary>
            <div className="flex flex-col gap-4">
              {archive.map((event) => (
                <EventCard key={event.id} event={event} now={now} />
              ))}
            </div>
          </details>
        )}
      </div>
    </>
  );
}
