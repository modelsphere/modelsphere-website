import { z } from 'zod';
import { validateBaseUrl } from './site-path';
const inputSchema = z.object({
  SITE_BUILD_TARGET: z.enum(['local', 'preview', 'release']).default('release'),
  DOCS_SOURCE_MODE: z
    .enum(['none', 'mock', 'content', 'repository'])
    .default('none'),
  SITE_ORIGIN: z.string().optional(),
  SITE_BASE_URL: z.string().optional(),
  BLOG_SOURCE_MODE: z.enum(['content', 'mock']).optional(),
  SITE_PUBLISH_EXAMPLES: z.enum(['true', 'false']).default('false'),
});
export interface BuildMode {
  target: 'local' | 'preview' | 'release';
  source: 'none' | 'mock' | 'content';
  origin: string;
  baseUrl?: string;
  blogSource?: 'content' | 'mock';
  publishExamples?: boolean;
}
export function resolveBuildMode(
  env: Record<string, string | undefined>,
): BuildMode {
  const input = inputSchema.parse(env);
  if (
    input.SITE_BUILD_TARGET === 'release' &&
    input.SITE_PUBLISH_EXAMPLES !== 'true' &&
    input.BLOG_SOURCE_MODE === 'mock'
  )
    throw new Error('正式构建禁止使用 Mock 博客。');
  if (input.DOCS_SOURCE_MODE === 'repository')
    throw new Error(
      '独立文档仓库同步尚未接入，请使用 content、none 或受控 mock 预览。',
    );
  if (
    input.SITE_BUILD_TARGET === 'release' &&
    input.SITE_PUBLISH_EXAMPLES !== 'true' &&
    input.DOCS_SOURCE_MODE === 'mock'
  )
    throw new Error('正式构建禁止使用 Mock 文档。');
  const origin =
    input.SITE_ORIGIN ??
    (input.SITE_BUILD_TARGET === 'local' ? 'http://localhost:3000' : undefined);
  if (!origin) throw new Error('请显式提供 SITE_ORIGIN。');
  const url = new URL(origin);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error(
      'SITE_ORIGIN 必须是无路径、查询参数或凭据的 HTTP(S) origin。',
    );
  return {
    target: input.SITE_BUILD_TARGET,
    source: input.DOCS_SOURCE_MODE,
    origin: url.origin,
    ...(input.SITE_PUBLISH_EXAMPLES === 'true'
      ? { publishExamples: true }
      : {}),
    ...(input.SITE_BASE_URL !== undefined
      ? { baseUrl: validateBaseUrl(input.SITE_BASE_URL) }
      : {}),
    ...(input.BLOG_SOURCE_MODE ? { blogSource: input.BLOG_SOURCE_MODE } : {}),
  };
}
