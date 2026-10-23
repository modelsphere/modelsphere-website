# ModelSphere 文档栏目实施方案

| 属性 | 内容 |
| --- | --- |
| 更新日期 | 2026-10-21 |
| 实施范围 | Docusaurus 文档栏目、两篇 Mock 文档、标准阅读交互、全站主题基础 |
| 当前状态 | 文档试点已实现；本地验证记录见第 10 节，远程 CI 未验证 |
| 开发依据 | [工程准则](engineering.md)、[设计基础](../design/foundations.md)、[页面契约](../design/page-contracts.md)、[交互规范](../design/interactions.md)、[内容规范](../design/content-policy.md) |

首轮交付一个可在本地浏览的 `/docs` 栏目，用两篇 Mock 验证 Markdown 到网页的完整流程。文档采用标准侧栏、正文和章节目录，支持跟随系统、浅色、深色。真实文档尚未提供，正式构建继续显示“文档准备中”，示例不进入公开产物。

## 1 本轮范围与交付结果

| 本轮实施 | 交付结果 |
| --- | --- |
| 统一站点骨架 | 一个 Docusaurus + React + TypeScript 应用，沿用网站仓库、依赖锁文件和主题配置 |
| 文档阅读 | 两篇文章、左侧导航、章节目录、代码高亮/复制、前后篇链接、有效锚点 |
| Mock 内容 | 《认识 ModelSphere》《快速开始（示例）》，按第 4 节编写完整正文 |
| 基础外观 | 当前基础规范的字体、色彩和小圆角；文档无营销 hero、卡片入场和循环动画 |
| 主题 | 首访跟随系统，太阳／月亮切换浅深色；正文、导航、提示、表格、代码与 404 均覆盖 |
| 内容隔离 | Mock 仅用于本地或受控预览；正式构建及产物检查拒绝示例泄漏 |
| 工程验证 | 类型、内容校验、实际单测、两种构建及静态服务端到端检查 |

本轮不实施全文搜索、博客、Catalog、完整营销首页、真实文档仓库同步、多语言、多版本或生产部署。搜索不展示失效入口；后续接入自托管索引。现有全站架构和 Catalog 动态数据要求继续有效。

当前视觉来源仅采用项目 3601238558355976464 顶部“首页-更新”“模型目录”“博客洞见-更新”三张新版；底部旧稿仅补充 dark mode 色彩。Header 的项目 14815301483114557678 覆盖和已实现文档双层 Footer 为既定特例。本次不再从旧页面抽取布局；文档阅读结构继续采用 Docusaurus 标准能力。Space Grotesk / Geist / JetBrains Mono 为全站字体，Header 的 Inter 为既定例外。

首页暂时只提供真实可用的文档入口及项目名称，不将尚未实现的架构、Catalog、博客、社区链接加入导航。不复制 Docusaurus 默认教程、示例博客或默认品牌素材。

## 2 内容到页面的实现链路

```text
显式选择构建用途与文档来源
  → 清理本轮暂存、框架缓存与输出目录
  → 校验来源及 Markdown
  → 仅复制选定正文到 .generated/docs/
  → Docusaurus docs 插件读取暂存内容
  → 共用导航、正文样式与主题生成 HTML
  → 检查路由、资源、内容隔离和静态服务行为
```

文档插件只读取 `.generated/docs/`，不直接读取仓库根目录 `docs/` 或整个测试目录。根目录 `docs/design`、`docs/development` 始终是内部规范。

Docusaurus 的 docs 插件提供 Markdown 文档路由和侧栏组织，使用 `path`、`routeBasePath`、`sidebarPath` 指定输入与地址。采用 Classic preset 时通过 preset 配置启用，不重复注册同一插件。[官方文档插件配置](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs)。

### 2.1 构建模式

构建用途和内容来源分开管理，不能用 `NODE_ENV` 判断是否允许 Mock：预览静态构建也可能使用生产优化。

| 参数 | 取值与默认值 | 规则 |
| --- | --- | --- |
| `SITE_BUILD_TARGET` | `local / preview / release`，默认 release | local 仅本机；preview 为受控预览；release 是正式候选 |
| `DOCS_SOURCE_MODE` | `none / mock / repository`，默认 none | 本轮实现 none、mock；repository 保留为后续接入值，本轮显式选择时报未实现错误 |
| `SITE_ORIGIN` | local 默认 `http://localhost:3000`；preview/release 按环境提供 | 正式地址未提供时 release 构建报错；不猜测域名 |

