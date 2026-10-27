import { readCommunity } from './community-content';
for (const preview of [true, false]) {
  const index = await readCommunity(process.cwd(), preview);
  console.log(
    `社区内容检查通过（${preview ? '预览' : '正式'}）：${index.events.length} 条活动，${index.meeting ? 1 : 0} 项例会配置。`,
  );
}
