import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { BuildMode } from './build-mode';
export async function assertPrepared(
  root: string,
  mode: BuildMode,
): Promise<void> {
  if (!(await lstat(path.join(root, '.generated'))).isDirectory())
    throw new Error('拒绝暂存父目录符号链接或非目录');
  const record = JSON.parse(
    await readFile(path.join(root, '.generated/docs-input.json'), 'utf8'),
  ) as { mode: BuildMode; files: { name: string; sha256: string }[] };
  if (JSON.stringify(record.mode) !== JSON.stringify(mode))
    throw new Error('构建用途与暂存记录不匹配，请通过项目脚本重新准备');
  if (
    mode.source === 'mock' &&
    record.files
      .map((f) => f.name)
      .sort()
      .join(',') !== 'overview.md,quickstart.md'
  )
    throw new Error('非预期文档清单');
  async function files(relative = ''): Promise<string[]> {
    const directory = path.join(root, '.generated/docs', relative);
    if (!(await lstat(directory)).isDirectory())
      throw new Error('拒绝暂存符号链接或非目录');
    const names: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) names.push(...(await files(name)));
      else if (entry.isFile()) names.push(name);
      else throw new Error('拒绝暂存符号链接或非文件');
    }
    return names;
  }
  const names = await files();
  if (
    names.sort().join(',') !==
    record.files
      .map((f) => f.name)
      .sort()
      .join(',')
  )
    throw new Error('暂存目录包含非预期内容');
  if (mode.source === 'none' && names.length)
    throw new Error('正式准备页不能携带 Mock');
  for (const f of record.files) {
    if (!(await lstat(path.join(root, '.generated/docs', f.name))).isFile())
      throw new Error('拒绝暂存符号链接');
    const bytes = await readFile(path.join(root, '.generated/docs', f.name));
    if (createHash('sha256').update(bytes).digest('hex') !== f.sha256)
      throw new Error('暂存文件已被修改');
  }
}
