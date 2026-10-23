# ModelSphere 官网组件契约

| 属性 | 内容 |
| --- | --- |
| 更新日期 | 2026-10-21 |
| 状态 | 当前全站设计说明；文档试点已实现，其他模块待实施与验收 |
| 上游规范 | [设计基础规范](foundations.md) |
| 设计依据 | [当前三张最新稿选型](sources/stitch-foundations.json)；旧 dark 只配色、旧 14 份页面记录仅历史；Header 与既定文档 Footer 为明确例外 |
| 范围 | 共享组件边界、输入、变体、状态、内容限制与基本可访问性 |

本规范规定页面通过哪些组件组装，以及组件必须接受什么数据、呈现哪些状态。视觉数值继承设计基础规范；组件用于 Docusaurus 的自定义门户及 Catalog 页面；站内文档使用标准文档组件，统一导航和品牌。新增领域接口需在实现时验证，不代表已经完成视觉验收。

接口采用框架无关的字段描述，`?` 表示可选，`[]` 表示列表。框架与依赖边界遵循工程准则。

## 1 已确认的组件决策

| 编号 | 提案 | 对生成代码的约束 |
| --- | --- | --- |
| C01 | 页面、业务组件、基础组件三级组合 | 禁止每页复制一套导航、按钮或卡片样式 |
| C02 | 跳转链接与动作按钮使用不同语义，共享视觉外观 | 禁止可点击 div、空链接和伪禁用链接 |
| C03 | 模型、文章、测评内容作为数据输入 | 组件不硬编码示例模型、文章、性能提升或社区人数 |
| C04 | 架构图采用页面专用内容与共享外框 | 首期不建设通用图编辑器；必须提供文字替代 |
| C05 | 统一尺寸、状态色与基础可访问性 | 所有页面遵循同一套加载、错误、禁用和焦点规则 |

## 2 组件边界与公共输入

| 层级 | 负责 | 不负责 |
| --- | --- | --- |
| 页面 | 路由、区块顺序、数据获取、筛选结果与页面状态 | 重写共享组件视觉 |
| 业务组件 | 模型卡、文章卡、测评表、指标卡的领域展示 | 自行获取数据、判断未经定义的业务结论 |
| 基础组件 | 容器、标题、按钮、徽标、代码块和状态呈现 | 决定页面业务文案 |

公共数据约定：

| 类型 | 必填字段 | 可选字段或约束 |
| --- | --- | --- |
| `LinkSpec` | `label: string`、`href: string` | `newTab?: boolean`，默认 false；禁止空字符串和单独的 `#` |
| `MediaSpec` | `src: string`、`alt: string`、`width: number`、`height: number` | `srcDark?: string`；`preview?: {src,width,height,alt,focalPoint?: {x,y}}`，焦点坐标 0..1；preview 必须审核；浅深素材同尺寸、同信息与相同 alt；缺省原图加中性外框；装饰图片 alt 为空 |
| `EvidenceRef` | `label: string`、`href: string` | 仅表示来源入口，不代表已完成事实验证 |
| `HeadingLevel` | `2` 或 `3` 或 `4` | 由页面确定，不能为获得字号改变语义层级 |
| `IconName` | 已登记的图标名称 | 禁止生成任意 SVG 字符串作为组件输入 |

- 列表项必须有稳定且唯一的 `id`，不得用当前排列位置作为业务标识。
- 自然语言默认纯文本；富文本只通过后续内容规范确定的受控渲染器处理，不接受任意 HTML 注入。
- 组件不公开任意颜色、字号、圆角、阴影参数；变体必须在本规范或后续修订中登记。
- 可选内容缺失时移除相应布局，不输出占位横线或编造补全文案；必填内容缺失时由校验报错。
- 内容建议长度按用户可见字符统计，包含标点；超过建议值不静默截断，必须允许换行并提示内容检查。

## 3 布局与公共导航

