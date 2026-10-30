# ModelSphere 技术文档实施与维护规范

| 属性 | 内容 |
| --- | --- |
| 更新日期 | 2026-10-30 |
| 正式文档源 | 网站仓库 `content/docs/` |
| 公开栏目 | `/docs`，GitHub Pages 部署时自动添加项目路径 |
| 文档框架 | Docusaurus，复用侧栏、正文、目录、代码复制、主题与搜索 |

## 1 目录和发布边界

新增、修改正式技术文档统一提交到 `modelsphere-website/content/docs/`，与网站代码通过同一 PR 检查、构建和发布。该目录是当前正式内容源，不依赖独立文档仓库，也不需要手工同步到生成目录。

```text
modelsphere-website/
├── content/docs/                 正式网站文档源
│   ├── index.md                  文档首页，slug: /
│   ├── quickstart.md             快速开始，slug: /quickstart
│   ├── deploy.md                 部署模型，slug: /deploy
│   ├── playground.md             Playground，slug: /playground
│   ├── api.md                    调用 API，slug: /api
│   ├── access-control.md         访问控制，slug: /access-control
│   ├── faq.md                    常见问题，slug: /faq
│   └── images/                   本地图片或共享图片资源
├── i18n/en/docs/                 英文译文，按 content/docs 的相对路径对应
├── tests/fixtures/docs/          固定的两篇测试示例
├── tests/fixtures/docs-en/       固定测试示例的英文译文，只用于 mock 构建
├── docs/design/                  内部设计规范，不发布
├── docs/development/             内部开发规范，不发布
└── .generated/docs/              构建暂存，不提交、不手工编辑
```

当前正式目录发布 Console 使用文档 7 篇：文档首页与快速开始、部署模型、Playground、调用 API、访问控制、常见问题。内容来自 console 仓库随版本发布的使用文档（`web/src/modules/docs/content/`），迁移时只做站点格式和链接适配，不在本站另写一套操作说明；Console 文档里的界面位置在网站中以纯文本路径呈现，文档之间使用站内相对链接。测试 fixture 独立保留，日常文档维护不修改它。Mock 构建的英文译文与正式内容分开：`prepareTranslations` 在 mock 来源下读取 `tests/fixtures/docs-en/`，固定示例不依赖 `content/docs/` 与 `i18n/en/docs/` 的变化；正式构建按生成目录的相对路径读取 `i18n/en/docs/`。

## 2 新增文档格式

正文使用 UTF-8 `.md`，文件名和目录名使用小写英文、数字、连字符。支持递归子目录和本地 PNG、JPEG、WebP、GIF 图片；不接收 `.mdx`、SVG、符号链接、附件、`_category_.json` 或其他文件。图片文件名可含中文和空格，目录名仍使用小写英文、数字和连字符。

每篇文档必须提供以下 frontmatter：

```yaml
---
id: deployment-kubernetes
title: Kubernetes 部署
description: 说明本篇文档的用途与适用范围。
slug: /deployment/kubernetes
sidebar_position: 1
---

## 前置条件

填写实际版本、环境和权限要求。
```

| 字段 | 规则 |
| --- | --- |
| `id` | 全集合唯一；小写英文、数字、连字符，不含 `/`；发布后保持稳定 |
| `title` | 非空页面标题，模板生成唯一 h1 |
| `description` | 非空摘要，用于页面元信息 |
| `slug` | 全集合唯一；以 `/` 开始，后续为小写英文、数字、连字符构成的路径段；不带尾斜杠 |
| `sidebar_position` | 正整数；控制同级目录内的导航顺序 |
| `draft` | 可选布尔值；`true` 时不进入暂存、侧栏、正文或搜索；元数据仍需有效 |

必须有且只有一篇非草稿文档使用 `slug: /`，通常为 `content/docs/index.md`。不能通过文件名猜测首页。除 `draft` 外，上表字段均必填；不接收未约定的元数据字段。

路由由 `slug` 决定，不由文件位置决定：`slug: /deployment/kubernetes` 发布到 `/docs/deployment/kubernetes`。GitHub Pages 的 `/modelsphere-website/` 前缀由构建配置统一添加，禁止写入 `slug`。

## 3 正文、链接与真实性

- 正文从 h2 开始，使用 h2–h4；不重复写 h1。非草稿文档正文不能为空。
- 支持普通 Markdown、表格、代码围栏，以及 `note / info / warning` 静态提示块。
- 拒绝原始 HTML、JSX、import、执行表达式、自定义指令和提示块属性；代码围栏内的示例作为纯文本保留。
- 文档间使用相对 Markdown 链接，例如首页链接 `deployment/kubernetes.md`，子文档返回 `../index.md`，支持 `#章节锚点`。
- 相对链接解析后必须位于 `content/docs/` 内，且目标是非草稿文档；目标文件和章节不存在时构建失败。外部链接仅接受不含凭据的 HTTPS 地址。
- 不手工拼接部署前缀，不引用 `.generated/`、内部规范或源目录外文件。
- 部署指南注明适用版本、前置条件、必要权限、实际操作、验证结果和故障处理。未核验的信息不得写成产品承诺；示例保留明确说明。

