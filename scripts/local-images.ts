import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

export function isImageFile(file: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(file);
}

export async function readLocalImage(
  directory: string,
  file: string,
): Promise<Buffer> {
  if (
    !isImageFile(file) ||
    /[\\:#?]/.test(file) ||
    Array.from(file).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    file.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`图片必须为内容目录内的本地 PNG/JPEG/WebP/GIF：${file}`);
  if (!(await lstat(directory)).isDirectory())
    throw new Error('拒绝图片源目录符号链接或非目录');
  let current = directory;
  for (const segment of file.split('/')) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error('拒绝图片符号链接');
  }
  if (!(await lstat(current)).isFile()) throw new Error('图片必须为普通文件');
  const bytes = await readFile(current);
  const extension = path.extname(file).toLowerCase();
  const valid =
    extension === '.png'
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : ['.jpg', '.jpeg'].includes(extension)
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : extension === '.webp'
          ? bytes.subarray(0, 4).toString() === 'RIFF' &&
            bytes.subarray(8, 12).toString() === 'WEBP'
          : /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  if (!valid) throw new Error(`图片内容与扩展名不符：${file}`);
  return bytes;
}