| 组件 | 输入 | 规则 |
| --- | --- | --- |
| `PageContainer` | `width: default / wide`，默认 default；内容插槽 | 分别对应 1280 / 1440px；wide 必须由页面契约明确指定；只在区块最外层使用 |
| `PageSection` | `id`、`surface: canvas / surface / subtle / technical`、内容插槽 | 自动使用基础规范区块间距；不自动创建标题或重复应用页面留白 |
| `SectionHeading` | `title`、`level: HeadingLevel`；`eyebrow?`、`description?`、`action?: LinkSpec`、`align?: start / center` | 默认 start；标题建议不超过 24 字，描述不超过 120 字；窄屏操作入口放在文字下方 |
| `SiteHeader` | `brand: MediaSpec`、`home: LinkSpec`、`items: LinkSpec[]`、`activeHref?`、`primaryLink?` | 桌面展开，<1280px 折叠；导航当前项使用 aria-current；不内置集群状态或仓库 Star 数 |
| `SiteFooter` | `brand: MediaSpec`、`groups: {id,title,links: LinkSpec[]}[]`、`copyright: string` | 门户统一按当前最新首页六格栅格，品牌占两格；文档保留已确认双层横栏实现，不作为本次旧稿引用；浅色白底、深色 #0B0E15；不生成未经核实的运行声明 |

主题组件：`ThemeModeSwitch` 使用 Docusaurus 共享 provider，首访跟随系统，界面只展示一个 44px 图标按钮；浅色显示月亮、名称为“切换到深色模式”，深色显示太阳、名称为“切换到浅色模式”。点击后持久化明确的 light/dark 偏好；不显示“外观”、原生下拉框或第三个模式入口。按钮常驻 Header 右侧，手机无需展开菜单。SVG 保留隐藏语义，按钮提供 aria-label/title 和键盘焦点。无脚本隐藏不可用按钮，保留系统配色回退。

