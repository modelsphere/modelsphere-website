# 博客功能与内容维护

当前发布配置：`pnpm build` 默认启用 `SITE_PUBLISH_EXAMPLES=true`，正式网站包含本文件所述的 7 篇站内 Mock 与 1 条站外示例，并保留示例提示和搜索索引。`SITE_PUBLISH_EXAMPLES=false pnpm build` 才排除这些示例。下文的旧隔离规则仅适用于未启用公开示例的构建；草稿、内部规范与社区示例仍不得公开。

博客采用现有 Docusaurus、React、TypeScript、CSS Modules 与双主题变量。列表依据 Stitch 项目 `3601238558355976464` 顶层的“博客洞见-更新” `3023474615820510674`；详情按本次用户确认的既有阅读契约实现，不继承旧稿结构。Header 和 Footer 沿用网站已确认的独立配置。

## 入口与预览

- `/blog`：推荐文章、搜索、分类、热门标签、每页 12 篇的列表。
- `/blog/{slug}`：预生成 Markdown 正文，桌面左目录、中正文、右资源；不足 1280px 时目录折叠到正文前，资源移至正文后。
- `pnpm dev:blog-mock`：本地预览 7 篇站内 Mock 文章与 1 条站外阅读示例。
- `pnpm dev:blog`：预览 `content/blog` 中的真实内容。
- `pnpm build:docs-preview`：同时构建隔离的博客示例与文档示例。
- `pnpm build:blog-preview`：构建真实博客内容的受控预览，文档仍为隔离示例。
- `SITE_ORIGIN=https://实际域名 pnpm build`：正式构建；强制排除 Mock 博客与文档。

上述命令使用仓库固定的 Node.js 24.22.0、pnpm 10.22.0。预览不表示正式发布。当前没有真实文章与社区配置，正式 `/blog` 显示“尚无公开文章”；没有微信、知乎、阅读量、Star 数、假二维码或未核实的阅读时长。

## 添加文章

正文位于 `content/blog/<id>/index.md`，图片与其一起维护。下面仅说明文件格式，不是可直接发布的示例文章：

```yaml
---
id: article-id
title: 文章标题
summary: 列表与搜索使用的摘要
kind: internal
slug: article-id
publishedAt: 2026-10-22
updatedAt: 2026-10-22T10:00:00+08:00
evidenceIds: []
tagIds: []
---
```

正文从 h2 开始，允许 h2–h4、段落、列表、表格、引用、链接、图片、代码，以及 note/info/warning 提示块。拒绝原始 HTML、JSX、import、执行表达式与自定义属性。站内文章必须有正文；外部文章使用 `kind: external` 和 HTTPS `href`，不填 slug 或正文。

可选字段包括 `author`、`categoryId`、`technicalKeywords`、`pullRequestRefs`、`cover`、`relatedIds`（最多三篇）和 `resources`。阅读时长必须同时提供 `readingMinutes` 与作者标注的 HTTPS `readingTimeSource`，不自动估算。`draft: true` 和 `example: true` 的内容不进入正式产物；首期不支持定时发布。

分类、标签、推荐 id、社区渠道和来源记录在 `content/pages/blog.json` 维护。id 与显示名称分离；错误引用会阻止构建。推荐项只在无筛选的第一页出现，且从所有无筛选分页的数据集中排除。有查询时允许推荐文章成为普通结果。

## 图片与链接

封面声明 `src`、`alt`、`width`、`height`；可选 `srcDark`。推荐位 16:9、列表位 3:2，无审核裁剪预览时使用 contain。经过确认的 `preview` 可提供自己的 src、alt、尺寸与焦点。正文与详情封面始终完整展示原图。

`variants: [{src, width}]` 是可选的图片交付信息，用于 srcset；不改变 MediaSpec 的必填字段。Mock 提供 480px 与 960px 两档，列表按 264px/手机实际内容宽度选择，推荐按响应式容器选择。所有图片必须是文章目录内的 PNG/JPEG/WebP/GIF；拒绝路径越界、符号链接与外部图床，只复制被引用的资源。

2026-10-22 视觉修订保留新版图文横排：桌面列表卡片最小高度 248px，摘要完整显示，卡片底部标签与阅读入口对齐。分类、标签和主按钮通过内缩背景收紧视觉尺寸，实际点击区域仍至少 44px；推荐按钮按内容宽度显示。整卡悬停高亮标题、边框，并联动轻上移及阅读箭头，触屏、键盘与减少动效按 [D10](../design/interactions/motion-and-loading.md) 降级；不新增动画依赖。新一轮记录位于 `reports/blog-polish/`。

正文支持同页锚点、已发布文章的 `/blog/{slug}` 或相对 Markdown 链接、现有 `/`、`/blog`、`/docs` 及不含凭据的 HTTPS 链接。站内锚点和文章链接会在准备阶段校验；不发布内部工程规范。

## 实现边界

`scripts/prepare-blog.ts` 校验内容，生成 `.generated/blog`、`.generated/blog-public` 与精简摘要索引。暂存清单绑定构建模式和文件 hash，不能用旧的 Mock 暂存执行正式构建。

`plugins/blog/index.ts` 保留官方 blog 插件的 Markdown 和详情管线，仅在 `/blog` 路由注册时去掉默认的全文模块导入。列表通过公开插件数据读取摘要；没有站内文章时仍由同一插件注册空列表，不在 `src/pages` 重复声明路由。RSS、归档、自动标签页均未启用。

搜索需显式提交；分类和标签提交当前输入草稿。URL 是已提交查询的来源，支持直接访问、刷新和历史恢复。无脚本或增强失败时保留全部摘要与正文。长代码和表格仅在自身区域滚动，实际溢出时提供可访问名称与键盘焦点。复制反馈复用既有规则。

## 验证

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm blog:check
BLOG_SOURCE_MODE=mock pnpm blog:check
```

CI 对 preview/mock 与 release/none 分别构建，检查 Mock 隔离、完整无脚本摘要和列表无正文导入，并在仓库指定的 Nginx 1.28.0 镜像上运行浏览器验收。单测包含 25 篇文章的推荐分页边界和 5,000 篇合成摘要容量；这些是测试输入，不是实际业务规模或性能成绩。

本地记录保存于 `reports/blog/validation.json`，失败与最终报告分目录保留。当前仓库没有提交和远程地址，PR、提交 SHA、远程 CI 均不存在；本地检查不能作为可合并或已部署的声明。手机覆盖为 Chromium 设备模拟，未完成实体手机与辅助技术的完整矩阵。
