# ModelSphere 官网工程与代码生成规范

当前内容源：正式技术文档在本仓库 `content/docs/` 维护，开发、预览、正式构建默认读取并自动生成侧栏和搜索；独立文档仓库同步仍未接入。`DOCS_SOURCE_MODE=none` 关闭文档正文，显式 mock 来源仅用于固定示例回归。博客公开示例继续由 `SITE_PUBLISH_EXAMPLES` 控制，社区示例和草稿仍排除；内部规范不作为公开技术文档。具体新增规则以[技术文档实施与维护规范](docs-implementation.md)为准，覆盖下文旧的独立仓库计划及文档准备页描述。

| 属性 | 内容 |
| --- | --- |
| 状态 | 当前开发准则；Docusaurus 统一全站与 Markdown/Git 博客已确认；首页、博客与文档栏目试点已实现，其他业务模块待实施 |
| 更新日期 | 2026-10-21 |
| 配套规范 | [设计基础](../design/foundations.md)、[组件契约](../design/components.md)、[页面契约](../design/page-contracts.md)、[内容与证据](../design/content-policy.md)、[交互规范](../design/interactions.md)、[动效与加载模块](../design/interactions/motion-and-loading.md) |
| 范围 | 统一站点、Git 内容维护、Catalog 独立数据、静态部署与验证 |

官网采用 Docusaurus + React + TypeScript。门户页面与 Model Catalog 使用自定义 React 组件；博客通过 Markdown/Git 编辑发布；开发者文档从独立 Markdown 仓库同步指定 commit，进入同一站点的 `/docs` 栏目。

门户、博客、文档统一构建为静态文件，首期从公开仓库通过 GitHub Actions 发布到 GitHub Pages 项目地址。Nginx 镜像用于本地和 CI 验收，Kubernetes 保留为后续迁移选项。Catalog 首期按用户决定由浏览器直接读取公开 Model Catalog，来源地址集中配置，数据更新不要求重新发布网站。首期没有内容后台、数据库、对象存储上传流程或自建发布任务队列。

本文件只保留当前规则。博客实现及内容维护见[博客功能说明](blog-implementation.md)，Catalog 公开数据接入和信息边界见[目录实施清单](catalog-implementation.md)。文档栏目已建立应用、构建脚本、本地 Nginx 验证与 CI 配置；文档范围以[文档栏目实施方案](docs-implementation.md)为准。下列全站目录、命令和部署参数仍包含后续契约，不表示真实内容同步、远程 CI 或生产环境已经完成。

## 1 工程决策

| 编号 | 工程方案 | 约束 |
| --- | --- | --- |
| G01 | 一个 Docusaurus 应用、一个锁文件、一个网站发布产物 | 首期不建立多应用 workspace；模块按目录组织 |
| G02 | React + TypeScript 自定义门户与 Catalog | 品牌视觉遵循既有规范；文档使用标准侧栏和正文布局 |
| G03 | 博客和官网文案通过 Git 维护 | Markdown 正文、frontmatter 元数据、图片随提交管理；不建设编辑后台 |
| G04 | 开发者文档独立内容仓库、统一网站构建 | 固定完整 commit，同步为只读构建输入；内容独立维护不等于独立部署 |
| G05 | PR 检查和预览，合并后构建正式候选 | 对实际合并 SHA 重新验证，按 digest 提升同一候选镜像；失败保留旧站 |
| G06 | Catalog 数据独立更新 | 自定义界面覆盖源功能；不嵌入 `<model-catalog>` 或 iframe |
| G07 | 字体、脚本和搜索自托管；Catalog 首期例外 | Catalog 直接使用公开 GitHub Pages/raw GitHub，后续再接自有服务 |
| G08 | 静态站点明确能力边界 | 无逐请求服务端渲染；Catalog 最新详情依赖 JavaScript；博客和文档正文无脚本可读 |
| G09 | 首期仅中文，不生成空版本或翻译 | 当前没有真实开发者文档，公开仅展示准备状态 |

