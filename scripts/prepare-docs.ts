import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { BuildMode } from '../src/lib/build-mode';
import { readMockDocs } from './check-docs';
export async function prepareDocs(
  root: string,
  mode: BuildMode,
): Promise<void> {
  const docs = mode.source === 'mock' ? await readMockDocs(root) : [];
  await rm(path.join(root, '.generated'), { recursive: true, force: true });
  await mkdir(path.join(root, '.generated/docs'), { recursive: true });
  for (const doc of docs)
    await writeFile(path.join(root, '.generated/docs', doc.file), doc.raw);
  await writeFile(
    path.join(root, '.generated/docs-input.json'),
    JSON.stringify({
      mode,
      files: docs.map((d) => ({
        name: d.file,
        sha256: createHash('sha256').update(d.raw).digest('hex'),
      })),
    }),
  );
}
export { assertPrepared } from '../src/lib/prepared-input';
