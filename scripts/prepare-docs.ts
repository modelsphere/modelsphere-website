import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { BuildMode } from '../src/lib/build-mode';
import { readDocumentation, type ParsedDoc } from './check-docs';
import { readLocalImage } from './local-images';
export async function prepareDocs(
  root: string,
  mode: BuildMode,
): Promise<ParsedDoc[]> {
  const docs = await readDocumentation(root, mode.source);
  await rm(path.join(root, '.generated'), { recursive: true, force: true });
  await mkdir(path.join(root, '.generated/docs'), { recursive: true });
  const files: { name: string; sha256: string }[] = [];
  for (const doc of docs) {
    await mkdir(path.dirname(path.join(root, '.generated/docs', doc.file)), {
      recursive: true,
    });
    await writeFile(path.join(root, '.generated/docs', doc.file), doc.raw);
    files.push({
      name: doc.file,
      sha256: createHash('sha256').update(doc.raw).digest('hex'),
    });
  }
  for (const image of [...new Set(docs.flatMap((doc) => doc.images))].sort()) {
    const bytes = await readLocalImage(path.join(root, 'content/docs'), image);
    const target = path.join(root, '.generated/docs', image);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    files.push({
      name: image,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  await writeFile(
    path.join(root, '.generated/docs-input.json'),
    JSON.stringify({
      mode,
      files,
    }),
  );
  return docs;
}
export { assertPrepared } from '../src/lib/prepared-input';