| 组合 | `/docs` 行为 | 构建结果 |
| --- | --- | --- |
| local + mock | 直接展示第一篇，侧栏可切到第二篇 | 允许；明确示例标识 |
| preview + mock | 与本地相同 | 允许；发布到远程预览时需保护 HTML、JS、素材及其他资源，并设置 noindex |
| 任意用途 + none | 文档准备页 | 不输出 Mock、侧栏、前后篇或伪快速开始 |
| release + mock | 无页面输出 | 构建在调用 Docusaurus 前失败，不能自动降级后报告成功 |
| 任意用途 + 非法值 | 无页面输出 | 明确配置错误，退出码非零 |

`SITE_BUILD_TARGET` 和 `DOCS_SOURCE_MODE` 是构建参数，不暴露为浏览器运行时开关。正式流水线固定 release + none；不能接受文章 frontmatter 或访问 URL 改变模式。后续有真实来源后改为 release + repository。

每次模式切换都重新准备暂存区并清除框架缓存与旧构建目录，防止预览文章残留。清理仅限本应用生成目录，不删除内容源、内部规范或用户文件。直接绕过构建包装器调用底层构建时，配置校验也必须拒绝 release + mock。

### 2.2 路由归属

| 路由 | Mock 模式 | none 模式 |
| --- | --- | --- |
| `/` | 最小首页，提供文档入口 | 同一最小首页 |
| `/docs` | docs 插件输出第一篇，frontmatter `slug: /` | 条件注册的“文档准备中”页面 |
| `/docs/quickstart` | docs 插件输出第二篇 | 真正 HTTP 404 |
| `/docs/不存在的路径` | 真正 HTTP 404 | 真正 HTTP 404 |

Mock 模式启用 docs 插件；none 模式关闭 docs 插件，仅由准备页插件注册 `/docs`。不同时创建固定 `src/pages/docs.tsx` 和插件文档首页。页面路径无尾斜杠，维持 `baseUrl: '/'` 与 `trailingSlash: false`。

Mock 内部的“下一篇”指向第二篇；公开全站 `docsQuickstartHref` 在真实内容就绪前保持未配置。按当前界面要求，不渲染站级“示例预览／仅供界面验证”提示条；Mock 仍保留正文内的示例说明和构建隔离。Mock 页不进入站点地图，远程预览的访问控制不能只依赖 noindex。

## 3 实现文件与职责

下表路径相对 `modelsphere-website/`；当前已落地文档试点文件，后续真实内容与业务模块按对应章节扩展。

| 文件或目录 | 职责 |
| --- | --- |
| `package.json`、`pnpm-lock.yaml`、`.node-version` | 锁定兼容运行时、包管理器、直接依赖与脚本；Node 24.22.0、pnpm 10.22.0、Docusaurus 3.10.2、React 19.3.1、TypeScript 5.9.3 |
| `docusaurus.config.ts`、`tsconfig.json`、`sidebars.ts` | 单站点配置、严格类型、两篇导航与内容插件选择 |
| `src/pages/index.tsx` | 最小首页和可用文档入口 |
| `src/components/DocsPreparing/index.tsx` | none 模式的准备说明，复用站点布局 |
| `plugins/docs-placeholder/index.ts` | 仅 none 模式注册 `/docs`，不引入 Mock 模块 |
| `src/lib/build-mode.ts` | 解析/验证构建参数，决定文档来源和可用路由 |
| `src/theme/Footer/index.tsx` | 文档保留既定双层 Footer；门户目标采用最新首页四组导航 |
| `src/components/BrandLogo/index.tsx` | Header 原始组合 Logo 呈现；Footer 使用各自页面的文字／图标品牌 |
| `src/theme/Root/index.tsx` | 共享根包装；不渲染全局示例提示条，不复制整套主题 |
| `src/components/ReadingDisclosure/index.tsx` | 原生折叠区域，Escape 关闭与跨断点焦点恢复 |
| `src/components/ThemeModeSwitch/index.tsx` | 接入 Docusaurus 公开主题 API 的太阳／月亮按钮 |
| `src/css/custom.css`、`src/css/docs.css` | 全局样式映射和文档阅读样式，响应式与双主题 |
| `design/tokens.json`、`scripts/generate-tokens.ts` | 唯一视觉变量源及生成脚本，输出 `src/css/tokens.css`；生成文件不人工修改 |
| `tests/fixtures/docs/overview.md` | 第一篇 Mock，id 为 `example-overview` |
| `tests/fixtures/docs/quickstart.md` | 第二篇 Mock，id 为 `example-quickstart` |
| `scripts/prepare-docs.ts`、`scripts/check-docs.ts` | 模式选择、暂存、元数据/正文/链接校验 |
| `scripts/build-site.ts`、`scripts/check-artifacts.ts` | 清理、生成、构建、产物检查与用途记录 |
| `tests/unit/docs-source.test.ts`、`tests/unit/docs-content.test.ts` | 模式隔离、非法输入、内容拒绝规则、残留防护 |
| `tests/e2e/docs.spec.ts`、`tests/e2e/theme.spec.ts` | 导航、代码复制、无脚本阅读、主题与响应式 |
| `infra/docker/Dockerfile`、`infra/docker/nginx.conf` | 验证构建产物直接访问、刷新和真实 404 的本地静态服务 |
| CI 配置、`.gitignore`、`README.md` | 仓库平台对应的实际检查和运行说明；忽略 `.generated/`、`.docusaurus/`、`build/` 及测试产物 |

