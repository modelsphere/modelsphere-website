# 社区例会与活动维护

社区交流区暂时不展示尚在企业认证流程中的公众号。微信技术交流群二维码使用用户在 2026-10-27 提供的原始 PNG，保存为 `static/community/wechat-group-qr.png`；更换时替换该文件并重新构建发布，图片保留白色静区，不裁剪或重绘。二维码和“扫码加入技术交流微信群”入口均可打开原图，供微信识别。公众号认证完成后再接入真实入口。

页面的日历区读取 `content/community/meeting.yaml` 和 `content/community/events/*.md`。维护这些文件即可更新内容，不需要修改组件、样式或动画。开发服务会监听内容变化；静态站点上线后，内容更新仍需要重新构建、发布。

## 当前上线内容

已按发布要求删除设计稿中的三场示例活动，例会配置为 `meeting: null`，不再展示示例日期、会议号或虚构议程。预览与正式构建均显示带日历图标的“暂无活动”卡片，提供到真实技术交流群的入口。活动目录尚不存在或为空时均正常构建；新增第一场真实活动时创建 `content/community/events/`。

`example: true` 内容仍只能用于测试或受控预览，不能进入正式构建；真实活动需要 `example: false` 和 `draft: false`。当前没有任何已配置的示例活动。

## 添加一场真实活动

在 `content/community/events/` 新建 `<id>.md`。以下是字段模板，尖括号内容必须替换；不是实际活动，不可直接发布：

```yaml
---
id: <与文件名一致的小写英文短横线标识>
title: <经确认的活动完整标题>
speaker: <经确认的主讲人>
draft: true
example: false
startsAt: <带时区偏移的时间，如 YYYY-MM-DDTHH:mm:ss+08:00>
endsAt: <带时区偏移的结束时间>
timeZone: Asia/Shanghai
---
一段经确认的纯文本活动简介。
```

正文仅接受一段纯文本简介，不使用 HTML、多行 Markdown 或脚本。标题、主讲人与简介直接呈现在卡片上，不自动改写。`id` 唯一并与文件名一致；修改标题时可保留 id。

按实际提供的入口添加以下可选 HTTPS 字段；缺少链接就省略字段，不填空字符串或占位链接：

| 字段 | 用途 |
| --- | --- |
| `registrationUrl` | 未开始活动的报名/提醒入口 |
| `liveUrl` | 直播中活动的实际观看入口 |
| `replayUrl` | 结束后的回放入口 |
| `slidesUrl` | 独立的讲义/PPT 下载入口 |

不在列表中填写播放量，没有可靠数据来源时不显示。报名入口自身必须确实支持页面按钮表达的预约/提醒功能；网站不收集报名信息、不代发提醒。

1. 保持 `draft: true` 编写，并执行 `pnpm community:check`。草稿不会出现在页面中。
2. 文案、讲者、起止时间、时区和链接确认后改为 `draft: false`，用 `pnpm dev:docs` 检查页面。此时内容具备发布资格，但尚未上线。
3. 执行下面的本地检查，通过仓库已有 PR/CI 和发布流程上线。
4. 活动结束后补充真实 `replayUrl` / `slidesUrl`，重新发布。旧活动保留原文件，无需删除。

状态由时间计算，不能手工写 `status`：开始前“预告”，开始至结束前“直播中”，结束后“已结束”；结束且有回放链接才显示“往期回放”。首页最多三条，按时间展示直播中/最近待开始活动并保留最新一条回放；有空位时补充最近结束的活动，其余保留在“更多活动与往期记录”中，未来活动正序、已结束活动倒序。存在真实活动时不混入设计示例。

客户端每 30 秒及页面重新可见时更新状态；不执行报名、推送或实时播放量采集。无 JavaScript 时显示构建时的状态，下一次构建更新；长时间不重新发布的静态页面在禁用脚本时可能显示旧状态。

## 更新左侧固定例会

在 `content/community/meeting.yaml` 的 `meeting` 下维护：

| 字段 | 含义 |
| --- | --- |
| `example` | 真实配置使用 `false` |
| `title`、`schedule`、`platform` | 标题、周期说明、接入平台 |
| `timeZone` | IANA 时区，例如 `Asia/Shanghai` |
| `nextStartsAt` | 可选，下次例会的完整起始时间（含偏移）；过期后显示下期待公布 |
| `meetingNumber`、`joinNote` | 可选，真实会议号与加入说明 |
| `agenda` | 议程纯文本列表 |
| `meetingUrl` | 可选，会议号的实际加入链接 |
| `calendarUrl` | 可选，由社区维护的、支持持续订阅的 HTTPS iCal feed 地址 |
| `minutesUrl` | 可选，纪要与议题提交入口 |

真实配置不得填写设计专用的 `nextLabel`。没有例会安排时可写 `meeting: null`。仅在有确定的日历订阅 feed 时填写 `calendarUrl`，不要用单次活动文件或普通页面冒充订阅；本次不生成虚构的周期日历。

## 校验与实现位置

```sh
pnpm install --frozen-lockfile
pnpm community:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build:docs-preview
SITE_ORIGIN=https://实际域名 pnpm build
```

使用仓库固定 Node.js 24.22.0 和 pnpm 10.22.0。`community:check` 同时检查预览和正式数据，CI 的 quality job 会执行；构建也运行同一严格校验。错误时间（无偏移、结束不晚于开始）、无效时区、非 HTTPS/带凭据链接、未知字段、重复 YAML 键及文件名不匹配都会阻止发布。校验不能替代人工确认链接内容和活动真实性。

数据读取：`scripts/community-content.ts`；构建接入与开发监听：`plugins/community/index.ts`；时间状态、排序和入口：`src/features/community/events.ts`；页面展示：`src/features/community/Calendar.tsx`。维持现有卡片字体、颜色、间距与首页同规则动画，不需要 CMS、数据库或新增依赖。
