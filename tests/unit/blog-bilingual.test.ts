import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/check-blog-bilingual.mjs');
const chinese = (id: string) => `content/blog/${id}/index.md`;
const english = (id: string) => `i18n/en/blog/${id}.md`;
const body =
  '---\ntitle: Example\nsummary: A summary\n---\n\n## Content\n\nArticle body.\n';
async function fixture(
  action: (ctx: {
    root: string;
    git: (...args: string[]) => string;
    put: (file: string, text?: string) => Promise<void>;
    commit: () => string;
    check: (
      base?: string,
      event?: Record<string, unknown>,
      name?: string,
    ) => Promise<ReturnType<typeof spawnSync>>;
  }) => Promise<void>,
) {
  const root = await mkdtemp(path.join(tmpdir(), 'blog-bilingual-'));
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const put = async (file: string, text = body) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  };
  const commit = () => {
    git('add', '.');
    git('commit', '--allow-empty', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  const check = async (
    base?: string,
    event?: Record<string, unknown>,
    name = 'pull_request',
  ) => {
    const eventFile = path.join(root, '.event.json');
    if (event) await writeFile(eventFile, JSON.stringify(event));
    return spawnSync(process.execPath, [script, ...(base ? [base] : [])], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: name,
        GITHUB_EVENT_PATH: event ? eventFile : '',
      },
    });
  };
  try {
    git('init', '--initial-branch=main');
    git('config', 'user.name', 'Bilingual tests');
    git('config', 'user.email', 'test@example.invalid');
    commit();
    await action({ root, git, put, commit, check });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('new blog bilingual CI gate', () => {
  it.each([chinese('new-post'), english('new-post')])(
    'rejects a one-language addition: %s',
    async (file) => {
      await fixture(async ({ git, put, commit, check }) => {
        const base = git('rev-parse', 'HEAD');
        await put(file);
        commit();
        const result = await check(base);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          file.startsWith('content/')
            ? english('new-post')
            : chinese('new-post'),
        );
      });
    },
  );
  it('accepts a complete pair across multiple commits, and uses the whole PR range', async () => {
    await fixture(async ({ git, put, commit, check }) => {
      const base = git('rev-parse', 'HEAD');
      await put(chinese('new-post'));
      commit();
      await put(english('new-post'));
      commit();
      expect(
        (await check(undefined, { pull_request: { base: { sha: base } } }))
          .status,
      ).toBe(0);
    });
  });
  it.each(['', '---\ntitle: Example\nsummary: Example\n---\n<!-- no body -->'])(
    'rejects an empty English placeholder',
    async (text) => {
      await fixture(async ({ git, put, commit, check }) => {
        const base = git('rev-parse', 'HEAD');
        await put(chinese('new-post'));
        await put(english('new-post'), text);
        commit();
        const result = await check(base);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('正文为空');
      });
    },
  );
  it('does not force translation of an unchanged historical article during ordinary edits', async () => {
    await fixture(async ({ put, commit, check }) => {
      await put(chinese('legacy'));
      const base = commit();
      await put(chinese('legacy'), body + '\nEdited.');
      commit();
      expect((await check(base)).status).toBe(0);
    });
  });
  it('accepts adding English to an existing Chinese article', async () => {
    await fixture(async ({ put, commit, check }) => {
      await put(chinese('legacy'));
      const base = commit();
      await put(english('legacy'));
      commit();
      expect((await check(base)).status).toBe(0);
    });
  });
  it('does not let draft/example flags exempt a newly added article', async () => {
    await fixture(async ({ git, put, commit, check }) => {
      const base = git('rev-parse', 'HEAD');
      await put(
        chinese('draft-post'),
        body.replace(
          'title: Example',
          'title: Example\ndraft: true\nexample: true',
        ),
      );
      commit();
      expect((await check(base)).status).toBe(1);
    });
  });
  it('treats renamed articles as additions and requires the new counterpart', async () => {
    await fixture(async ({ git, put, commit, check }) => {
      await put(chinese('old-id'));
      const base = commit();
      await mkdir(
        path.join(git('rev-parse', '--show-toplevel'), 'content/blog/new-id'),
        { recursive: true },
      );
      git('mv', chinese('old-id'), chinese('new-id'));
      commit();
      const result = await check(base);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(english('new-id'));
    });
  });
  it('rejects a missing translation even when only the first push commit added the article', async () => {
    await fixture(async ({ git, put, commit, check }) => {
      const base = git('rev-parse', 'HEAD');
      await put(chinese('new-post'));
      commit();
      await put('unrelated.md');
      commit();
      expect((await check(undefined, { before: base }, 'push')).status).toBe(1);
    });
  });
  it('compares a new branch with develop instead of only its last commit', async () => {
    await fixture(async ({ git, put, commit, check }) => {
      const base = git('rev-parse', 'HEAD');
      git('update-ref', 'refs/remotes/origin/develop', base);
      await put(chinese('new-post'));
      commit();
      await put('unrelated.md');
      commit();
      expect(
        (
          await check(
            undefined,
            { before: '0'.repeat(40), repository: { default_branch: 'main' } },
            'push',
          )
        ).status,
      ).toBe(1);
    });
  });
  it('fails closed when the comparison history is unavailable', async () => {
    await fixture(async ({ check }) => {
      expect((await check('missing-ref')).status).toBe(1);
    });
  });
  it('ignores fixture and documentation files', async () => {
    await fixture(async ({ git, put, commit, check }) => {
      const base = git('rev-parse', 'HEAD');
      await put('tests/fixtures/blog/posts/test/index.md');
      await put('docs/test.md');
      commit();
      expect((await check(base)).status).toBe(0);
    });
  });
});
