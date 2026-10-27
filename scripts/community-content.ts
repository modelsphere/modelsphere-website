import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import type { CommunityIndex } from '../src/features/community/types';

const text = z.string().trim().min(1);
const https = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, '需要不含凭据的 HTTPS 地址');
const date = z.iso.datetime({ offset: true });
const timeZone = text.refine((value) => {
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, '无效的 IANA 时区');
const copy = {
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text,
  speaker: text,
  draft: z.boolean(),
};
const eventSchema = z.discriminatedUnion('example', [
  z
    .object({
      ...copy,
      example: z.literal(false),
      startsAt: date,
      endsAt: date,
      timeZone,
      registrationUrl: https.optional(),
      liveUrl: https.optional(),
      replayUrl: https.optional(),
      slidesUrl: https.optional(),
    })
    .strict()
    .refine(
      (event) => Date.parse(event.endsAt) > Date.parse(event.startsAt),
      '结束时间必须晚于开始时间',
    ),
  z
    .object({
      ...copy,
      example: z.literal(true),
      draft: z.literal(true),
      preview: z
        .object({
          status: z.enum(['live', 'upcoming', 'recorded']),
          badge: text,
          dateLabel: text,
          actionLabel: text,
        })
        .strict(),
    })
    .strict(),
]);
const meetingSchema = z
  .object({
    example: z.boolean(),
    title: text,
    schedule: text,
    platform: text,
    meetingNumber: text.optional(),
    joinNote: text.optional(),
    nextStartsAt: date.optional(),
    nextLabel: text.optional(),
    timeZone,
    agenda: z.array(text).min(1),
    calendarUrl: https.optional(),
    minutesUrl: https.optional(),
    meetingUrl: https.optional(),
  })
  .strict()
  .refine(
    (meeting) => meeting.example || !meeting.nextLabel,
    '真实例会使用 nextStartsAt，不填写 nextLabel',
  );

function yaml(raw: string) {
  const document = parseDocument(raw, { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}
export function parseCommunityEvent(raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('活动缺少 YAML 元数据');
  const summary = match[2].trim();
  if (!summary || /\n|[<>]/.test(summary))
    throw new Error('活动正文须为一段纯文本简介，不使用 HTML 或多行 Markdown');
  return { ...eventSchema.parse(yaml(match[1])), summary };
}

export async function readCommunity(
  root: string,
  preview: boolean,
  generatedAt = new Date().toISOString(),
): Promise<CommunityIndex> {
  const directory = path.join(root, 'content/community');
  const config = z
    .object({ meeting: meetingSchema.nullable() })
    .strict()
    .parse(yaml(await readFile(path.join(directory, 'meeting.yaml'), 'utf8')));
  const events = [];
  const files = await readdir(path.join(directory, 'events'), {
    withFileTypes: true,
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!file.isFile() || !file.name.endsWith('.md'))
      throw new Error(`活动目录仅接受 Markdown 文件：${file.name}`);
    const event = parseCommunityEvent(
      await readFile(path.join(directory, 'events', file.name), 'utf8'),
    );
    if (`${event.id}.md` !== file.name)
      throw new Error(`活动 id 必须与文件名一致：${file.name}`);
    if (event.example ? !preview : event.draft) continue;
    events.push(event);
  }
  return {
    meeting: config.meeting?.example && !preview ? null : config.meeting,
    events,
    generatedAt,
    preview,
  };
}
