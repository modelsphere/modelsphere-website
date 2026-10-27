import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolveBuildMode, type BuildMode } from '../src/lib/build-mode';
import { withoutBaseUrl } from '../src/lib/site-path';
import type { BlogIndex } from '../src/features/blog/types';
import type { CommunityIndex } from '../src/features/community/types';
import { isSearchIndex } from '../src/features/search/query';
export async function collectFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('产物不允许符号链接');
    if (entry.isDirectory()) out.push(...(await collectFiles(p)));
    else out.push(p);
  }
  return out.sort();
}
export async function artifactHash(dir: string): Promise<string> {
  const hash = createHash('sha256');
  for (const file of await collectFiles(dir)) {
    hash.update(path.relative(dir, file));
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
}
export async function checkArtifacts(
  root: string,
  mode: BuildMode,
): Promise<void> {
  const dir = path.join(root, 'build');
  const files = await collectFiles(dir);
  const doc = await readFile(path.join(dir, 'docs.html'), 'utf8');
  if (!doc.includes(mode.source === 'mock' ? '认识 ModelSphere' : '文档准备中'))
    throw new Error('文档首页内容不正确');
  if (
    mode.source === 'none' &&
    files.some((f) => f.endsWith('/docs/quickstart.html'))
  )
    throw new Error('正式构建残留示例路由');
  if (mode.source === 'mock')
    await stat(path.join(dir, 'docs/quickstart.html'));
  for (const file of files) {
    if (mode.target === 'release' && file.includes('example-blog-'))
      throw new Error(`Mock 博客资源泄漏: ${file}`);
    if (!/\.(html|js|json|map|css|xml|txt)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    if (
      mode.target === 'release' &&
      /example-blog-|示例作者|MOCK PREVIEW|BLOG LAB/.test(text)
    )
      throw new Error(`Mock 博客内容泄漏: ${file}`);
    if (
      /ModelSphere 官网工程与代码生成规范|ModelSphere 文档栏目实施方案/.test(
        text,
      )
    )
      throw new Error(`内部规范泄漏: ${file}`);
    if (
      mode.source === 'none' &&
      /example-overview|example-quickstart|sample-inference-demo|placeholder-model|部署配方和测评报告承担不同职责/.test(
        text,
      )
    )
      throw new Error(`Mock 内容泄漏: ${file}`);
    if (
      /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com/.test(
        text,
      )
    )
      throw new Error(`外部运行时资源: ${file}`);
  }
  const community: CommunityIndex = JSON.parse(
    await readFile(path.join(root, '.docusaurus/globalData.json'), 'utf8'),
  )['community-content'].default;
  if (
    mode.target === 'release' &&
    (community.preview ||
      community.meeting?.example ||
      community.events.some((event) => event.example || event.draft))
  )
    throw new Error('正式产物含社区示例或草稿');
  const notFound = await readFile(path.join(dir, '404.html'), 'utf8');
  if (!notFound.includes('<html')) throw new Error('缺少 404 页面');
  const blog = await readFile(path.join(dir, 'blog.html'), 'utf8');
  const index: BlogIndex = JSON.parse(
    await readFile(path.join(root, '.generated/blog-index.json'), 'utf8'),
  );
  if (!blog.includes('博客洞见')) throw new Error('缺少博客列表');
  const routes = JSON.parse(
    await readFile(
      path.join(root, '.docusaurus/routesChunkNames.json'),
      'utf8',
    ),
  ) as Record<string, Record<string, unknown>>;
  const lists = Object.entries(routes).filter(([route]) =>
    withoutBaseUrl(route, mode.baseUrl).startsWith('/blog-'),
  );
  if (
    lists.length !== 1 ||
    lists.some(([, route]) => 'items' in route || 'content' in route)
  )
    throw new Error('博客列表路由必须只加载摘要，不得导入正文模块');
  for (const post of index.posts) {
    if (!blog.includes(`data-post-id="${post.id}"`))
      throw new Error('无脚本列表缺少文章摘要');
    if (post.kind === 'internal') {
      const detail = await readFile(
        path.join(dir, `${post.href}.html`),
        'utf8',
      );
      if (!detail.includes('<h1')) throw new Error('缺少博客预生成正文');
    }
  }
  const searchFiles = files.filter((file) =>
    /\/search-index\.[a-f0-9]{16}\.json$/.test(file),
  );
  if (searchFiles.length !== 1) throw new Error('必须只发布当前版本的搜索索引');
  const search: unknown = JSON.parse(await readFile(searchFiles[0], 'utf8'));
  if (!isSearchIndex(search)) throw new Error('搜索索引格式无效');
  const blogRoutes = new Set(
    index.posts
      .filter((post) => post.kind === 'internal')
      .map((post) => post.href),
  );
  for (const entry of search.entries) {
    if (entry.kind === 'docs' && mode.source === 'none')
      throw new Error('未发布的文档进入搜索索引');
    if (entry.kind === 'blog' && !blogRoutes.has(entry.pageHref))
      throw new Error('未发布或站外博客进入搜索索引');
    await stat(path.join(dir, `${entry.pageHref}.html`));
  }
  for (const route of blogRoutes)
    if (!search.entries.some((entry) => entry.pageHref === route))
      throw new Error('公开博客缺少搜索索引');
  if (
    mode.source === 'mock' &&
    !search.entries.some((entry) => entry.kind === 'docs')
  )
    throw new Error('预览文档缺少搜索索引');
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = resolveBuildMode(process.env);
  const record = JSON.parse(await readFile('reports/build.json', 'utf8')) as {
    mode: BuildMode;
    artifactSha256: string;
  };
  if (JSON.stringify(record.mode) !== JSON.stringify(mode))
    throw new Error('检查用途必须与构建用途一致，不能由产物决定检查模式');
  await checkArtifacts(process.cwd(), mode);
  if (record.artifactSha256 !== (await artifactHash('build')))
    throw new Error('构建后产物被修改');
  console.log(`产物检查通过：${mode.target}/${mode.source}`);
}
