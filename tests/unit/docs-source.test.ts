import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtemp,
  mkdir,
  cp,
  writeFile,
  readdir,
  rm,
  symlink,
  appendFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveBuildMode } from '../../src/lib/build-mode';
import { prepareDocs, assertPrepared } from '../../scripts/prepare-docs';
import { readMockDocs, readContentDocs } from '../../scripts/check-docs';
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'modelsphere-docs-'));
  roots.push(root);
  await mkdir(path.join(root, 'tests/fixtures'), { recursive: true });
  await cp('tests/fixtures/docs', path.join(root, 'tests/fixtures/docs'), {
    recursive: true,
  });
  await mkdir(path.join(root, 'content'), { recursive: true });
  await cp('content/docs', path.join(root, 'content/docs'), {
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
  it('accepts the formal content source in release without mock permission', () => {
    expect(
      resolveBuildMode({
        SITE_ORIGIN: 'https://example.test',
        DOCS_SOURCE_MODE: 'content',
      }).source,
    ).toBe('content');
  });
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
function contentDoc(
  id: string,
  slug: string,
  body = '## 验证\n\n正文。',
  draft = false,
) {
  return `---\nid: ${id}\ntitle: 文档\ndescription: 文档说明\nslug: ${slug}\nsidebar_position: 3\ndraft: ${draft}\n---\n${body}\n`;
}
describe('Formal documentation source', () => {
  it('stages more than two documents, nested links and anchors, then removes stale files on source switch', async () => {
    const root = await fixture();
    await mkdir(path.join(root, 'content/docs/deployment'));
    await writeFile(
      path.join(root, 'content/docs/deployment/kubernetes.md'),
      contentDoc(
        'deployment-kubernetes',
        '/deployment/kubernetes',
        '## 验证\n\n[首页](../index.md#核心概念)',
      ),
    );
    const home = path.join(root, 'content/docs/index.md');
    await appendFile(home, '\n[部署文档](deployment/kubernetes.md#验证)\n');
    const mode = resolveBuildMode({
      SITE_ORIGIN: 'https://example.test',
      DOCS_SOURCE_MODE: 'content',
    });
    expect(await readContentDocs(root)).toHaveLength(3);
    await prepareDocs(root, mode);
    await assertPrepared(root, mode);
    expect(
      await readdir(path.join(root, '.generated/docs/deployment')),
    ).toEqual(['kubernetes.md']);
    await writeFile(
      path.join(root, '.generated/docs/deployment/kubernetes.md'),
      'tampered',
    );
    await expect(assertPrepared(root, mode)).rejects.toThrow('修改');
    await prepareDocs(root, { ...mode, source: 'mock', publishExamples: true });
    expect(await readdir(path.join(root, '.generated/docs'))).toEqual([
      'overview.md',
      'quickstart.md',
    ]);
  });
  it('excludes drafts and rejects references to them', async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, 'content/docs/draft.md'),
      contentDoc('draft', '/draft', '## 草稿', true),
    );
    const mode = resolveBuildMode({
      SITE_ORIGIN: 'https://example.test',
      DOCS_SOURCE_MODE: 'content',
    });
    expect(await readContentDocs(root)).toHaveLength(2);
    await prepareDocs(root, mode);
    expect(await readdir(path.join(root, '.generated/docs'))).toEqual([
      'index.md',
      'quickstart.md',
    ]);
    await appendFile(
      path.join(root, 'content/docs/index.md'),
      '\n[草稿](draft.md)\n',
    );
    await expect(readContentDocs(root)).rejects.toThrow('不存在');
  });
  it.each([
    ['overview', '/another', '## 重复 id', '重复'],
    ['another', '/quickstart', '## 重复 slug', '重复'],
    ['another', '/another', '[越界](../private.md)', '越过'],
    ['another', '/another', '[缺少锚点](index.md#missing)', '锚点'],
    ['another', '/another', '', '正文'],
  ])('rejects invalid content: %s %s %s', async (id, slug, body, message) => {
    const root = await fixture();
    await writeFile(
      path.join(root, 'content/docs/another.md'),
      contentDoc(id, slug, body),
    );
    await expect(readContentDocs(root)).rejects.toThrow(message);
  });
  it('requires a published homepage', async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, 'content/docs/index.md'),
      contentDoc('overview', '/overview'),
    );
    await expect(readContentDocs(root)).rejects.toThrow('首页');
  });
  it.each(['file', 'directory', 'root', 'parent'])(
    'rejects %s source symlinks',
    async (kind) => {
      const root = await fixture();
      if (kind === 'parent') {
        await rm(path.join(root, 'content'), { recursive: true });
        await symlink(
          path.join(root, 'tests/fixtures'),
          path.join(root, 'content'),
        );
      } else if (kind === 'root') {
        await rm(path.join(root, 'content/docs'), { recursive: true });
        await symlink(
          path.join(root, 'tests/fixtures/docs'),
          path.join(root, 'content/docs'),
        );
      } else {
        await symlink(
          path.join(
            root,
            kind === 'file'
              ? 'tests/fixtures/docs/overview.md'
              : 'tests/fixtures/docs',
          ),
          path.join(
            root,
            'content/docs',
            kind === 'file' ? 'linked.md' : 'linked',
          ),
        );
      }
      await expect(readContentDocs(root)).rejects.toThrow('符号链接');
    },
  );
  it('rejects unsupported source files and symlinked staged directories', async () => {
    const root = await fixture();
    await writeFile(path.join(root, 'content/docs/unsafe.mdx'), '<Component/>');
    await expect(readContentDocs(root)).rejects.toThrow('Markdown');
    await rm(path.join(root, 'content/docs/unsafe.mdx'));
    await mkdir(path.join(root, 'content/docs/guide'));
    await writeFile(
      path.join(root, 'content/docs/guide/topic.md'),
      contentDoc('topic', '/guide/topic'),
    );
    const mode = resolveBuildMode({
      SITE_ORIGIN: 'https://example.test',
      DOCS_SOURCE_MODE: 'content',
    });
    await prepareDocs(root, mode);
    await rm(path.join(root, '.generated/docs/guide'), { recursive: true });
    await symlink(
      path.join(root, 'content/docs/guide'),
      path.join(root, '.generated/docs/guide'),
    );
    await expect(assertPrepared(root, mode)).rejects.toThrow('符号链接');
  });
});
describe('Content staging', () => {
  it('publishes both example documents in an explicitly enabled release', async () => {
    const root = await fixture();
    const release = resolveBuildMode({
      SITE_ORIGIN: 'https://example.test',
      SITE_PUBLISH_EXAMPLES: 'true',
      DOCS_SOURCE_MODE: 'mock',
    });
    await prepareDocs(root, release);
    expect(await readdir(path.join(root, '.generated/docs'))).toEqual([
      'overview.md',
      'quickstart.md',
    ]);
    await assertPrepared(root, release);
    await expect(
      assertPrepared(root, { ...release, publishExamples: false }),
    ).rejects.toThrow('不匹配');
  });
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
