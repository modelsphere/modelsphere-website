import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtemp,
  mkdir,
  cp,
  writeFile,
  readdir,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveBuildMode } from '../../src/lib/build-mode';
import { prepareDocs, assertPrepared } from '../../scripts/prepare-docs';
import { readMockDocs } from '../../scripts/check-docs';
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-docs-'));
  roots.push(root);
  await mkdir(path.join(root, 'tests/fixtures'), { recursive: true });
  await cp('tests/fixtures/docs', path.join(root, 'tests/fixtures/docs'), {
    recursive: true,
  });
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
describe('Build-mode boundary', () => {
  it('defaults to release with no content, requiring an explicit origin', () => {
    expect(() => resolveBuildMode({})).toThrow('SITE_ORIGIN');
    expect(resolveBuildMode({ SITE_ORIGIN: 'https://example.test' })).toEqual({
      target: 'release',
      source: 'none',
      origin: 'https://example.test',
    });
  });
  it.each(['mock', 'repository'])('never admits %s into release', (source) => {
    expect(() =>
      resolveBuildMode({
        SITE_ORIGIN: 'https://example.test',
        DOCS_SOURCE_MODE: source,
      }),
    ).toThrow();
  });
  it('does not infer preview permission from NODE_ENV', () => {
    expect(() =>
      resolveBuildMode({
        NODE_ENV: 'development',
        DOCS_SOURCE_MODE: 'mock',
        SITE_ORIGIN: 'https://example.test',
      }),
    ).toThrow('禁止');
  });
  it.each([
    'https://example.test/path',
    'javascript:alert(1)',
    'https://user:secret@example.test',
    'https://example.test/?query=1',
  ])('rejects invalid origin %s', (origin) => {
    expect(() => resolveBuildMode({ SITE_ORIGIN: origin })).toThrow();
  });
  it('rejects unknown enum values', () => {
    expect(() =>
      resolveBuildMode({
        SITE_BUILD_TARGET: 'production',
        SITE_ORIGIN: 'https://example.test',
      }),
    ).toThrow();
  });
});
describe('Content staging', () => {
  it('removes all prior Mock inputs on switch to release', async () => {
    const root = await fixture();
    const mock = resolveBuildMode({
      SITE_BUILD_TARGET: 'local',
      DOCS_SOURCE_MODE: 'mock',
    });
    await prepareDocs(root, mock);
    expect(await readdir(path.join(root, '.generated/docs'))).toHaveLength(2);
    const release = resolveBuildMode({ SITE_ORIGIN: 'https://example.test' });
    await prepareDocs(root, release);
    expect(await readdir(path.join(root, '.generated/docs'))).toEqual([]);
    await assertPrepared(root, release);
    await expect(assertPrepared(root, mock)).rejects.toThrow('不匹配');
  });
  it('rejects modified or added staged content', async () => {
    const root = await fixture();
    const mode = resolveBuildMode({
      SITE_BUILD_TARGET: 'local',
      DOCS_SOURCE_MODE: 'mock',
    });
    await prepareDocs(root, mode);
    await writeFile(path.join(root, '.generated/docs/overview.md'), 'altered');
    await expect(assertPrepared(root, mode)).rejects.toThrow('修改');
    await writeFile(path.join(root, '.generated/docs/unexpected.md'), 'extra');
    await expect(assertPrepared(root, mode)).rejects.toThrow('非预期');
  });
  it('rejects source symlinks and extra files', async () => {
    const root = await fixture();
    await writeFile(path.join(root, 'outside.md'), 'outside');
    await rm(path.join(root, 'tests/fixtures/docs/overview.md'));
    await symlink(
      path.join(root, 'outside.md'),
      path.join(root, 'tests/fixtures/docs/overview.md'),
    );
    await expect(readMockDocs(root)).rejects.toThrow('符号链接');
    await writeFile(path.join(root, 'tests/fixtures/docs/third.md'), 'extra');
    await expect(readMockDocs(root)).rejects.toThrow('两篇');
  });
});