Docusaurus 支持自定义 React 页面、文档和博客内容插件，生产构建输出静态文件。职责依据：[页面](https://docusaurus.io/docs/creating-pages)、[路由](https://docusaurus.io/docs/advanced/routing)、[部署](https://docusaurus.io/docs/deployment)。选择静态部署不代表 Catalog 只能使用构建时数据。

## 2 工程目录与依赖方向

以下同时包含已落地的文档试点和后续业务模块路径；具体实现状态以[文档栏目实施方案](docs-implementation.md)为准。根目录 `docs/` 继续保存工程和设计规范，不能被文档插件自动发布。

```text
docusaurus.config.ts           全站配置、内容插件、主题和路由
sidebars.ts                    开发者文档导航
package.json                   依赖及验证命令
pnpm-lock.yaml                 唯一依赖锁文件
src/
  pages/                       首页、架构、社区、Catalog 固定页面
  components/                  共享展示组件
  features/catalog/            查询、详情、历史、数据适配与加载状态
  features/blog/               博客列表、摘要索引与 I05 查询逻辑
  theme/                       必要的导航与博客组件定制
  css/                         tokens、全局样式与正文样式
  lib/                         运行时 schema、URL 查询与来源校验
plugins/                       内容校验、摘要索引与数据快照接入
content/
  blog/                        文章目录，每篇 index.md 与相对图片
  pages/                       官网文案、页面配置、分类与证据
  docs-source.lock.json        文档仓库地址、完整 commit、内容子目录
  catalog-baseline.lock.json   可公开 Catalog 基线版本及校验值
.generated/                    文档与合格内容暂存；忽略提交，不人工编辑
static/                        已审核公共资源；禁止存放草稿和私有资料
scripts/                       同步、校验、构建与发布辅助脚本
design/tokens.json             已确认视觉变量的唯一源
infra/docker/                  构建与 Nginx 静态服务镜像定义
infra/kubernetes/              网站与预览部署配置
tests/                         单测、集成、端到端及隔离 fixture
docs/                          工程、设计规范及运行手册
```

- Docusaurus docs 插件只读取 `.generated/docs/`；blog 插件只读取 `.generated/blog/`。暂存步骤只复制可发布正文及引用资源，不复制整个源仓库。
- `src/pages` 不重复声明插件负责的 `/blog` 或 `/docs` 路由。正式构建无真实文档时禁用 docs 插件并使用 `/docs` 准备页；本地或受控 Mock 预览可以启用插件读取隔离样例，规则见[文档栏目实施方案](docs-implementation.md)。同一构建仅由一个入口注册 `/docs`。
- Catalog 页面通过适配器读取 DTO；通用展示组件不自行请求数据。查询纯函数不依赖网络、DOM 或构建环境。
- 博客摘要索引只包含列表所需字段，不能导入全部文章正文模块充当列表数据。
- `.generated/` 每次构建使用干净目录；文档来源仓库只有内容权限，不允许注入网站插件、脚本、依赖或配置。
- 网站不持有数据库密钥、仓库写入凭据或 Catalog 写权限。仓库拉取凭据仅在受控构建步骤使用。

## 3 依赖与编码规则

当前文档试点锁定 Node.js 24.22.0、pnpm 10.22.0、Docusaurus 3.10.2、React 19.3.1、TypeScript 5.9.3，分别由版本文件、`package.json`、锁文件、CI 和 Docker 保持一致。后续接入搜索插件或升级时验证兼容组合；直接依赖锁定精确版本，提交锁文件并使用冻结安装。不得忽略 peer dependency 冲突。

| 用途 | 工程约定 |
| --- | --- |
| 类型与边界 | TypeScript strict；Zod 校验源数据、frontmatter 与配置，不使用 `any` 跳过边界 |
| 正文 | Docusaurus 内容管线；`markdown.format: 'md'`，内容只接受 `.md`，拒绝原始 HTML、JSX、import 和执行表达式 |
| 内容安全 | 解析 AST 校验语法、链接协议与图片路径；普通 Markdown 模式本身不代替内容检查；代码围栏作为文本 |
| 样式 | CSS 变量与 CSS Modules；不因换框架改变已确认视觉值；首期不增加 UI 组件库 |
| 搜索 | Header 用本站静态索引搜索已发布文档和站内博客全文；博客列表保留独立字段匹配 |
| 工具 | ESLint、Prettier、Vitest、Testing Library、Playwright；测试依赖由本仓库声明 |

浏览器专用 API 仅在客户端初始化后调用；静态生成期间不得访问 `window`。首次客户端渲染与预生成 HTML 保持一致，随后读取查询参数并增强交互。不要通过全页客户端渲染规避构建错误而丢失正文。

只做必要的主题包装和组件替换，避免复制整套主题源码。版本升级需验证自定义主题、路由、Markdown 管线、搜索及构建产物。[Markdown 配置](https://docusaurus.io/docs/api/docusaurus-config#markdown)。

## 4 门户、博客与文档

### 4.1 页面与路由

门户使用自定义 React 页面，按当前 Stitch 项目对应的页面契约、双主题 tokens、组件职责、键盘操作和减少动效规范实现。文档与门户共用站点导航和品牌配置，文档正文保留标准阅读布局，不添加营销入场动画。

全站同域部署，`baseUrl` 由 `SITE_BASE_URL` 提供，默认 `/`，首期 Pages 为 `/modelsphere-website/`；`trailingSlash: false`，中文无语言前缀。域名由 `SITE_ORIGIN` 提供，不能包含路径；非根页面不带尾斜杠。站内资源与路由必须保留项目目录，应用内部查询和返回地址保持应用相对路径。Nginx 按实际构建文件布局查找文件，未知路径返回真实 HTTP 404，不配置全站回退到首页。验证 `.html` 或目录索引实际输出，不凭开发服务器推定生产路由行为。

博客详情 `/blog/{slug}`、文档 `/docs/{docSlug}` 预生成；Catalog 使用固定的 `/models`、`/models/detail`、`/models/recipe` 页面，模型和配方身份放在查询参数中，详见第 5 节。

### 4.1.1 统一主题与视觉接入

- 页面结构仅依据 [Stitch 项目 3601238558355976464](https://stitch.withgoogle.com/projects/3601238558355976464) 顶部的“首页-更新”“模型目录”“博客洞见-更新”三张；底部旧稿仅作 dark mode 色彩参考，不继承旧页面结构。Header 继续由 [项目 14815301483114557678](https://stitch.withgoogle.com/projects/14815301483114557678) 覆盖，已实现文档双层 Footer 保留为既定特例；其余按当前组件和页面契约。同一 DOM/字体/尺寸支持浅色与深色。
- 全站统一使用 Space Grotesk / Geist / JetBrains Mono；Header 的 Inter 为既定特例，不按 Catalog 源 HTML 另设 Plus Jakarta Sans / Inter 字体体系。门户 Footer 统一为“开源代码／社区与生态／开发者资源／法律与开源”，博客入口仅放“社区与生态”。
- Classic theme 配置基线为 `colorMode: {defaultMode: 'light', disableSwitch: false, respectPrefersColorScheme: true}`；参见 [Docusaurus 官方 color-mode 配置](https://docusaurus.io/docs/api/themes/configuration#color-mode)。ThemeModeSwitch 使用公开 provider 接入太阳／月亮按钮，首访跟随系统，点击后保存 light/dark，不显示三态下拉框。
- 偏好 `system/light/dark` 与解析后的 `light/dark` 分离；通过 Docusaurus provider 的公开能力设置手动覆盖，不硬编码内部 storage key 或再建独立存储。系统变化只作用于 system 模式，存储受限降级为会话偏好。
- 根节点首帧初始化、data-theme、color-scheme 和 hydration 一起验证；不能依赖页面挂载后的 effect 才纠正白屏。无脚本以 CSS 系统主题回退，隐藏失效切换控件；不承诺恢复无法读取的存储偏好。
- `design/tokens.json` 作为唯一变量源，映射到 Docusaurus/Infima、自定义 React、Prism 与 SVG/图表；导航、博客、文档、搜索、Catalog 和 404 都覆盖，主题切换不 remount 页面或重取业务数据。
- Logo 可配置官方支持的 `srcDark`，其他媒体遵循 MediaSpec；字体、两主题素材和高亮资源本地交付。不得直接使用 Stitch HTML 中的 Tailwind CDN、Google Fonts、全局隐藏滚动条或固定画布尺寸。
- 内容索引、Catalog 请求及 URL 不含主题差异；主题仅改变呈现。首页能力区四卡同时展开，不实现四项能力标签切换；博客阅读辅助与主题选择按 D12 及页面契约实现。

首页区块按 `hero → 四张能力卡 → 断流续写 → SLO → Tuning-Agent → 最多四条合格测评 → 渐变 CTA` 排列。Hero 固定呈现单一架构图，入口为真实可用的 Quickstart、GitHub 与 Catalog，允许这三项入口，不预置监控／架构双标签。不强制增加五步请求、三类受众或文章网格；缺少合格证据时按内容规范隐藏对应测评，不补造数据。

### 4.2 博客 Markdown 与列表

文章在 `content/blog/<id>/index.md` 中维护，图片使用同目录相对引用。从既有 `.md` 开始时将文件及图片加入 Git，按内容规范补齐 frontmatter；没有后台上传或导入按钮。版本历史由 Git 记录，首期不支持定时发布。

Docusaurus blog 插件负责文章详情与正文；通过 `blogListComponent` 定制 `/blog` 列表，设置 `postsPerPage: 'ALL'`、`archiveBasePath: null`，分页由站点统一的查询逻辑处理，不再创建同路径页面。插件配置和自定义列表必须经过实际构建验证。[博客插件](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-blog)。

- `/blog` 优先展示推荐文章，不另加独立视觉 hero；页面保留可访问的 h1，可视觉隐藏。分类、标签、搜索及可选微信／知乎侧栏按页面契约实现；未配置真实目标或资源时隐藏对应侧栏模块。
- 构建期从合格文章生成精简摘要索引，初始索引包含标题、摘要、作者、技术关键词、PR 引用、分类、`tagIds` 及其标签名等列表与查询所需字段；`q` 匹配标题、摘要、作者、关键词、标签名及 PR 编号／`owner/repo#编号`，`tag` 与分类采用 AND 组合。插件列表不得导入全文或正文组件，不以隐藏正文代替摘要加载。
- 封面无已审核裁剪预览时使用 contain；有已审核预览时才按推荐位 16:9、列表位 3:2 裁剪并保留焦点。文章正文保留完整图片，卡片悬停不缩放封面。
- 无脚本 HTML 包含全部已发布摘要及原生链接；增强成功后按每页 12 条展示，禁止脚本失败导致列表消失。
- 保留 I05：无筛选时所有分页排除推荐文章，推荐区仅第一页展示；有筛选时从全部文章匹配。排序为发布日期降序、同日 id 升序。
- 博客推荐、相关文章、博客搜索、RSS（如启用）和站点地图使用同一公开内容集合，排除草稿、示例和撤回内容。
- 5,000 篇文章作为容量验证样本；摘要 gzip 后初始预算 2 MiB。超限时报告并修订索引方案，不偷偷取消完整无脚本列表。
- 文章正文、目录和基础导航预生成 HTML；详情 slug 变更需显式重定向；撤回后详情返回 404。

### 4.3 开发者文档同步

开发者继续通过独立 Markdown 仓库维护正文和图片。网站仓库的 `content/docs-source.lock.json` 固定仓库、完整 commit 和内容子目录。同步脚本按该提交拉取并校验，不从浮动分支临时读取最新内容。

文档源合并后，由维护者更新网站锁定文件并提交 PR；首期不假定跨仓库 webhook 已存在。网站合并后统一构建和部署，因此文档、博客、门户具有相同的网站 release；文档内容 commit 另行保留用于追溯。文档构建失败阻止整个候选上线，线上旧站保持可用。

- 内容目录与 Markdown 文件约定由文档源维护；图片、相对链接和 slug 在同步时校验；超出源目录的路径和符号链接拒绝导入。
- 侧栏、正文、标题目录、代码块、前后篇和搜索采用标准文档能力；搜索索引随站点镜像交付，不依赖外部搜索服务。
- 无真实文档时 `/docs` 为“文档准备中”，不进入搜索和站点地图，不生成假的快速开始；`docsQuickstartHref` 等仅在真实目标存在时启用。
- 不复制样例为正式文档，不预造多版本和多语言目录。fixture 只用于测试和受控预览。
- 文档试点的两篇 Mock、标准阅读与双主题已完成；Header 全站搜索现由 `plugins/search` 接入。索引只读取实际公开的暂存内容，排除草稿、未列出页面和站外文章；以内容 hash 命名并随镜像交付，首次打开搜索时加载，失败可重试。真实仓库同步仍待接入。

## 5 Model Catalog 自定义界面与独立数据

功能基线为现有 [Model Catalog](https://modelsphere.github.io/model-catalog/) 及其[源码仓库](https://github.com/modelsphere/model-catalog)。实现前对实际源码和协议建立逐项映射，覆盖模型/配方视图、搜索、家族/引擎/标签/硬件多选/拓扑筛选、排序、卡片与表格、详情、配方历史、配置复制、报告和测试条件。新稿未展示的模型视图、拓扑筛选、历史及详情等属于保留的工程功能补充，不因画面缺少入口而删减。

目录默认 `view=recipes`、`layout=cards`、`sort=improvement-desc`。搜索 `q` 包含配方、模型、容器镜像和硬件字段；首期排序使用明确标为引用的源记录百分比，每条保留负载和测量版本；缺失值置后，最后按稳定 id 排列。该顺序不代表同条件或跨模型绝对性能排名，具体 URL 与字段契约按页面和内容规范。

### 5.1 数据与版本

- 本期数据源为现有公开 Model Catalog；集中配置 `content/catalog/source.json`，不改变上游汇总和发布链路，不新增同步流水线、数据库或自托管数据服务。
- 索引直接读取 `index-v2.json`；配方按 commit 获取并校验 digest；历史清单校验归属并截取到所选配方 digest；报告读取固定目录 commit 的 HTML，仅解析白名单 JSON 字段，不执行上游脚本。
- 目录先使用构建基线输出 HTML，再读取当前数据；失败保留标明版本的基线。公开源没有任意历史目录完整快照接口，固定版本仅在基线、当前和当前访问会话缓存可用时提供；不可用明确报错，不切到其他版本。
- 列表跳转详情保留 `dataVersion`；查询请求取消和归属校验防止乱序覆盖。数据来源版本与官网代码版本分别记录，不伪造 `current.json/releases` 已部署能力。
- 配方卡片以配方 ID 为标题并进入配方详情，独立模型字段进入模型详情；模型视图使用独立模型卡片，展示模型简介、全部配方及“调优配方最佳提升”和对应 baseline、负载、测量版本。排序仅按来源记录值，无值置后，并非统一吞吐性能排名；模型最佳提升只描述具体调优记录，不作为模型通用性能。统计口径与五张统计卡以信息可靠性清单为准。
- 来源、缺省、缺失与具体字段的限制见 [信息可靠性清单](catalog-implementation.md)。
- 后续可切换到自托管数据源，也可改版独立 model-catalog 并由官网直接跳转；本期不预建这些服务。

### 5.2 静态详情路由

| 页面 | 地址 | 行为 |
| --- | --- | --- |
| 目录 | `/models` | 字段筛选、视图、排序和分页由 URL 驱动 |
| 模型详情 | `/models/detail?modelId={id}&dataVersion={version}` | 读取指定模型；省略 dataVersion 时解析当前公开版本 |
| 配方详情 | `/models/recipe?modelId={id}&recipeId={id}&version={recipeVersion}&dataVersion={version}` | 精确配方与可选历史版本；无 version 时读取解析到的数据版本内当前配方 |
| 配方标签 | `/models/recipe?modelId={id}&recipeId={id}&tab={tab}&dataVersion={version}` | deployment（默认）、performance、history；报告在性能 Tab 按需加载 |

模型和配方页使用 `returnTo` 传递原目录查询，仅接受站内 `/models` 地址，返回时恢复筛选、视图、排序和页码。配方 Tab 切换保留配置 `version`、目录 `dataVersion` 和返回上下文，支持刷新及前进后退；配置版本与报告实际测量版本分别标注。旧 `/models/report`、目录 `benchmark` 参数和配方 `#benchmark` 地址使用 history.replace 转到配方性能 Tab，返回地址剔除旧报告选择。

固定页面均在构建时生成。新增模型无需添加网站路径或重建博客即可直接访问、刷新；参数使用 URLSearchParams 编码，不能手拼未编码 id。页面与数据源都验证模型和配方归属。

静态服务器对有效详情页面返回 200，无法根据查询参数判断模型是否存在。参数缺失、记录不存在或数据不可用由页面分别提示；数据服务返回正确错误信息，但不把页面提示宣传为 HTTP 404。未知网站路径、未知博客和文档仍返回真正的 404。详情参数页不加入站点地图，预生成页设置 noindex；首期不承诺每个动态模型独立搜索收录或分享预览图。

### 5.3 无脚本与加载降级

`/models` 构建时读取固定的公开基线快照，输出精简目录、数据版本和时间；没有可用基线时显示“目录数据暂未就绪”，不把故障伪装为空目录。客户端增强后读取当前数据，明确展示实际版本，失败可保留标明时间的基线供阅读。

博客和文档无脚本可阅读全文；Catalog 无脚本仅保证基线目录可读。模型/配方/报告实时详情提示需要 JavaScript，并提供目录返回入口和已核实的静态来源链接；不能承诺实时详情也在初始 HTML 中。构建后新增记录不会出现在旧基线中，但启用脚本后可查询并打开。

目录以 5,000 条配方验证筛选与按需加载，详情和报告按需读取；这只是测试样本，不代表真实规模。数据更新、请求失败、固定版本不可用和乱序响应都需测试。

## 6 Git 编辑、预览与统一发布

使用 `.github/workflows/ci.yml`：质量检查通过后并行验证根路径与 Pages 路径，两种路径各覆盖 preview/mock、release/none。PR 只检查；`main` 全部检查通过后发布正式产物。权限由 Git 仓库和部署环境控制，不自建账号系统或发布 Web API。

1. 作者在分支修改 Markdown、图片、页面配置，或更新文档源 commit 锁定文件；未完成修改留在分支，不直接改发布分支。
2. PR 执行内容、代码、链接、构建和浏览器检查，归档预览产物与报告；当前不提供 PR 预览地址。作者可自行核对，不额外要求第二人审批；仍遵循实际分支保护。
3. 合并后针对实际合并 SHA 再验证，固定文档源 commit、Catalog 基线、依赖和配置，构建正式候选。PR SHA 与合并 SHA 不同时不能复用旧检查结论。
4. 对正式候选静态产物通过 Nginx 检查页面和资源；Pages 上传同一份已验证的 `build/`，部署时不重新拉内容或重建。预览需要鉴权时保护 HTML、资源和数据，并设置 noindex。
5. 每环境串行发布；切换前核对候选仍是选定提交且未被更新部署取代，禁止较旧的排队任务覆盖新版本。
6. 新版本就绪后切换入口，验证公开路由、资源、版本与 404；成功才标记已上线。发布前失败不替换旧站；发布后验收失败通过修复或 revert PR 重新发布，当前未实现自动回滚。

不将普通编辑器预览等同于真实网站预览；不将 PR 已合并或 CI 已构建视为生产已经上线。正式候选确认由仓库/部署操作记录，不写入可随意填写的 Markdown 审核字段。

### 6.1 发布清单

清单作为 CI 产物归档，不整体复制进静态站点；公开仓库的 Actions 记录与产物不得包含私密信息。当前 `build/version.json` 公开代码 SHA、构建目标与路径；`reports/build.json` 保留构建摘要。下列完整发布清单为后续扩展契约，尚未全部实现。

```typescript
interface SiteReleaseManifest {
  releaseId: string;
  siteCommit: string; // 完整 Git SHA，包含博客、页面配置与代码
  docsSource: { repository: string; commit: string; contentPath: string } | null;
  catalogBaseline: { version: string; sha256: string } | null;
  catalogContractVersion: string;
  lockfileSha256: string;
  configSha256: string;
  artifactSha256: string;
  imageDigest: string;
}
```

数据源实时版本不等同于网站发布版本。一个网站回滚同时恢复门户、博客和文档；不会回滚实时 Catalog。回滚前验证旧网站仍兼容当前数据契约，并检查已撤回内容不得重新出现。

### 6.2 撤回与资源

文章撤回通过 Git 变更使其退出合格内容集合，同时修复推荐和相关引用；重新构建全站。验证文章 HTML、摘要、搜索、RSS、资源和包含正文的 JS 块均不再公开。Git 历史并不提供保密能力，私密内容不得提交到公开仓库。

公开仅提供当前站点产物；保留正常旧代码块供已打开页面使用时，必须识别内容型 bundle、正文和素材。含撤回内容的旧资源立即从公开服务和代理缓存移除，不因资源 hash 存在而长期保留。纯代码/字体可长期缓存，HTML 与可能撤回的内容数据采用可重新验证策略。公开仓库的构建记录遵循仓库可见性，不得包含私密信息；不单独部署历史站点。

用户已下载或第三方转载的副本无法追回。发生内容泄漏时修订历史和删除归档属于额外操作，需按权限规则明确处理，不能把正常撤回描述成清除了 Git 历史。

## 7 部署与配置

| 工作负载 | 首期职责 |
| --- | --- |
| GitHub Pages | 提供已验证的 Docusaurus `build/`；项目路径、HTTPS 与 HTTP 404 |
| 验收 Nginx | 非 root，提供同一产物，支持根路径与项目路径 |
| 后续 Ingress | 迁移 Kubernetes 后配置域名、TLS 与入口 |
| CI 构建与预览 | 安装锁定依赖、固定内容同步、校验、构建和候选部署；凭据不进入镜像 |
| Catalog 数据托管 | 独立版本化文件或只读接口；来源、同步方式和维护方实施前核验 |

首期发布地址为 `https://modelsphere.github.io/modelsphere-website/`，公开仓库使用 Pages 的 GitHub Actions 来源；`github-pages` 环境限制为 `main`。发布任务具有 `pages: write`、`id-token: write`，其余任务仅有内容读取权限。上传通过浏览器验收的 release/none 产物，串行部署前检查 main SHA，发布后核对 `version.json`、路由、资源与 HTTP 404。支持手动运行 main 重试；回滚通过 revert PR 重新发布。Nginx Docker 仍用于验收，Kubernetes 的域名、镜像仓库和命名空间待后续迁移配置；无需 Node.js 生产服务。

| 配置 | 规则 |
| --- | --- |
| `SITE_ORIGIN` | 站点 origin，不含路径；首期 `https://modelsphere.github.io` |
| `SITE_BASE_URL` | 默认 `/`；首期 `/modelsphere-website/`，只允许以 `/` 开始和结束的安全目录 |
| `CATALOG_PUBLIC_BASE_URL`、`CATALOG_CONTRACT_VERSION` | 可公开的自托管只读地址与契约版本；同源优先，跨域须核验 CORS |
| 文档源锁定文件 | 具体仓库、完整 commit、内容路径；拉取凭据通过 CI Secret 注入 |
| Catalog 基线锁定文件 | 版本、来源和 hash；已配置的基线拉取失败必须报错，不悄悄换版本 |
| 预览域名、镜像仓库、命名空间 | 部署配置与受控凭据，不能由 Markdown 内容指定 |

字体、图片、代码高亮、脚本和搜索资源本地打包或自托管；缺少字体时采用既有系统字体回退。首期图片随 Git 和构建交付，不开放上传服务。大文件确需独立存储时再约定接口和持久化，不能默认为已有 S3。

## 8 代码生成与实施顺序

1. 原地维护当前规范，不生成“2.0”副本；设计来源 JSON 保留原始证据，不批量改成实现结论。
2. 首批工程创建兼容依赖、Docusaurus 骨架、内容校验、Nginx 路由和 CI；提供真实可执行命令后再增加业务功能。
3. 当前先执行文档栏目试点，验证两篇隔离 Mock 的阅读与双主题；随后用隔离示例验证一篇博客从 Git 到预览/构建的流程；用一个真实 Catalog 数据样例验证适配、查询详情和构建后新增记录；示例不作为正式内容上线。
4. 开发者文档先约定源格式和同步锁定文件，待真实仓库与内容就绪后接入；网站根目录的设计规范不作为用户文档发布。
5. 再按页面契约实现首页、架构、Catalog、博客和社区；保留 I05，完成全站太阳／月亮主题切换、响应式与减少动效要求，文档沿用标准阅读布局。
6. 改动输入、版本或锁文件后重新构建并验证产物；不沿用旧代码或旧内容的结果。

## 9 验证命令与验收

以下区分已实现的文档试点命令与后续业务契约。本次仅修订规范，未重新执行应用验收；历史本地结果见[文档栏目实施方案第 10 节](docs-implementation.md#10-本轮交付与本地验证记录)。

| 命令 | 当前状态与要求 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 已有依赖和锁文件；干净环境重现依赖 |
| `pnpm format:check`、`pnpm lint`、`pnpm typecheck` | 已实现；覆盖当前配置、脚本和源码，后续业务代码同样纳入 |
| `pnpm test` | 已实现文档试点单测；空测试集不能当作成功，业务功能实施时补对应测试 |
| `pnpm content:sync` | 尚未实现；真实来源接入后按锁定 commit 同步并清理暂存区 |
| `pnpm content:check` | 已实现当前文档模式校验；博客、真实文档和官网内容校验待接入 |
| `pnpm catalog:check` | 尚未实现；核对数据契约、固定样本、版本和基线一致性 |
| `pnpm build` | 已实现 release + none 构建；完整门户与业务模块待接入 |
| `pnpm artifacts:check` | 已实现文档试点产物隔离检查；后续扩展覆盖全站发布集合 |
| `pnpm test:e2e` | 已实现文档试点浏览器检查；Nginx 验收须显式提供实际服务地址 |

必须验证：

- 25 篇文章含 1 篇推荐时，无筛选列表两页各 12 篇，无重复遗漏；筛选后能匹配推荐文章，前进后退恢复条件。
- 无脚本博客完整摘要与文章正文、文档正文可读；Catalog 基线标明版本，实时详情明确提示脚本要求。
- `/models/detail` 和 `/models/recipe` 直接访问、刷新、中文/特殊字符 id 均正确；构建后新增模型可加载；无效 id 展示未找到，数据故障不伪装 404。
- 未知静态路径、已撤回文章和未知文档返回真正 HTTP 404；没有全站首页回退。
- 文档同步固定 commit，正文、图片和搜索同版；更新文档确实生成全站候选，网站回滚同时恢复博客和文档。
- 草稿/fixture 不进入 HTML、客户端模块、图片、搜索、RSS 或站点地图；内容校验拒绝可执行语法及越界路径。
- PR 与合并提交不同时重新检查；失败保留旧版，旧部署任务不能覆盖新版本；正式部署复用已验证 digest。
- Catalog 数据版本独立更新，不改变已发布博客事实引用；固定版本失效、请求乱序和来源异常正确反馈。
- 全站 light/dark 与 system 偏好在冷启动、刷新、跨页、运行中系统变化及存储失败时正确；无错误主题首帧闪烁、hydration 警告或业务状态重置。浅深状态对比度、代码、图表与素材分别验收。
- 阻断海外字体、图片、脚本和数据服务后站点仍按约定工作；手机、键盘、减少动效按交互规范验收。

代码交付报告 PR、最终完整 SHA、单测实际执行结论、其他检查和运行链接。推送后等待当前 head 的所有适用检查并核对 base；本地检查不能代替远程 CI。没有 PR 时明确“仅本地验证，未推送／未验证远程 CI”，不得宣称可合并。

## 10 待接入参数

Node/pnpm/框架精确版本及 `SITE_BUILD_TARGET`、`DOCS_SOURCE_MODE`、`SITE_ORIGIN` 校验已落地；当前支持 none/mock，repository 模式显式报未实现。GitHub Actions 已包含单测、根路径与 Pages 子路径浏览器验收；具体提交的远程结论以对应 Actions 运行记录为准。Header 本地搜索插件已接入；文档内容仓库与 commit、Catalog 真实数据协议/自托管地址/维护方、正式域名、镜像仓库及集群命名空间仍待接入；`CATALOG_PUBLIC_BASE_URL`、`CATALOG_CONTRACT_VERSION` 仍是后续配置契约。这些状态不改变一个网站构建、Git 内容发布和独立 Catalog 数据的决策。

后续《验收与 CI 规范》细化真实检查命令、性能测量环境和生产部署步骤；本次规范修改不代表应用已经实现或部署。
