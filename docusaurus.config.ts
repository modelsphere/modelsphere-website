import type { Config } from '@docusaurus/types';
import type { ThemeConfig } from '@docusaurus/preset-classic';
import { resolveBuildMode } from './src/lib/build-mode';
import { assertPrepared } from './src/lib/prepared-input';
import { assertPreparedBlog } from './src/lib/prepared-blog';
import { mkdir } from 'node:fs/promises';
const prismTheme = {
  plain: {
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-background-code)',
  },
  styles: [
    {
      types: ['comment', 'prolog'],
      style: { color: 'var(--color-code-comment)' },
    },
    {
      types: ['string', 'attr-value'],
      style: { color: 'var(--color-code-string)' },
    },
    {
      types: ['keyword', 'boolean', 'number', 'atrule', 'key'],
      style: { color: 'var(--color-code-command)' },
    },
  ],
};
export default async function config(): Promise<Config> {
  const mode = resolveBuildMode(process.env);
  await assertPrepared(process.cwd(), mode);
  await assertPreparedBlog(process.cwd(), mode);
  await mkdir('.generated/search-public', { recursive: true });
  return {
    title: '模域 ModelSphere',
    tagline: '大模型推理基础设施',
    favicon: 'brand/modelsphere-symbol.png',
    url: mode.origin,
    baseUrl: mode.baseUrl ?? '/',
    trailingSlash: false,
    staticDirectories: [
      'static',
      '.generated/blog-public',
      '.generated/search-public',
    ],
    onBrokenLinks: 'throw',
    i18n: { defaultLocale: 'zh-CN', locales: ['zh-CN'] },
    markdown: { format: 'md', hooks: { onBrokenMarkdownLinks: 'throw' } },
    customFields: { docsMock: mode.source === 'mock' },
    presets: [
      [
        'classic',
        {
          docs:
            mode.source === 'mock'
              ? {
                  path: '.generated/docs',
                  routeBasePath: 'docs',
                  sidebarPath: './sidebars.ts',
                  breadcrumbs: true,
                  showLastUpdateTime: false,
                }
              : false,
          blog: false,
          sitemap: false,
          theme: { customCss: ['./src/css/custom.css', './src/css/docs.css'] },
        },
      ],
    ],
    plugins: [
      './plugins/search/index.ts',
      './plugins/community/index.ts',
      ...(mode.source === 'none'
        ? ['./plugins/docs-placeholder/index.ts']
        : []),
      [
        './plugins/blog/index.ts',
        {
          path: '.generated/blog',
          routeBasePath: 'blog',
          blogTitle: '博客洞见',
          blogDescription: 'ModelSphere 技术文章、版本动态与工程实践。',
          blogListComponent: '@site/src/features/blog/BlogList.tsx',
          blogPostComponent: '@site/src/features/blog/BlogPostPage.tsx',
          postsPerPage: 'ALL',
          archiveBasePath: null,
          showReadingTime: false,
          feedOptions: { type: null },
          onInlineAuthors: 'ignore',
          onUntruncatedBlogPosts: 'ignore',
        },
      ],
    ],
    headTags: [
      {
        tagName: 'script',
        attributes: {},
        innerHTML: `if(location.pathname===${JSON.stringify(`${mode.baseUrl ?? '/'}blog`)}&&location.search){document.documentElement.setAttribute('data-blog-query-pending','');setTimeout(function(){document.documentElement.removeAttribute('data-blog-query-pending')},5000)}`,
      },
      {
        tagName: 'meta',
        attributes: { name: 'robots', content: 'noindex, nofollow' },
      },
    ],
    themeConfig: {
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: '模域 ModelSphere',
        items: [{ to: '/docs', label: '文档指南', position: 'left' }],
      },
      footer: {
        style: 'dark',
        copyright:
          '© 2026 ModelSphere (模域) Open Source Project. All rights reserved.',
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      prism: {
        theme: prismTheme,
        darkTheme: prismTheme,
        additionalLanguages: ['yaml'],
      },
      docs: { sidebar: { hideable: false, autoCollapseCategories: false } },
    } satisfies ThemeConfig,
  };
}