`src/lib/prepared-input.ts` 验证暂存清单与文件哈希，防止绕过包装脚本使用错误来源；`scripts/package.json` 单独限定 CLI 的 ESM 模块范围。导航、文档布局和复制按钮在 `src/theme/` 做小范围适配，正文渲染、侧栏条目、目录和前后篇仍复用 Docusaurus。复制按钮依赖固定版本的内部上下文，升级框架时需复验。

`.generated/docs/` 是脚本输出，不提交、不手工编辑。默认两篇无图片依赖，先验证文本阅读，避免为 Mock 引入无来源的图片或外部字体。主题 CSS 不反向修改内容文件。

## 4 两篇 Mock 的编写要求

### 4.1 认识 ModelSphere

| 项目 | 要求 |
| --- | --- |
| 文件 | `tests/fixtures/docs/overview.md` |
| 元数据 | `id: example-overview`、`title: 认识 ModelSphere`、`slug: /`、`sidebar_position: 1` |
| 正文规模 | 约 600–900 个中文字符，正文从二级标题开始；页面标题由文档模板提供 |
| 二级章节 | 文档说明、核心概念、一次请求的示意流程、如何继续阅读 |
| 内容结构 | 开场说明、3–4 个概念的术语表、5 步有序列表、一条提示、下一篇链接 |
| 前后篇 | 无上一篇；下一篇为快速开始示例 |

正文说明本篇用于验证文档体验。术语可以使用模型、推理引擎、部署配方、测评报告；只做概念解释。请求流程标为帮助理解的示意，不描述未经核验的内部执行保证。不得写入具体性能成绩、支持硬件清单或已投产承诺。

第一篇通过相对 Markdown 链接引用 `quickstart.md`，验证构建后的站内地址；不要手工拼接仅在开发服务器可用的路径。

### 4.2 快速开始示例

| 项目 | 要求 |
| --- | --- |
| 文件 | `tests/fixtures/docs/quickstart.md` |
| 元数据 | `id: example-quickstart`、`title: 快速开始（示例）`、`slug: /quickstart`、`sidebar_position: 2` |
| 正文规模 | 约 800–1200 个中文字符，正文从二级标题开始 |
| 二级章节 | 使用前说明、环境信息示例、配置示例、操作步骤、结果核对、常见问题 |
| 内容结构 | 一条醒目警告、环境信息表、一个 YAML 代码块、三个编号步骤、检查列表、两个问题与回答 |
| 前后篇 | 上一篇为认识 ModelSphere；无下一篇 |

配置仅演示命名、字段和值的排版，不对应实际 API 或 Kubernetes 资源。使用下面这类最小样例，代码前后均说明“不可直接用于部署”：

```yaml
# 仅为文档界面示例，不是 ModelSphere 部署配置
exampleOnly: true
name: sample-inference-demo
model: placeholder-model
purpose: documentation-preview
```

三个步骤为阅读环境信息、查看并复制示例、核对阅读与代码内容；不提供虚构的 Helm 仓库、镜像、安装命令或成功日志。结果核对解释如何确认复制内容完整，不声称服务已经启动。常见问题至少说明“为什么不能直接部署”和“复制失败如何手动选取”。