### 本地图片

图片放在 `content/docs/` 内，与 Markdown 一起提交。可放在文章同目录，也可统一放到 `images/`；路径相对于当前 Markdown 文件，允许 `../` 引用文档目录内的共享图片，但不能越过 `content/docs/`。不写 `/modelsphere-website/` 部署前缀。

```markdown
![架构图说明](./images/architecture.png)

![共享架构图][architecture]

[architecture]: ../images/architecture.png
```

以上分别演示普通图片与引用式图片，实际路径须按 Markdown 所在目录调整。文件名含空格时使用 `%20`，并为图片填写有意义的替代文字。外部图床、绝对路径、data URL、查询参数及图片锚点不受支持；HTML/JSX 图片仍不允许。

构建检查图片是否存在、是否为普通本地文件以及文件头是否匹配扩展名；缺失或无效图片会阻止发布。只有非草稿文档实际引用的图片进入暂存并记录 SHA-256；未引用图片和仅草稿使用的图片不会发布。框架负责生成图片资源地址及部署前缀，图片保持比例并适应正文宽度，无脚本也能显示。

## 4 读取、侧栏与搜索

```text
content/docs/ 递归读取
  → 校验 frontmatter、Markdown、链接和引用图片
  → 排除草稿，确认唯一首页及唯一 id/slug
  → 清理旧暂存，保留相对目录写入正文及实际引用图片到 .generated/docs/
  → 记录构建模式、文件清单和 SHA-256
  → Docusaurus 生成侧栏、正文、前后篇及章节目录
  → 从实际公开文档生成同版搜索索引
  → 检查所有文档路由、暂存完整性和搜索覆盖
```

侧栏使用 Docusaurus 自动生成规则，新文件无需修改 `sidebars.ts`。子目录自动形成导航分组，组内顺序使用 `sidebar_position`。全站“快速开始”入口仅在公开文档存在 `slug: /quickstart` 时指向该页，否则返回 `/docs`。

切换来源时清理上一次暂存及站点输出，旧文章不能残留。暂存校验递归检查文件清单、哈希和符号链接。`version.json` 记录本次实际生成的文档路由，发布后逐条核验页面和静态资源，不能只检查固定的两篇文章。

## 5 构建模式和命令

| 模式 | 来源和用途 |
| --- | --- |
| `DOCS_SOURCE_MODE=content` | 读取 `content/docs/`；开发、预览、正式构建默认使用 |
| `DOCS_SOURCE_MODE=mock` | 只读取 `tests/fixtures/docs/overview.md` 和 `quickstart.md`，用于回归验证 |
| `DOCS_SOURCE_MODE=none` | 不发布正文，`/docs` 显示准备页 |
| `DOCS_SOURCE_MODE=repository` | 独立仓库同步尚未实现，显式选择时报错 |

`SITE_BUILD_TARGET` 继续区分 `local / preview / release`。正式 origin 必须显式提供；`SITE_BASE_URL` 单独配置项目路径。`SITE_PUBLISH_EXAMPLES` 控制显式 mock 来源的正式发布许可和博客示例，不再决定是否读取正式文档目录；关闭正式文档需显式设置 `DOCS_SOURCE_MODE=none`。

```sh
pnpm install --frozen-lockfile
pnpm content:check
pnpm dev:docs
pnpm build:docs-preview
```

检查固定测试示例：

```sh
DOCS_SOURCE_MODE=mock pnpm content:check
DOCS_SOURCE_MODE=mock pnpm build:docs-preview
```

正式构建：

```sh
SITE_ORIGIN=https://modelsphere.github.io SITE_BASE_URL=/modelsphere-website/ pnpm build
```

固定 Node.js 24.22.0、pnpm 10.22.0，依赖由当前仓库及锁文件声明。`pnpm dev:docs` 会先校验并生成暂存；修改正文后重启开发命令以重新同步。

## 6 新增文档的操作步骤

1. 在 `content/docs/` 对应模块下创建 `.md` 文件。
2. 填写必需元数据，确认唯一 `id` 和 `slug`，设置同级导航顺序。
3. 编写正文、相对链接和本地图片引用；未完成时设置 `draft: true`，已发布页面不得链接到草稿。
4. 运行 `pnpm content:check`，修正元数据、目标文件、锚点或图片错误。
5. 运行 `pnpm dev:docs`，检查侧栏、目录、前后篇、浅深主题与搜索。
6. 提交网站 PR，等待实际提交的检查成功后按授权合并，统一构建发布。

## 7 验证和交付要求

