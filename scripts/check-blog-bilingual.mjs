import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
const commit = (ref) =>
  git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`);

function comparisonBase() {
  if (process.argv[2]) return commit(process.argv[2]);
  if (!process.env.GITHUB_EVENT_PATH) {
    throw new Error(
      '请指定比较基线：node scripts/check-blog-bilingual.mjs <base-ref>',
    );
  }
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    return git(
      'merge-base',
      commit(event.pull_request.base.sha),
      commit('HEAD'),
    );
  }
  if (process.env.GITHUB_EVENT_NAME === 'push') {
    if (event.before && !/^0+$/.test(event.before)) return commit(event.before);
    // A newly created topic branch has no "before" commit. Compare its whole
    // contribution with develop rather than only inspecting its last commit.
    const branch = event.repository.default_branch;
    for (const ref of [
      'refs/remotes/origin/develop',
      `refs/remotes/origin/${branch}`,
    ]) {
      try {
        return git('merge-base', commit(ref), commit('HEAD'));
      } catch {
        // Try the repository default branch when a fork has no develop ref.
      }
    }
    throw new Error(
      '新分支缺少比较基线；需要完整 Git 历史及 develop/默认分支引用。',
    );
  }
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch')
    return commit('HEAD^');
  throw new Error('无法确定新增博文的比较基线；拒绝跳过双语检查。');
}

function requireBody(head, file) {
  const entry = git('ls-tree', head, '--', file);
  if (!/^100(?:644|755) blob /.test(entry)) {
    throw new Error(`缺少正常 Markdown 文件：${file}`);
  }
  const raw = git('show', `${head}:${file}`);
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw);
  const body = raw
    .slice(frontmatter?.[0].length ?? 0)
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  if (!body) throw new Error(`Markdown 正文为空：${file}`);
}

try {
  const base = comparisonBase();
  const head = commit('HEAD');
  const added = git(
    'diff',
    '--name-only',
    '--no-renames',
    '--diff-filter=A',
    '-z',
    base,
    head,
    '--',
  ).split('\0');
  const ids = new Set();
  for (const file of added) {
    const match =
      /^content\/blog\/([^/]+)\/index\.md$/.exec(file) ??
      /^i18n\/en\/blog\/([^/]+)\.md$/.exec(file);
    if (match) ids.add(match[1]);
  }
  const errors = [];
  for (const id of [...ids].sort()) {
    for (const file of [
      `content/blog/${id}/index.md`,
      `i18n/en/blog/${id}.md`,
    ]) {
      try {
        requireBody(head, file);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  if (errors.length) {
    throw new Error(
      `新增博文必须同时提供中文和英文版本（相同 id），不能用空文件代替：\n${errors.join('\n')}`,
    );
  }
  console.log(
    `新增博文双语检查通过：${ids.size} 篇，基线 ${base}，提交 ${head}。`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