提示块使用 Docusaurus 的受控 `note / info / warning` 语法，只允许静态文字与普通 Markdown。其语法由内置内容管线渲染，不允许作者写 React 或原始 HTML。[官方提示块说明](https://docusaurus.io/docs/markdown-features/admonitions)。

### 4.3 内容校验规则

- 只接收这两个明确路径的 `.md` 文件，id 必须唯一且以 `example-` 开头；重复 slug、缺少标题、错误前后篇引用均报错。
- `markdown.format: 'md'`；在 AST 层拒绝可执行 import、JSX、原始 HTML 和表达式，保留代码围栏里的纯文本样例。受控提示块单独列入允许语法。
- 校验相对 Markdown 链接、页面锚点和 URL 协议；本轮无需外部图片，不能读取源目录外文件或跟随符号链接。
- 第一篇标题只生成一个 h1；第二篇同理。目录收录 h2/h3，标题 id 在构建时可确定；长代码和表格不能撑宽整页。
- 正式检查按来源路径、文档 id、示例唯一标识与输出内容综合判断，不以是否含英文“mock”作为唯一排除依据。

## 5 阅读布局与主题接入

直接使用 Docusaurus 标准文档组件，优先通过 tokens、正文 CSS 和配置调整。只在图标主题切换及断点行为无法由配置满足时做小范围包装，不重写 Markdown 渲染器、侧栏或目录系统。

| 区域 | 实现要求 |
| --- | --- |
| 顶部导航 | 品牌返回 `/`；“文档指南”进入 `/docs`；提供图标主题切换，未实现栏目不输出空链接 |
| 桌面阅读 | ≥1280px 左侧文档导航、中央正文、右侧 h2/h3 目录；正文上限 72ch/760px，具体值引用基础规范 |
| 平板与手机 | <1280px 导航与目录可折叠；<768px 正文单列；不沿用框架默认断点造成两套规则 |
| 当前文档 | 侧栏当前项有文字/底色与 aria-current；前后篇遵循真实顺序 |
| 代码块 | YAML 高亮、完整原文复制、成功 2 秒反馈、失败说明；按钮不覆盖或随代码横向滚动 |
| 表格与长内容 | 仅自身局部滚动；文本自然换行；保留滚动条与可访问名称 |
| 主题 | system/light/dark 偏好与实际主题分离，复用 Docusaurus provider；切换不重挂载正文或跳动阅读位置 |
| 无脚本与减少动效 | 正文、文档链接、前后篇可用；折叠菜单须有可达回退；无效复制和主题控件隐藏；无装饰入场 |

所有视觉数值引用[设计基础](../design/foundations.md)，不在本方案复制色表。浅色、深色分别覆盖普通代码、提示、表格、焦点、当前项和禁用状态。系统偏好、存储失败及首帧初始化按[主题状态契约](../design/interactions.md#21-全站主题切换)实现。

## 6 实施顺序

| 步骤 | 工作 | 完成条件 |
| --- | --- | --- |
| 1 工程骨架 | 验证兼容版本，锁定 Node/pnpm/依赖；建立最小站点、静态服务和真实 CI | 干净安装可复现；根路径和未知路径行为正确；无默认教程残留 |
| 2 内容模式 | 实现参数校验、干净暂存与条件路由，先做 none 模式 | `/docs` 仅准备页；release + mock 被拒绝；根目录内部规范未被导入 |
| 3 两篇内容 | 按第 4 节编写 Mock，启用文档插件和明确侧栏顺序 | 两篇完整可读；相对链接、目录、前后篇正确，未增加第三篇占位内容 |
| 4 样式与主题 | 映射 tokens、正文样式与图标切换；对齐统一断点 | 浅深阅读完整，主题切换无首帧闪烁、内容位移或状态重置 |
| 5 交互与降级 | 复制反馈、键盘焦点、移动导航、锚点偏移、无脚本回退 | 纯键盘可遍历；减少动效和资源失败不阻断阅读 |
| 6 构建与检查 | 连续构建 mock 预览和 release + none，运行单测与静态服务端到端检查 | 正式产物不存在 Mock 正文或资源；预览两篇可直接访问和刷新；404 返回真实状态 |
| 7 交付 | 提供本地启动方式、截图、验证结果及当前限制 | 用户能打开两篇，确认浅深主题和阅读交互；如有 PR，按最终 SHA 核验远程 CI |

本轮文档试点优先于博客/Catalog 的实现；这只调整实施先后，不改变后续模块的功能范围。不得以文档已完成代替全站已完成。

## 7 运行命令与检查契约

下列命令已在 `package.json` 实现。构建用途和文档模式由包装脚本固定；release 必须由环境显式提供 `SITE_ORIGIN`，本机预览默认使用 localhost。

| 命令 | 行为 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 安装当前仓库声明的依赖，不借用其他仓库 node_modules |
| `pnpm dev:docs` | 固定 local + mock，准备两篇后启动本地预览，默认只监听回环地址 |
| `pnpm build:docs-preview` | 固定 preview + mock，清理并输出到 `build/`；仅本地构建，不自动对外发布 |
| `pnpm build` | 正式用途固定 release + none；检测到外部 mock 模式请求时报错，执行内容和产物检查 |
| `pnpm content:check` | 按当前明确模式校验文档、链接及允许语法 |
| `pnpm artifacts:check` | 接受 CI 明确指定的用途，核对构建记录；release 检查不得被产物自报 preview 绕过 |
| `pnpm format:check`、`pnpm lint`、`pnpm typecheck` | 检查配置、脚本、主题及正文相关源码 |
| `pnpm test` | 执行有断言的模式隔离和内容校验单测；零测试失败 |
| `pnpm test:e2e` | 提供 `E2E_BASE_URL` 时在对应 Nginx 服务上验证；不提供时仅启动本地 Node 静态回退服务，不能算作 Nginx 验收 |

CI 使用同一精确运行时和冻结依赖安装。不同构建用途使用隔离工作目录或串行清理执行，不能并行共用 `.generated/`、`.docusaurus/` 和 `build/`。检查报告保存构建用途、代码 SHA、浏览器版本和产物指纹；构建记录保存在内部报告目录，不整体公开到网站。

release + none 的构建测试使用 CI 明确提供的测试 origin，仅用于验证，不能据此声称拥有正式域名或已经部署。单测覆盖实际边界，不增加只镜像 CSS 数值的测试。

## 8 验收清单

| 编号 | 操作或场景 | 通过条件 |
| --- | --- | --- |
| DOC01 | 打开 `/docs`，切换到 `/docs/quickstart`，刷新两页 | Mock 模式下分别显示对应完整正文；标题、侧栏与前后篇一致 |
| DOC02 | 点击 h2/h3 目录与正文链接，前进后退 | 目标标题不被 Header 遮挡；无断链或重复跳转 |
| DOC03 | 复制 YAML，模拟剪贴板失败 | 成功取得原始代码；失败允许手动选择，焦点与页面位置不变 |
| DOC04 | 纯键盘访问菜单、侧栏、目录和主题选择 | 可访问名称完整；焦点可见；关闭区域没有隐藏焦点 |
| DOC05 | 首访系统浅/深色，运行中改变系统，手动覆盖 | 初始主题正确；未手选时跟随系统变化；手选后刷新与跨页保持偏好 |
| DOC06 | 滚到正文中部切换主题，禁用存储再切换 | 正文与阅读位置不变，无 hydration 警告；存储失败不阻断操作 |
| DOC07 | 390px、767/768px、1279/1280px、1440px，另测 320px | 指定断点正确，长代码/表格局部滚动，无整页溢出；浅深各保留手机与桌面截图 |
| DOC08 | 200% 文字、减少动效、禁用 JS、字体失败 | 核心正文和原生链接仍可用；不能依赖脚本才解除正文隐藏 |
| DOC09 | 修改标题/目录链接、制造重复 slug 或非法内容 | 校验明确指出文件与原因，构建非零退出，不静默丢文档 |
| DOC10 | 先构建 Mock，再构建 release + none | `/docs` 变为准备页；第二篇为真实 404；HTML、JS、CSS 关联资源、source map 和站点地图无 Mock 内容 |
| DOC11 | 请求 release + mock 或绕过包装器构建 | 配置阶段拒绝；没有可被误发布的新候选产物 |
| DOC12 | 检查输出与网络请求 | 内部规范未公开；不依赖 Google Fonts、外部脚本或未声明的数据服务；搜索入口未启用 |

本轮不宣称已完成真实文档同步或搜索验证。后续接入真实 Markdown 仓库时追加固定 commit、图片、跨文档链接与索引同版测试。

代码交付需记录 PR 链接（如有）、最终完整 SHA、单测及其他 CI 的实际结论和运行链接。推送后等待当前提交的所有适用检查，核对单测步骤确实执行；没有 PR 时明确“仅本地验证，未推送／未验证远程 CI”。本实施文档的本地校验不代替应用测试。

## 9 后续真实文档接入

真实仓库就绪后，新增 `content/docs-source.lock.json` 并锁定完整 commit，实施 repository 模式。同步器校验正文与资源后仍写入 `.generated/docs/`；文档插件、路由外观和主题继续复用。

正式侧栏从批准的真实内容建立，不保留 example id 或复制 Mock 充当正式文档。快速开始链接在真实目标存在后启用，再接入自托管搜索。文档和门户仍统一构建、发布与回滚；Mock 留在测试 fixture 中供回归使用。


## 10 本轮交付与本地验证记录

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
