# ModelSphere 官网

项目名称：`modelsphere-website`。

当前博客与文档展示策略：`SITE_ORIGIN=https://modelsphere.github.io SITE_BASE_URL=/modelsphere-website/ pnpm build` 默认在正式产物中包含 7 篇站内示例博客、1 条站外示例及 2 篇示例文档，同时生成搜索索引。示例保留原有标识与正文说明，不代表实测结论。`SITE_PUBLISH_EXAMPLES=false` 可恢复无示例的正式构建；真实内容预览仍使用 `pnpm dev:blog`。本策略覆盖下文历史验证记录中的 release/none 描述，构建成功不表示已部署。

面向 AI 基础设施、平台、算法与稳定性团队的公开官网，覆盖产品介绍、技术架构、模型目录与测评、快速开始与文档、技术博客、社区与生态。

设计来源：[ModelSphere 推理基础设施官网](https://stitch.withgoogle.com/projects/3601238558355976464)。页面结构仅采用顶部“首页-更新”“模型目录”“博客洞见-更新”三张新版，底部旧稿仅参考 dark mode 色彩；[来源快照](docs/design/sources/stitch-foundations.json)记录当前采用范围与原始证据。Header 的独立来源覆盖和已实现文档双层 Footer 保留为既定特例。当前已实现首页、博客功能与文档栏目试点；博客使用隔离 Mock 预览，真实内容尚未接入，其他门户页面仍待实施。

首页按 hero、四张同时展开的能力卡、断流续写、SLO、Tuning-Agent、最多四条合格测评、渐变 CTA 排列。Catalog 默认显示配方卡片，按源报告记录的最佳负载增幅降序，保留测量版本与口径提示，不表示统一吞吐排名；信息边界见[可靠性清单](docs/development/catalog-implementation.md)。博客推荐文章优先，采用分类、技术标签、搜索与可选社区侧栏；详情由 Markdown 生成独立阅读页。浅深主题共享布局与 Space Grotesk / Geist / JetBrains Mono 字体，Header 的 Inter 为既定例外；开发者文档保留标准阅读格式。

## 当前阶段

已确认采用 **Docusaurus + React + TypeScript 统一全站**，博客首期使用 **Markdown/Git 发布**。门户、博客和开发者文档构建为一个静态站点；Model Catalog 使用自定义 React 界面读取独立数据源。当前已建立 Docusaurus 应用、依赖锁文件和 CI 配置，实现首页、博客列表与阅读页、两篇 Mock 文档及太阳／月亮主题切换。站内 Catalog 现已接入公开源；真实博客内容与文档同步尚未实施。首期选择公开仓库与 GitHub Pages 项目地址；是否已上线以 Actions 发布结果和线上版本为准。

首页按最新首页稿实现六个区块：`hero`、`comparison`、`fault-tolerance`、`qos-scaling`、`autotune-evolution`、`get-started`。完整架构与机制图、说明文字和真实链接均在初始 HTML 中静态输出；首页标题按 D13 整体翻起渐显，引导语与简介从左滑入渐显，架构拓扑正文按 D14 从上向下揭示。屏外能力卡与各机制直接子块分别在自身起点进入 85% 触发线时入场；并排时左右聚合，堆叠时逐卡上移渐显。首屏按钮、技术标签、拓扑标题及其上方三张卡静态可用；架构数据与布局保持稳定，减少动效、无脚本及历史恢复显示最终态。机制说明链接到已核对的项目资料及固定提交，示意曲线明确标注为机制示意。现有资料不足以满足测评报告和完整测试条件要求，因此省略 `benchmarks`，不展示设计稿样例成绩。模型入口进入站内 `/models`，目录读取公开 Catalog 数据；正式 `/docs` 仍显示准备状态，预览构建中的 Mock 文档不发布为真实内容。

技术与发布边界以[工程与代码生成规范](docs/development/engineering.md)为依据；[架构说明](docs/design/architecture.html)、页面、组件、内容及交互规范描述同一套当前设计。修改直接覆盖原文，不保留并行架构副本。

## 已确认的技术组合

| 职责 | 技术与边界 |
| --- | --- |
| 统一网站 | Docusaurus + React + TypeScript，一个应用、锁文件、网站镜像 |
| 门户页面 | 自定义 React 页面与 CSS，遵循当前新稿与双主题规范 |
| Model Catalog | 自定义 React UI，覆盖模型、配方、筛选、历史、测评及报告；不使用 `<model-catalog>` 或 iframe |
| 博客 | 仓库中维护 Markdown、frontmatter 与图片；通过 PR 检查、预览和 Git 合并进入网站发布 |
| 开发者文档 | 独立 Markdown 仓库按固定 commit 同步到 `/docs`，采用标准开发者文档布局，与网站统一构建发布 |
| 搜索 | Header 本地全文搜索覆盖已发布站内文档和博客；博客列表保留独立字段筛选 |
| 部署 | Docusaurus 静态产物 → GitHub Actions → GitHub Pages；Nginx 用于浏览器验收 |
| 内容存储 | Git 管理正文、元数据与图片；首期不引入 CMS、数据库、素材上传服务或自建任务队列 |
| 数据更新 | Catalog 首期直接读取公开源，地址集中配置；博客、门户和文档同版发布与回滚 |
| 资源依赖 | 字体、图片、脚本和搜索本地托管；Catalog 首期按用户决定直接依赖公开源 |

博客由作者或维护者编辑文件、核对预览并按仓库权限发布，不新增第二人审批要求；首期没有产品编辑后台或 `.md` 上传按钮。现有 Markdown 可连同图片加入仓库并按内容规范校验。

Catalog 需覆盖现有 [Model Catalog](https://modelsphere.github.io/model-catalog/) 的功能。首期使用固定详情页面与查询参数，使新增模型无需重建网站即可访问；实时详情依赖 JavaScript，参数对应记录不存在时由页面显示错误，不承诺该情况返回 HTTP 404。无脚本可读构建时的版本化目录基线。

文档内容仓库独立维护，但不独立部署；更新锁定 commit 会重新构建整个网站。当前没有真实文档，`/docs` 显示准备状态，快速开始入口仅在真实内容就绪后启用。网站仓库的 `docs/design` 和 `docs/development` 是内部规范，不能自动发布为开发者文档。

## 保留的产品与工程约束

| 维度 | 要求 |
| --- | --- |
| 维护与交付 | 用户与 AI 共同维护，公开仓库通过 GitHub Actions 发布到 GitHub Pages |
| 发布 | 可以接受几分钟构建；检查实际合并提交，验证同一静态候选后发布；发布前失败保留旧站 |
| 内容规模 | 按千位数验证，具体业务量待确定，不用测试样例冒充真实内容 |
| 访问地区 | 中国大陆与海外；首期中文，跨地区可用不等于承诺统一延迟 |
| 视觉 | 顶部三张新版决定结构，旧稿仅补充深色色彩；全站跟随系统/浅色/深色，文档朴素；保留可访问性、响应式和减少动效 |
| 内容真实性 | 无来源的参数与成绩不发布，示例与正式内容隔离 |

交互维护入口为[动效与加载模块](docs/design/interactions/motion-and-loading.md)，集中维护 M01–M11、D01–D14、L01–L06 和验收矩阵；[交互规范](docs/design/interactions.md)维护通用行为，[来源审阅记录](docs/design/sources/motion-reference-audit.json)保留原始参考。首页实现范围见动效模块第 10 节；文档试点的既有验证范围以[文档栏目实施方案](docs/development/docs-implementation.md)中的交付记录为准。

## 文档审核方式

每次只提交一份规范供用户检查。修改直接覆盖原文件，只保留当前规则，不新增版本副本或在正文保留方案演进记录。用户明确确认后再生成下一份；草案不能作为已批准的代码生成依据。

## 文档审核进度

| 顺序 | 文档 | 当前状态 |
| --- | --- | --- |
| 01 | [设计基础规范](docs/design/foundations.md) | 顶部三张新版与深色色彩参考，统一字体、小圆角和响应式 |
| 02 | [组件契约](docs/design/components.md) | 共享双主题组件、主题选择、模型/配方卡、历史与测试条件 |
| 03 | [页面契约](docs/design/page-contracts.md) | 新版首页顺序、Catalog 配方优先、博客推荐优先与标准文档 |
| 04 | [内容与证据规范](docs/design/content-policy.md) | 明确 Git 内容、Catalog 来源和统一发布边界 |
| 05 | [交互与响应式规范](docs/design/interactions.md) | 图标主题切换、Catalog 查询与提升排序、博客分类/标签分页和响应式 |
| 05.1 | [动效与加载模块](docs/design/interactions/motion-and-loading.md) | 首页五组双侧入场已通过本地复验，旧版本证据独立保留；其余门户待实施 |
| 06 | [工程与代码生成规范](docs/development/engineering.md) | 统一全站与 Git 博客已确认；文档试点工程已建立 |
| 06.1 | [架构说明](docs/design/architecture.html) | 与当前准则一致；部署参数和容量目标待验证 |
| 06.2 | [文档栏目实施方案](docs/development/docs-implementation.md) | 两篇 Mock、文档阅读与双主题已实现；Header 搜索已接入，真实内容后续接入 |
| 07 | 验收与 CI 规范 `docs/development/acceptance.md` | 待生成 |

尚未生成的文档只列出计划路径，不创建空规范。设计变量已落地为 `design/tokens.json`，生成 `src/css/tokens.css`；后续业务数据结构按对应模块实施。

## 后续代码生成依据

代码生成读取已确认的规范、页面内容、设计变量和现有组件清单。设计稿提供视觉参考；与已确认规范冲突时先记录差异，不静默改动规范。

引入应用代码时，需要一并建立依赖声明、可执行验证命令和 CI。每次交付遵守会话中的本地验证、远程 CI 核验及合并授权要求。

## 模型目录

访问 `/models`，浏览模型/配方、筛选、报告、配置和历史；来源配置在 `content/catalog/source.json`，首次 HTML 与失败回退采用带来源摘要的公开快照。首期直接依赖公开源，不建设数据同步服务。完整信息可靠性清单与验证边界见 [模型目录实现](docs/development/catalog-implementation.md)，站内简版见 `/models/evidence`。

## 本地运行博客

运行 `pnpm dev:blog-mock` 后打开 `http://localhost:3000/blog`，查看 7 篇站内 Mock 文章和 1 条站外阅读示例。搜索、分类、标签、文章目录、代码复制与浅深主题均可操作。Mock 不进入正式产物；没有真实内容时正式博客显示空态，未配置的微信与知乎卡片隐藏。

真实文章放入 `content/blog/<id>/index.md`，分类、标签与推荐项在 `content/pages/blog.json` 配置；使用 `pnpm dev:blog` 预览真实内容。格式、发布边界、响应式图片及验证命令见[博客功能与内容维护](docs/development/blog-implementation.md)。

## GitHub Pages 发布

首期地址：[ModelSphere 官网](https://modelsphere.github.io/modelsphere-website/)。仓库设为公开后，源码与提交历史均公开。仓库 Settings → Pages 的 Source 使用 **GitHub Actions**，`github-pages` 环境只允许 `main` 分支发布。

`.github/workflows/ci.yml` 对分支和 PR 执行格式、Lint、类型、内容检查及单测，随后分别验证根路径与 `/modelsphere-website/` 路径的 preview/mock、release/none 构建。候选通过 Nginx 浏览器检查后，只有 `main` 才上传已验证的正式产物并部署；发布阶段不重新构建。正式站不会包含 Mock 博客或文档，文档目前显示准备状态，站点仍保留验证期的 noindex。

发布参数固定为 `SITE_ORIGIN=https://modelsphere.github.io`、`SITE_BASE_URL=/modelsphere-website/`。`SITE_ORIGIN` 只含协议和域名；子目录单独配置，必须以 `/` 开始和结束。不设置 `SITE_BASE_URL` 时继续支持根路径部署。

```sh
SITE_ORIGIN=https://modelsphere.github.io SITE_BASE_URL=/modelsphere-website/ pnpm build
SITE_BASE_URL=/modelsphere-website/ pnpm serve
E2E_BASE_URL=http://localhost:4173 TEST_DOCS_MODE=none pnpm test:pages
```

每次合并后流水线重新验证合并提交，部署串行执行且检查候选仍是当前 `main`。发布后核对 `version.json` 的完整提交 SHA、代表路由、静态资源与真实 HTTP 404。线上代码版本与 Catalog 实时数据版本分别记录。

可在 Actions 的 **Website checks** 使用 **Run workflow**，选择 `main` 重试发布。回滚通过 PR 撤销问题提交，待检查通过后合并并重新发布；发布前失败不会替换现有站点，发布后验收失败需要修复或回滚，尚无自动回滚。更换自定义域名或迁移 Kubernetes 时再调整发布配置。

## 本地运行文档试点

运行环境：Node.js **24.22.0**、pnpm **10.22.0**；版本固定在 `.node-version` 和 `package.json`。

```sh
pnpm install --frozen-lockfile
pnpm dev:docs
```

打开 `http://localhost:3000/docs`。两篇源文件位于 `tests/fixtures/docs/`；修改后重新启动预览，使内容重新校验并同步。首访跟随系统，点击太阳／月亮按钮切换并记住浅深色偏好。

```sh
pnpm build:docs-preview
pnpm serve
```

静态预览地址为 `http://localhost:4173/docs`。`pnpm serve` 是方便本地阅读的 Node 静态服务；正式静态服务验收使用 `infra/docker/` 的 Nginx 镜像。

正式候选使用实际网站 origin，例如在 shell 中设置 `SITE_ORIGIN` 后运行 `pnpm build`。正式构建固定 `release + none`，包含首页，`/docs` 显示“文档准备中”，不会发布 Mock。没有域名配置时构建直接报错。

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

浏览器检查在 Nginx 容器运行后，通过 `E2E_BASE_URL=http://localhost:4173 TEST_DOCS_MODE=mock pnpm test:e2e` 执行；正式候选改为 `TEST_DOCS_MODE=none`。具体步骤见 `.github/workflows/ci.yml`。

本节说明验证方法；每次变更的远程检查与发布状态以对应 PR 和 Actions 运行记录为准。

Header 已按 [Stitch 项目 14815301483114557678](https://stitch.withgoogle.com/projects/14815301483114557678) 覆盖，包含原始 Logo、完整导航结构、GitHub 组织入口和图标主题切换；未开放栏目明确标示为待开放。右上角搜索在桌面与手机均可用，详见下方说明。

## 全站搜索

点击 Header 搜索或按 `⌘K` / `Ctrl+K` 打开弹窗。输入即搜索，支持中文、英文大小写不敏感和空格分隔的多个关键词；中文输入法组合期间不更新结果、不触发跳转。可切换“全部／文档／博客”，结果显示来源、标题、小节与命中摘要，并高亮关键词。标题匹配优先，每页仅显示一个最相关小节；方向键选择、Enter 打开、Esc 关闭并恢复焦点。

索引由 `plugins/search/` 从 Docusaurus 实际公开的文档和站内博客生成，覆盖标题、小节、正文（含代码）和博客标签；排除站外文章、草稿、未列出页面和内部规范。索引与静态站点同版交付，以内容 hash 命名，仅在首次打开搜索时加载，失败可重试。正式站无真实内容时显示空态；预览样例仍受既有构建隔离。搜索不依赖外部服务，无 JavaScript 时入口禁用并提示，正文仍可阅读。

索引单测在 `tests/unit/search.test.ts`；弹窗、导航、中文输入法、错误重试及双主题响应式验收在 `tests/e2e/search.spec.ts`。本地预览继续使用 `pnpm dev:blog-mock` 或 `pnpm build:docs-preview`。

门户 Footer 已按最新首页实现：品牌占两格，四组导航为“开源代码／社区与生态／开发者资源／法律与开源”，博客入口只放“社区与生态”；已核验的 GitHub、Model Catalog 和技术文档入口保留真实地址，未开放资源为静态待开放文字。文档保留已实现的上下两条紧凑横栏特例。浅色白底、深色 #0B0E15。Header 继续沿用单独指定的 14815301483114557678。全局示例提示条已移除，Mock 与正式构建仍由构建模式隔离。

本轮修正入场前内容提前显示：用户实际预览为 319×804，旧版仅并排子块设置等待透明度，堆叠子块仍可见。现所有十个子块在触发前均为 opacity=0，后台保留未播等待状态；动画建立后才移除等待标记，堆叠入场也由 0 渐显。319×804 全模块及入场前后截图检查通过。格式、Lint、类型检查、29 单测及 preview/mock、release/none 构建与产物检查通过；正式版 48/48、预览版顺序完整运行 53/53 通过。并行运行时的两次超时保留在 `preview-initial/`、`preview-second-run/`；全部断言及时间限制不变。当前结果与截图位于 `reports/home-pre-entry-blank/validation.json`，上一轮 52/47 结果不覆盖本次缺陷。无 PR、无提交 SHA，仅本地验证，未推送／未验证远程 CI。

上一轮按 GPUStack Enterprise 的双侧入场复现首页五组左右结构：能力卡第一排、能力卡第二排、断流续写图文、QoS/SLO、Tuning-Agent 图文。并排从左右各 60px、opacity=0 滑入归位，900ms，起点到达视口高度 85% 时同步触发；脚本及观察器就绪后设置等待状态，避免卡片先出现再闪回。窄屏堆叠逐块 y=28→0、700ms、opacity=.15→1。焦点、锚点、后台、断点、减少动效与卸载均清理等待状态；无脚本直接可读。该轮 Node.js 24.22.0／pnpm 10.22.0 下，格式、Lint、类型检查、29 项单测、preview/mock 与 release/none 构建及产物检查通过；Nginx 上预览版 52/52、正式版 47/47 浏览器检查通过。结果记录在 `reports/home-gpustack-motion/validation.json`，两种模式的浏览器报告与截图独立保留；初次失败及中断记录在 `preview-initial/`、`release-initial/`。无 PR、无提交 SHA，仅本地验证，未推送／未验证远程 CI。

D14 保持：首页“系统分层架构与算力调度拓扑”标题下方的完整正文，从上向下揭示一次，桌面 1000ms、手机 800ms；不改变高度或缩放，不挤动下方内容。标题与上方三卡静态；品牌、四层架构和底部说明作为一个整体揭示，不模拟节点运行。初始和屏外目标共用一个观察器：起点进入视口高度 92% 的区域才由观察回调播放；初始已在该区域可播，仅露在底部 8% 时继续等待。播放期间继续观察，离屏立即取消并回到最终态。

D13 首页文字效果保持：标题整体从下方翻起并渐显，桌面 48px／18°／1050ms，手机 32px／12°／850ms；引导语和简介分别从左侧 40px／24px 滑入渐显，耗时 800ms／640ms。三组文字按 0/240/480ms 延迟，总序列桌面 1280ms、手机 1120ms；不拆字、不等字体，不延后首屏入口操作。

前一已验证版本使用 Node.js 24.22.0、pnpm 10.22.0、Nginx 1.28 与 Chromium：格式、Lint、TypeScript、29 项单测及 preview/mock、release/none 构建和产物检查通过。preview/mock 分两次覆盖 51 项：初次全套原有 45 项通过，修正测试定位精度和截图隔离后 6 项通过；未取得一次全套 51 项通过的结果，初次 3 项失败记录保留。release/none 完整 46/46 一次通过，覆盖当时 D14 的 92% 门槛、左右聚合的 70% 门槛、旧观察回调过滤及共享动效回退；对应 Hook 文件 SHA-256 为 `4402a308973d21fce67d4a155a0e5da8d254fffc06a07789f50157e0d0af56ca`，正式产物 SHA-256 为 `f52701faaec201f6a8b732f3f25c9a8a888f12eca40a854e62a3fd94232aceb5`。这些是旧版本证据，不代表本轮逐卡呈现修复通过。

该历史汇总为 `reports/home-integrated-motion/validation.json`；预览初次和复验报告分别在其 `preview/browser-report/`、`preview/verified-browser-report/`，正式报告在 `release/browser-report/`，两种模式均保留 hero/topology 原生动画 JSON 采样。`reports/home-topology-motion/validation.json` 与 `reports/home-validation.json` 当时指向同一汇总；此前 D14 单独版本的 40/35 和 D13 strong 版本的 37/32 均为历史。预览失败中，两项滚动定位测试因不足 1px 的舍入误差调整为 ≤1px，保留全部 70% 边界断言；四组截图原共用 30 秒预算，现拆为四项独立测试，各保留默认 30 秒，未提高超时或删减断言。

上一轮 D13 加强版在 Node.js 24.22.0、pnpm 10.22.0、Nginx 1.28 下通过格式、Lint、TypeScript、29 项单测、preview/mock Chromium 37/37、release/none Chromium 32/32 及两种构建产物检查。8 项新增首屏用例采样验证标题透视、位移及缩放，说明文字横向滑入，无横向溢出，字体未就绪仍播放，布局与语义不变，以及后台、焦点、减少动效和历史恢复的取消行为；实际从文档返回首页不重播。历史汇总为 `reports/home-hero-motion/validation.json` 与 `reports/home-hero-motion/strong/validation.json`，两种候选各自的 `build.json`、`browser-report/`、`test-results/` 和原生动画 JSON 采样分别位于 `strong/preview/`、`strong/release/`；这些结果不代替 D14 接入共享逻辑后的复验。

此前 D13 的轻量渐显版本已完成 29 项单测、preview/mock Chromium 37/37、release/none Chromium 32/32 及两种构建产物检查，证据保留在 `reports/home-hero-motion/moderate/preview/`、`reports/home-hero-motion/moderate/release/`，不替代当前更强动效版本的复验。

上一轮屏外动效修复在 Node.js 24.22.0、pnpm 10.22.0、Nginx 1.28 下完成：29 项单测、preview/mock Chromium 29/29、release/none Chromium 24/24 及两种构建产物检查通过。历史汇总保留在 `reports/home-motion-fix/validation.json`，修复前失败与两种候选的证据均保留；这些结果不替代 D13 及共享逻辑变更后的复验。既有文档试点记录另见[实施方案第 10 节](docs/development/docs-implementation.md#10-本轮交付与本地验证记录)。Safari、Firefox、真实移动设备、弱网及性能测量等完整矩阵尚未完成。当前没有 PR、已验证的提交 SHA 或远程运行链接，仅本地验证，未推送／未验证远程 CI，未部署；站内 Catalog、博客和完整门户仍待实施。
