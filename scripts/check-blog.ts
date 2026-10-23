import { resolveBuildMode } from '../src/lib/build-mode';
import { readBlog } from './prepare-blog';
const mode = resolveBuildMode({
  ...process.env,
  SITE_BUILD_TARGET: process.env.SITE_BUILD_TARGET ?? 'local',
  SITE_ORIGIN: process.env.SITE_ORIGIN ?? 'http://localhost:3000',
  BLOG_SOURCE_MODE: process.env.BLOG_SOURCE_MODE ?? 'content',
});
const { articles } = await readBlog(process.cwd(), mode);
console.log(
  `博客内容检查通过：${articles.length} 篇${mode.blogSource === 'mock' ? '隔离示例' : '正式内容'}。`,
);
