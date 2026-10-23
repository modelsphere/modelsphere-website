import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolveBuildMode } from '../src/lib/build-mode';
import { prepareDocs } from './prepare-docs';
import { prepareBlog } from './prepare-blog';
import { generateTokens } from './generate-tokens';
import { artifactHash, checkArtifacts } from './check-artifacts';
const action = process.argv[2];
if (!['dev', 'preview', 'release'].includes(action))
  throw new Error('使用 dev / preview / release');
if (
  action === 'release' &&
  process.env.DOCS_SOURCE_MODE &&
  process.env.DOCS_SOURCE_MODE !== 'none'
)
  throw new Error('正式构建拒绝文档来源覆盖');
const env = {
  ...process.env,
  SITE_BUILD_TARGET: action === 'dev' ? 'local' : action,
  DOCS_SOURCE_MODE: action === 'release' ? 'none' : 'mock',
  SITE_ORIGIN:
    process.env.SITE_ORIGIN ??
    (action === 'release' ? undefined : 'http://localhost:3000'),
};
const mode = resolveBuildMode(env);
await prepareDocs(process.cwd(), mode);
await prepareBlog(process.cwd(), mode);
await generateTokens();
for (const dir of ['.docusaurus', 'build'])
  await rm(dir, { recursive: true, force: true });
await mkdir('reports', { recursive: true });
await rm('reports/build.json', { force: true });
const args =
  action === 'dev'
    ? ['start', '--host', '127.0.0.1', '--port', '3000', '--no-open']
    : ['build'];
const child = spawn(
  process.execPath,
  ['node_modules/@docusaurus/core/bin/docusaurus.mjs', ...args],
  { stdio: 'inherit', env },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => child.kill(signal));
const code = await new Promise<number>((resolve) => {
  child.on('error', (error) => {
    console.error(error);
    resolve(1);
  });
  child.on('exit', (code) => resolve(code ?? 1));
});
if (code !== 0) process.exit(code);
if (action !== 'dev') {
  await checkArtifacts(process.cwd(), mode);
  let siteCommit: string | null = null;
  try {
    siteCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* Initial repository has no commits. */
  }
  await writeFile(
    'reports/build.json',
    JSON.stringify(
      {
        mode,
        node: process.version,
        siteCommit,
        lockfileSha256: createHash('sha256')
          .update(await readFile('pnpm-lock.yaml'))
          .digest('hex'),
        artifactSha256: await artifactHash('build'),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`构建与产物检查通过：${mode.target}/${mode.source}`);
}