Header 保留已确认的 [Stitch 项目 14815301483114557678](https://stitch.withgoogle.com/projects/14815301483114557678) 独立来源例外，来源见 [Header 来源记录](sources/stitch-header.json)，不因本次门户三稿重新选型。采用原始透明 Logo、本地 Inter、64px 最小高度、1440px 外容器、半透明背景与 12px 背景模糊；Inter 和 1440px 仅覆盖 Header，不覆盖基础规范的页面字体或默认内容宽度。桌面导航按首页、全景架构、模型目录、文档指南、博客、社区生态排列，当前页为浅色圆角底。GitHub 指向用户确认的组织主页；快速开始仅在 Mock 预览指向示例，正式候选进入文档准备页。尚未实现的栏目是带“即将开放”语义的静态文本，搜索打开覆盖已发布站内文档和博客的本地索引弹窗；不生成虚假路由、版本号、Star 数或账号能力。右侧图标取代原稿账号头像；不显示站级“示例预览／仅供界面验证”提示条。宽屏显示完整搜索外观与内容标签，窄屏收起导航与部分操作，搜索与主题按钮始终可见。

门户 Footer 只采用 [Stitch 项目 3601238558355976464](https://stitch.withgoogle.com/projects/3601238558355976464) 顶部最新首页 `ae7c34338c3d444e8962883018c26f8f`，详见 [Footer 来源记录](sources/stitch-footer.json)；最新 Catalog、博客中的旧分组不再保留。六格栅格中品牌占两格，四组统一为“开源代码”（GitHub 仓库、Model Catalog 模型库）、“社区与生态”（博客洞见、微信开发者群、ModelHubXC 信创模盒）、“开发者资源”（技术文档）、“法律与开源”（有真实资源的法律及开源入口）。开发者组不再重复博客，这是统一取舍。外容器 1280px、桌面水平留白 32px，浅色白底与细分隔线，深色仅参考既有配色 `#0B0E15`。`/docs` 及其子路由保留已确认的紧凑双层 Footer 实现：上层品牌/说明与三组图标文字，下层版权与资源；这是既定例外，本次不重新引用旧文档稿。原稿示意版本号、运行状态、SHA、SLA 和许可证保证不作为真实事实展示；已知外链保留原生地址，未开放入口为静态文字，缺少真实资源的条目或组不编造补齐。

导航补充：

- Header 各断点最小高度 64px；文字放大时允许增长；折叠菜单作为导航栏下方的可展开区域，不实现全屏模态窗口。
- 菜单按钮始终可键盘访问，维护展开状态与受控区域关联；Escape 关闭并将焦点返回菜单按钮。
- 菜单关闭后内部链接不进入 Tab 顺序；进入桌面断点时清除折叠菜单状态。
- 同页锚点保留 Header 高度加 16px 的滚动偏移，避免标题被吸顶导航遮挡。

完整路由及导航文案由页面契约定义；文档入口使用可用的配置地址，未有真实文档时显示准备状态。

## 4 操作与状态组件

### 4.1 按钮和链接

| 组件 | 输入 | 行为 |
| --- | --- | --- |
| `Button` | `label`、`variant: primary / secondary / ghost`；`icon?`、`disabled?`、`loading?`、激活事件 | 默认 secondary；默认原生 button type 为 button；不接受 href |
| `ActionLink` | `link: LinkSpec`、相同 variant；`icon?` | 使用原生链接；不提供 loading 或 disabled；目标未准备好时不渲染入口 |
| `IconButton` | `icon`、`accessibleLabel`；`disabled?`、`loading?`、激活事件 | 图标不能成为唯一可访问名称；用于复制、菜单等紧凑操作 |

- 文本按钮最小高度 44px，横向内边距 16px，纵向内边距 8px，允许长标签换行；图标按钮最小点击区域 44×44px。
- 建议标签为 2–10 字；一个操作组最多两个入口，其中最多一个 primary。首页 hero 为已确认例外，可同时提供 Quickstart、GitHub、Catalog 三个真实入口，仍最多一个 primary；其他 hero 与收尾 CTA 维持最多两个入口。
- loading 状态保留标签与按钮宽度，显示进度标识，设置忙碌语义并阻止重复提交。
- disabled 使用原生禁用行为；需要解释原因时在附近显示文字，不依赖禁用元素上的悬浮提示。
- 新窗口链接显示对应提示并使用 `rel="noopener noreferrer"`；站内跳转默认当前窗口。

### 4.2 徽标与内容状态

| 组件 | 输入 | 规则 |
| --- | --- | --- |
| `Badge` | `label`、`tone: neutral / info / success / warning / error` | 默认 neutral；标签建议 ≤12 字；无点击行为；状态颜色必须伴随文字 |
| `ContentState` | `state: loading / empty / error`、`message`；`retryLabel?`、重试事件 | 错误信息面向用户；仅在重试事件存在时显示按钮；不显示堆栈或密钥 |

动态区域的数据状态由页面管理：加载中 → 成功、空结果或失败。已有内容刷新失败时保留旧内容，并显示更新时间及失败提示。静态内容不人为插入加载过程。

### 4.3 状态颜色与焦点

全部状态色与前景/背景配对统一引用[基础规范第 3 节](foundations.md#3-色彩与表面)，本文件不维护第二张颜色表。

- primary 按钮使用 onPrimary 文字；链接使用 primary，hover 使用 primaryHover；secondary/ghost 使用主题正文和表面色。
- neutral/info/success/warning/error、禁用、焦点、选中、loading/empty/error 均覆盖两个主题。状态不能只依靠颜色；选中卡使用边框、顶部强调线与文字说明。
- 焦点轮廓 2px、偏移 2px，立即可见；普通页面使用 focus.ring，深色终端使用 focus.terminal。不能裁切轮廓或以 hover 替代 focus。
- 文本目标对比度至少 4.5:1，必要控件边界至少 3:1；在实际相邻表面复验。原稿亮青色、弱灰标签和透明边框不能直接用于正文或必要边界。

## 5 内容卡片与指标

| 组件 | 必填输入 | 可选输入 | 布局与限制 |
| --- | --- | --- | --- |
| `FeatureCard` | `title`、`description`、`level` | `icon`、`badge`、`link: LinkSpec`、媒体插槽 | 标题建议 ≤24 字，描述 ≤120 字；大型展示可用 feature 圆角，普通卡使用 card 圆角 |
| `MetricCard` | `label`、`valueText`、`kind: summary / technical`、`context`、`evidence: EvidenceRef[]` | `unit`、`comparisonText`、`updatedAt` | label 建议 ≤16 字；context 必须解释统计或测试条件；比较说明不得由数值差自动编造 |
| `ModelCard` | `id`、`name`、`link: LinkSpec` | `summary`、`family`、`hardwareLabels: string[]`、`engineLabels: string[]`、`recipeCount`、`evidence: EvidenceRef[]` | 链接到模型详情；不把模型等同于单条配方；缺失统计不填造 |
| `RecipeCard` | `id`、`modelId`、`name`、`version`、`link: LinkSpec` | `hardwareLabels`、`engineLabel`、`topologyLabel`、`validation`、`evidence` | 配方状态与版本来自 Catalog；无验证证据不展示成功徽标 |
| `ArticleCard` | `id`、`title`、`summary`、`publishedAt`、`link: LinkSpec` | `cover: MediaSpec`、`category`、`tags: {id,label,href?}[]`、`author`、`readingMinutes` | 标题建议 ≤48 字，摘要 ≤120 字；日期采用 YYYY-MM-DD；标签由 Article.tagIds 与已验证标签字典映射，不虚构作者或阅读时长 |
| `CtaBlock` | `title`、`description` | `variant: surface / gradient`、`primaryLink: LinkSpec`、`secondaryLink: LinkSpec` | 默认 surface；首页收尾使用基础规范第 3.1 节独立 gradient/反白变体与16px外框；链接仅在目标真实可用时显示；无文档可展示准备说明；标题建议 ≤32 字；移动端操作纵排 |
| `BlogSidebar` | 无；只引用已审核社区资源，不硬编码运营信息 | `wechat?: {title,contactLabel,contactValue,qr?: MediaSpec,description?}`、`zhihu?: LinkSpec & {followerCount?,evidence?: EvidenceRef[],observedAt?}` | 微信二维码可选且静态，必须有可读联系标签/值；知乎为真实链接，关注数仅在 evidence 与 observedAt 齐备时显示；缺资源省略对应区块，不造二维码、账号或人数 |

- MetricCard 的 summary 使用 Space Grotesk，technical 使用 JetBrains Mono，遵循基础规范 D03。
- `evidence` 对 MetricCard 至少一项；来源不足的指标不进入正式发布内容，预览示例必须明确标注。详细证据字段由内容规范扩展。
- 普通卡片不固定高度；同一网格可拉伸等高，但不得裁切内容。
- 含多个交互元素的卡片使用普通容器，只在标题或明确操作处放链接；不嵌套链接或按钮。
- 只有一个跳转目标且无其他交互元素时，允许整卡作为链接；整卡 hover 和 focus 表现一致。
- 封面缺失时使用无图变体，不自动生成图片填补。博客推荐封面容器 16:9、列表封面容器 3:2；仅使用审核过的 `MediaSpec.preview` 执行裁剪，焦点来自可选的 0..1 坐标，不裁掉必要标题或图例；无审核预览时以 contain 完整呈现原图。文章正文的架构图及技术图示保持完整固有比例，不沿用封面裁剪；封面 hover 不缩放。
- 博客标签是由已发布 Article.tagIds 与标签字典映射的可选元数据。只有已定义且验证通过的标签筛选地址才提供 href；无地址时使用无点击 Badge，不生成虚假标签链接。

Catalog 还使用以下受控展示组件：

| 组件 | 输入与职责 | 边界 |
| --- | --- | --- |
| `CatalogTable` | 模型或配方行、列定义、当前排序与排序事件 | 语义化表格；局部横向滚动；不自行请求数据 |
| `RecipeHistory` | 稳定配方 id、版本列表、当前版本及选择事件 | 版本来自源系统；选择同步 URL；无历史时明确说明 |
| `BenchmarkConditionsDialog` | `open`、当前测评数据、关闭事件 | 只展示已有完整条件，遵循动效模块 D07；构建基线内的条件无脚本使用 details/summary；实时详情无脚本提示需要 JavaScript，不虚构数据 |
| `EcosystemGrid` | 已核实生态条目、关系说明与原生链接 | 静态响应式网格；手机纵排、平板两列、桌面三列，遵循 D09 |

## 6 代码与技术图示

| 组件 | 输入 | 规则 |
| --- | --- | --- |
| `CodeBlock` | `code: string`、`language: string`；`title?`、`copyable?: boolean`、`appearance?: code / terminal` | 默认可复制、appearance=code 随主题；terminal 使用基础规范专用深色字对；保留代码换行和空白；未知语言纯文本 |
| `DiagramFrame` | `title`、`summary`、图示插槽；`caption?` | 图示可用受控 SVG 或图片；必须有文字摘要；窄屏不得靠无限缩小文字适配 |
| `BenchmarkTable` | `caption`、`columns: {id,label,kind}[]`、`rows: {id,cells}[]`、`context`、`evidence: EvidenceRef[]` | kind 为 text / number；列 id 与 cells 键一一对应；数值列右对齐；至少一项来源 |

图示中的 SVG 标签、轴线、图例及数据线引用语义颜色；浅深主题同一份数据，不能反转截图或将白底图当作暗色透明素材。图表线型/直接标签补充颜色区别。

CodeBlock 复制状态：默认 → 复制中 → 已复制或失败。成功提示 2 秒后恢复；失败提示保留到重试或内容变更，并允许手动选取。复制原始代码内容，不复制标题和行号，结果通过非打断式状态提示播报。

DiagramFrame 首期只共享容器、标题与替代文本约束。各架构图的节点和连线由页面专用组件实现，不引入编辑、拖拽和自由连线能力。可用文字列表表达的流程在窄屏提供线性阅读顺序。

BenchmarkTable 使用语义化表格、caption 和列标题。小屏在带可访问名称的局部区域滚动；表格内容本身不设置一行省略。筛选、排序和列选择不属于该表格组件的默认功能。

## 7 筛选与选择

| 组件 | 输入 | 规则 |
| --- | --- | --- |
| `SearchField` | `label`、`value`、值变更事件；`placeholder?`、`disabled?` | label 不能仅靠 placeholder；有输入时可清空；最小高度 44px |
| `FilterSelect` | `label`、`value`、`options: {value,label}[]`、值变更事件 | 首期原生单选 select；空值表示不限；options 值唯一；最小高度 44px |
| `FilterMultiSelect` | `label`、`values: string[]`、`options: {value,label}[]`、值变更事件 | Catalog 硬件多选；优先 fieldset/legend + checkbox；可见已选项与清除入口；不依赖 hover |
| `TabGroup` | `label`、`items: {id,label}[]`、`activeId`、选择事件、内容插槽 | 仅切换同页局部内容；不代替页面导航 |

- SearchField、FilterSelect 和 FilterMultiSelect 为受控组件，不自行请求接口，也不内置筛选字段、搜索延迟或 URL 同步策略；这些由页面及交互规范确定。
- TabGroup 使用 tablist、tab、tabpanel 关联语义；左右键移动焦点，Home/End 到首尾，Enter/Space 激活。
- 窄屏标签栏局部横向滚动，当前焦点项必须可见；不得把标签直接压缩为不可读宽度。
- Catalog 使用专用硬件多选与卡片/表格视图切换；不额外建设日期范围、通用弹窗表单或抽屉。输入与选择控件文字至少 16px，目标区域至少 44px。

## 8 组合与验收边界

生成页面时，先查组件清单；已有组件覆盖需求则通过数据和已定义变体复用。新增组件必须说明现有组件无法覆盖的职责，不通过任意内容插槽绕过业务字段校验。

实现至少检查：

1. 普通、超长中文、缺失可选字段三组内容不会遮挡或重叠。
2. Button 的加载和禁用状态阻止重复触发；ActionLink 保留浏览器原生链接行为。
3. 菜单、标签、复制、搜索和筛选可通过键盘完成，且焦点可见。
4. loading、empty、error 及刷新失败时的已有内容均有明确表现。
5. 状态文字对比度满足本规范，深浅背景分别检查；不能只用颜色表达状态。
6. 手机布局不出现整页横向滚动，局部表格和代码滚动区可访问。
7. 首访内部 system 自动跟随系统，界面仅二态太阳／月亮按钮；任意页面可键盘切换浅深，不提供第三选择或“恢复系统”UI；切换不丢失焦点、输入、查询、弹层、数据版本与阅读位置，所有组件浅深状态完整。
8. 组件不硬编码设计示例中的性能结果、模型版本、Star 数或社区人数。

具体自动化命令、视觉基线和远程 CI 门禁在第七份验收规范中确定；本稿不宣称任何组件已经实现或通过测试。