- 单测覆盖超过两篇文档、嵌套目录、跨目录链接、重复 id/slug、缺少首页、草稿排除、越界路径和源/暂存符号链接，以及图片引用、文件类型、草稿资源排除和图片暂存篡改。
- 构建检查覆盖所有实际文档路由及其搜索索引，禁止内部规范和未发布文档进入产物。
- CI 的预览模式验证固定 mock，正式模式读取 `content/docs/`，分别检查根路径和 Pages 项目路径。
- 浏览器检查覆盖目录导航、代码复制、无脚本阅读、本地图片加载、搜索与双主题，沿用现有响应式和可访问性契约。
- 每次变更重新生成产物并运行受影响检查；推送后核对完整提交 SHA、单测步骤及所有适用 CI，合并后核验实际发布版本。
- 未推送时明确记录“仅本地验证，未推送／未验证远程 CI”；不得把旧版本记录当作本次验证结论。

## 10 本轮交付与本地验证记录

以下为 2026-10-21 文档试点的历史记录，不代表本次目录切换的验证结果或当前线上状态。

本节保留此前文档试点的本地验证记录，范围为两篇 Mock、准备页及当时已实现的共享导航和主题。它不验证本次规范修订，也不证明新版首页、Catalog 或博客已实现。门户 Footer 的当前目标分组为“开源代码／社区与生态／开发者资源／法律与开源”，博客入口仅放“社区与生态”；后续实现与验收需按修订后的规范单独执行。

验证日期：2026-10-21。实现采用 Docusaurus 3.10.2、React 19.3.1、TypeScript 5.9.3；运行时 Node 24.22.0、pnpm 10.22.0。复用框架文档组件及原生 HTML 控件，本轮未引入额外 UI 组件库。全局示例提示条已移除；Footer 独立按项目 3601238558355976464：文档页使用双层紧凑横栏，门户使用六格导航；浅色白底，深色 #0B0E15。Header 按 Stitch 项目 14815301483114557678 覆盖，使用原始 Logo 与本地 Inter 5.3.0；去掉“外观”下拉框，改为太阳／月亮按钮，GitHub 指向用户确认的组织主页。

| 检查 | 实际结果 |
| --- | --- |
| 冻结依赖安装 | `pnpm install --frozen-lockfile` 通过，使用当前仓库声明和锁定的依赖 |
| 格式、Lint、类型 | 全部通过；额外确认没有 `.docusaurus` 生成目录时类型检查仍通过 |
| 单元测试 | 3 个测试文件、29 项通过；覆盖模式、内容边界、暂存校验和产物泄漏 |
| Mock 静态构建 | 通过；两篇 Markdown 生成 `/docs` 与 `/docs/quickstart` |
| 预览浏览器检查 | 14 项通过，实际运行于本机 Nginx 1.28.0 容器 |
| 正式静态构建 | 通过；`release + none` 输出准备页，产物扫描无 Mock 内容 |
| 正式浏览器检查 | 9 项通过；快速开始及未知文档路径返回 HTTP 404 |
| 主题 | 首访跟随系统、太阳／月亮切换、刷新、跨页、禁用存储及阅读位置检查通过 |
| 响应式与降级 | 文档覆盖 320、390、767、768、1279、1280、1440px；Header 额外覆盖 639、640、1024、1600、1920px；无脚本、字体加载失败、正文文字放大至 200%、减少动效检查通过 |
| 键盘与复制 | 原生菜单、Escape、跨断点焦点恢复；复制成功、失败提示及按钮尺寸检查通过 |
| 网络资源 | 浏览器检查未发现外部脚本、字体、样式或数据请求 |
| 开发命令 | `pnpm dev:docs` 编译成功，两篇文档地址返回 200；测试进程已停止 |
| 视觉核对 | 文档双层 Footer 与首页六格 Footer 分别对照项目 3601238558355976464；已核对桌面/手机浅深色、阅读页及代码工具栏；本轮使用 Chromium 156.0.8078.4，未扩展到 Safari/Firefox 实机验收 |
| 内部规范 | README、工程、架构及设计说明原地更新；本地文件链接检查通过 |

本次 Footer 来源修正后的本地报告保存在不提交的 `reports/footer-correct-preview/`、`reports/footer-correct-release/`，实际截图为 `reports/screenshots/footer-correct-*`；此前 Header 报告只代表当时的检查，不作为本次 Footer 验收依据。浏览器与运行时版本见 `reports/runtime.json`。CI 会在每次运行中上传构建记录、Playwright 报告及截图；本地报告不会作为网站静态资源发布。

正式产物 SHA-256：`1778db693d608931817f119987ed633e0a758ff471d426061a36ec792320ce05`。预览镜像指纹和正式镜像指纹分别保存在对应的 `verification.json`。这些是本地产物标识，不是已验证的 Git 提交 SHA。

**仅本地验证，未推送／未验证远程 CI。** 当前仓库没有提交或远程地址；PR 链接、提交 SHA 和远程运行链接均不存在。`.github/workflows/ci.yml` 已配置质量检查、单测以及两种模式的 Nginx 浏览器验收，但没有据此宣称远程 CI 已通过或可合并。

本轮交付范围仅为文档试点。真实文档同步、全文搜索、博客、Model Catalog、完整门户和生产部署尚未实施。
