import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { stringify } from 'yaml';
import {
  parseCommunityEvent,
  readCommunity,
} from '../../scripts/community-content';
import {
  eventActions,
  eventDate,
  eventStatus,
  selectEvents,
} from '../../src/features/community/events';
import type { PublishedEvent } from '../../src/features/community/types';

const start = '2026-11-12T20:00:00+08:00';
const end = '2026-11-12T21:00:00+08:00';
function event(
  id = 'test-talk',
  overrides: Partial<PublishedEvent> = {},
): PublishedEvent {
  return {
    id,
    title: '测试活动',
    speaker: '测试讲者',
    summary: '测试简介',
    draft: false,
    example: false,
    startsAt: start,
    endsAt: end,
    timeZone: 'Asia/Shanghai',
    ...overrides,
  };
}
function markdown(value = event()) {
  const { summary, ...meta } = value;
  return `---\n${stringify(meta)}---\n${summary}\n`;
}
async function temporary(
  action: (root: string, file: string) => Promise<void>,
) {
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-community-'));
  try {
    await mkdir(path.join(root, 'content'), { recursive: true });
    await cp('content/community', path.join(root, 'content/community'), {
      recursive: true,
    });
    await mkdir(path.join(root, 'content/community/events'), {
      recursive: true,
    });
    await action(
      root,
      path.join(root, 'content/community/events/test-talk.md'),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
describe('community content publishing', () => {
  it('ships no mock activities or sample meeting in either build mode', async () => {
    for (const preview of [true, false]) {
      const index = await readCommunity(process.cwd(), preview);
      expect(index.events).toEqual([]);
      expect(index.meeting).toBeNull();
      expect(JSON.stringify(index)).not.toMatch(
        /6\.4k|829-411|2025年4月|SLO 动态/,
      );
    }
  });
  it('keeps synthetic example content isolated from release', async () => {
    await temporary(async (root, file) => {
      await writeFile(
        file,
        `---\n${stringify({ id: 'test-talk', title: '测试示例', speaker: '测试讲者', example: true, draft: true, preview: { status: 'upcoming', badge: '测试预告', dateLabel: '测试时间', actionLabel: '测试入口' } })}---\n测试简介\n`,
      );
      expect((await readCommunity(root, true)).events).toHaveLength(1);
      expect((await readCommunity(root, false)).events).toEqual([]);
    });
  });
  it('accepts an absent activity directory before the first real event is added', async () => {
    await temporary(async (root) => {
      await rm(path.join(root, 'content/community/events'), {
        recursive: true,
      });
      for (const preview of [true, false])
        expect((await readCommunity(root, preview)).events).toEqual([]);
    });
  });
  it('excludes real drafts in both modes, then publishes the same Markdown without touching components', async () => {
    await temporary(async (root, file) => {
      await writeFile(file, markdown(event('test-talk', { draft: true })));
      expect(
        (await readCommunity(root, true)).events.some(
          (item) => item.id === 'test-talk',
        ),
      ).toBe(false);
      expect((await readCommunity(root, false)).events).toEqual([]);
      await writeFile(file, markdown());
      expect((await readCommunity(root, false)).events).toEqual([event()]);
    });
  });
  it('rejects inconsistent filenames and malformed YAML, text, timestamps, zones and URLs', async () => {
    const valid = markdown();
    for (const invalid of [
      valid.replace('endsAt: 2026-11-12T21:00:00+08:00', `endsAt: ${start}`),
      valid.replace(start, '2026-11-12T20:00:00'),
      valid.replace(start, '2026-02-30T20:00:00+08:00'),
      valid.replace('Asia/Shanghai', 'Invalid/Zone'),
      valid.replace('draft: false', 'draft: false\ndraft: true'),
      valid.replace('draft: false', 'draft: false\nstatus: live'),
      valid.replace(
        'draft: false',
        'draft: false\nliveUrl: javascript:alert(1)',
      ),
      valid.replace(
        'draft: false',
        'draft: false\nreplayUrl: https://user:secret@example.test',
      ),
      valid.replace('测试简介', '<script>alert(1)</script>'),
      valid.replace('测试简介', '第一段\n\n第二段'),
    ])
      expect(() => parseCommunityEvent(invalid)).toThrow();
    await temporary(async (root, file) => {
      await writeFile(file, valid.replace('id: test-talk', 'id: wrong-id'));
      await expect(readCommunity(root, false)).rejects.toThrow(
        'id 必须与文件名一致',
      );
    });
  });
  it('rejects manually written next-date labels for real meetings', async () => {
    await temporary(async (root) => {
      const file = path.join(root, 'content/community/meeting.yaml');
      await writeFile(
        file,
        stringify({
          meeting: {
            example: false,
            title: '测试例会',
            schedule: '测试周期',
            platform: '测试接入方式',
            timeZone: 'Asia/Shanghai',
            agenda: ['测试议程'],
            nextLabel: '测试日期',
          },
        }),
      );
      await expect(readCommunity(root, false)).rejects.toThrow('nextStartsAt');
    });
  });
});
describe('community schedule and archive', () => {
  it('derives status at exact boundaries; replay requires a real URL after the event ends', () => {
    expect(eventStatus(event(), Date.parse(start) - 1)).toBe('upcoming');
    expect(eventStatus(event(), Date.parse(start))).toBe('live');
    expect(eventStatus(event(), Date.parse(end) - 1)).toBe('live');
    expect(eventStatus(event(), Date.parse(end))).toBe('ended');
    const recorded = event('recorded', {
      replayUrl: 'https://example.test/replay',
    });
    expect(eventStatus(recorded, Date.parse(start))).toBe('live');
    expect(eventStatus(recorded, Date.parse(end))).toBe('recorded');
  });
  it('shows live and nearest upcoming events plus the latest replay, with all others in the archive exactly once', () => {
    const now = Date.parse(start);
    const live = event('live');
    const future = event('future', {
      startsAt: '2026-11-13T20:00:00+08:00',
      endsAt: '2026-11-13T21:00:00+08:00',
    });
    const later = event('later', {
      startsAt: '2026-11-14T20:00:00+08:00',
      endsAt: '2026-11-14T21:00:00+08:00',
    });
    const past = event('past', {
      startsAt: '2026-11-11T20:00:00+08:00',
      endsAt: '2026-11-11T21:00:00+08:00',
    });
    const replay = {
      ...past,
      id: 'replay',
      replayUrl: 'https://example.test/replay',
    };
    const older = {
      ...replay,
      id: 'older',
      startsAt: '2026-11-10T20:00:00+08:00',
      endsAt: '2026-11-10T21:00:00+08:00',
    };
    const result = selectEvents(
      [older, later, past, replay, future, live],
      now,
    );
    expect(result.featured.map((item) => item.id)).toEqual([
      'live',
      'future',
      'replay',
    ]);
    expect(result.archive.map((item) => item.id)).toEqual([
      'later',
      'past',
      'older',
    ]);
    expect(
      new Set([...result.featured, ...result.archive].map((item) => item.id))
        .size,
    ).toBe(6);
    expect(selectEvents([], now)).toEqual({ featured: [], archive: [] });
  });
  it('never substitutes signup or replay links for a missing live entry, and exposes replay and slides separately', () => {
    const talk = event('links', {
      registrationUrl: 'https://example.test/signup',
      replayUrl: 'https://example.test/replay',
      slidesUrl: 'https://example.test/slides',
    });
    expect(eventActions(talk, Date.parse(start) - 1)).toEqual([
      { label: '预约提醒', href: talk.registrationUrl },
    ]);
    expect(eventActions(talk, Date.parse(start))).toEqual([
      { label: '进入直播', href: undefined },
    ]);
    expect(eventActions(talk, Date.parse(end))).toEqual([
      { label: '观看回放', href: talk.replayUrl },
      { label: '下载 Slides', href: talk.slidesUrl },
    ]);
    expect(eventActions(event(), Date.parse(end))).toEqual([
      { label: '回放待补充', href: undefined },
    ]);
  });
  it('formats offset timestamps using the declared timezone including the year', () => {
    expect(eventDate(start, 'Asia/Shanghai')).toBe(
      '2026年11月12日 20:00 (Asia/Shanghai)',
    );
    expect(eventDate('2026-11-12T00:00:00+08:00', 'UTC')).toBe(
      '2026年11月11日 16:00 (UTC)',
    );
  });
});
