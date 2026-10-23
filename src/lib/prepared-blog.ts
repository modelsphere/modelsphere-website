import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { BuildMode } from './build-mode';
export async function inputFiles(root: string): Promise<string[]> {
  async function files(relative: string): Promise<string[]> {
    const file = path.join(root, relative);
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) throw new Error('拒绝博客暂存符号链接');
    if (stat.isDirectory())
      return (
        await Promise.all(
          (await readdir(file)).map((name) => files(`${relative}/${name}`)),
        )
      ).flat();
    if (!stat.isFile()) throw new Error('拒绝非普通文件');
    return [relative];
  }
  return (
    await Promise.all(
      [
        '.generated/blog',
        '.generated/blog-public',
        '.generated/blog-index.json',
      ].map(files),
    )
  )
    .flat()
    .sort();
}
async function hashes(root: string, files: string[]) {
  return Promise.all(
    files.map(async (name) => ({
      name,
      sha256: createHash('sha256')
        .update(await readFile(path.join(root, name)))
        .digest('hex'),
    })),
  );
}
export async function writeBlogManifest(
  root: string,
  mode: BuildMode,
  files: string[],
) {
  await writeFile(
    path.join(root, '.generated/blog-input.json'),
    JSON.stringify({ mode, files: await hashes(root, files) }),
  );
}
export async function assertPreparedBlog(root: string, mode: BuildMode) {
  const expected = JSON.parse(
    await readFile(path.join(root, '.generated/blog-input.json'), 'utf8'),
  );
  const actual = { mode, files: await hashes(root, await inputFiles(root)) };
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw new Error('博客暂存被修改或构建模式不匹配，请重新准备');
}
