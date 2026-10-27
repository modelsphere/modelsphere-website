import type { CommunityEvent, PublishedEvent } from './types';

export function eventStatus(event: CommunityEvent, now: number) {
  if (event.example) return event.preview.status;
  if (now < Date.parse(event.startsAt)) return 'upcoming';
  if (now < Date.parse(event.endsAt)) return 'live';
  return event.replayUrl ? 'recorded' : 'ended';
}

export function eventDate(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}年${part('month')}月${part('day')}日 ${part('hour')}:${part('minute')} (${timeZone})`;
}

export function eventActions(event: CommunityEvent, now: number) {
  if (event.example)
    return [{ label: event.preview.actionLabel, href: undefined }];
  const status = eventStatus(event, now);
  if (status === 'live') return [{ label: '进入直播', href: event.liveUrl }];
  if (status === 'upcoming')
    return [{ label: '预约提醒', href: event.registrationUrl }];
  const actions = [];
  if (event.replayUrl)
    actions.push({ label: '观看回放', href: event.replayUrl });
  if (event.slidesUrl)
    actions.push({ label: '下载 Slides', href: event.slidesUrl });
  return actions.length ? actions : [{ label: '回放待补充', href: undefined }];
}

export function selectEvents(events: CommunityEvent[], now: number) {
  const examples = events.filter((event) => event.example);
  const real = events.filter(
    (event): event is PublishedEvent => !event.example,
  );
  const time = (event: PublishedEvent) => Date.parse(event.startsAt);
  const upcoming = real
    .filter((event) => now < Date.parse(event.endsAt))
    .sort((a, b) => time(a) - time(b) || a.id.localeCompare(b.id));
  const past = real
    .filter((event) => now >= Date.parse(event.endsAt))
    .sort((a, b) => time(b) - time(a) || a.id.localeCompare(b.id));
  const replay = past.find((event) => event.replayUrl);
  const featured: CommunityEvent[] = upcoming.slice(0, replay ? 2 : 3);
  if (replay) featured.push(replay);
  for (const event of past) {
    if (featured.length >= 3) break;
    if (!featured.some((item) => item.id === event.id)) featured.push(event);
  }
  if (!real.length) featured.push(...examples.slice(0, 3));
  const featuredIds = new Set(featured.map((event) => event.id));
  const archive = [...upcoming, ...past].filter(
    (event) => !featuredIds.has(event.id),
  );
  return { featured, archive };
}
