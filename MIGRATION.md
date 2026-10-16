# approval-system → sast-approval-next 迁移说明

旧项目：`../approval-system`（CRA 5 + antd 4.21 + Recoil + react-router-dom 6 + form-render 1.13 + sass）
新项目：本仓库（Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui + Zustand + Tauri 2）

迁移目标是**功能与接口零删减**，同时重做视觉与响应式布局。

---

## 1. 页面清单

旧项目 20 个页面全部迁移，无遗漏：

| 旧页面                                       | 新页面                                                               | 说明                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pages/home`                                 | `components/layout/app-shell.tsx` + `components/auth/login-view.tsx` | 未登录渲染登录页，已登录渲染侧边栏布局                               |
| `pages/account`                              | `app/account/page.tsx`                                               | 增加学院 / 专业 / 联系方式（旧版把这些字段注释掉了，数据本就已请求） |
| `pages/activity`                             | `app/activity/page.tsx`                                              | 搜索 + 分页 + 每页条数切换                                           |
| `pages/activityDetail`                       | `app/activity/detail/page.tsx`                                       | 角色按钮、公告、时间轴、锚点导航                                     |
| `pages/register`                             | `app/activity/register/page.tsx`                                     | 动态报名表单                                                         |
| `pages/registerDetail`                       | `app/activity/register-detail/page.tsx`                              |                                                                      |
| `pages/workDetail`                           | `app/activity/work-detail/page.tsx`                                  | schema 表单 + 对象存储直传                                           |
| `pages/manage`                               | `app/manage/page.tsx`                                                |                                                                      |
| `pages/create`                               | `app/manage/create/page.tsx`                                         | 两步：比赛信息 → 白名单                                              |
| `pages/edit`                                 | `app/activity/manage/edit/page.tsx`                                  | 删除操作改为二次确认弹窗                                             |
| `pages/manageDetail`                         | `app/activity/manage/page.tsx`                                       | 统计卡片 + 评委分配 + 项目列表                                       |
| `pages/notice`                               | `app/activity/notice/page.tsx`                                       | 创建 / 编辑 / 删除                                                   |
| `pages/whiteList`                            | `app/activity/manage/white-list/page.tsx`                            |                                                                      |
| `pages/review`                               | `app/review/page.tsx`                                                | 按角色区分「评审 / 审核」文案                                        |
| `pages/reviewList`                           | `app/review/list/page.tsx`                                           | 进度统计 + 截止日期                                                  |
| `pages/reviewApprover` + `pages/reviewJudge` | `app/review/detail/page.tsx`                                         | 同一页按角色渲染评分 / 审核表单                                      |
| `pages/inbox`                                | `app/inbox/page.tsx`                                                 | 已读 / 折叠状态与红点，localStorage 键名不变                         |
| `pages/import`                               | `app/import/page.tsx`                                                |                                                                      |
| `pages/noMatch`                              | `components/common/states.tsx` `NotFoundView` + `app/not-found.tsx`  |                                                                      |
| `components/TopBar`                          | `components/layout/site-header.tsx`                                  | 面包屑从「注释掉」恢复为可用                                         |
| `components/CompetitionNotice`               | `components/competition/competition-notice.tsx`                      |                                                                      |

未迁移的旧文件均为**死代码**，已逐一确认无任何引用：
`pages/Result`（路由被注释）、`pages/approve`（占位组件）、`pages/create/Components/createSteps`、
`pages/workDetail/component/*`、`pages/reviewApprover/components`（PDF 预览，import 已被注释）、
`pages/workDetail/schema_*.json`（示例文件）。

## 2. 接口

`lib/api/` 与旧版 `src/api/` **一一对应**，方法、URL、查询参数、请求体字段完全一致。
`lib/api/__tests__/endpoints.test.ts` 用 19 个用例逐个断言，可作为回归基线。

旧版存在但从未被 UI 调用的接口也一并保留：
`fileDownload`、`getUserInfo`、`getSignedCompetitionList`、`deleteWork`、`uploadWork`、`reviewPoint`、`scorePoint`。

新增 2 个接口封装：`importAccountsFromExcel`（`POST /review/import?depId=1`，建学生）
与 `importJudgeAccounts`（`POST /admin/judge/import?depId=1`，建评委）。
旧版把前者硬编码在 antd `Upload` 的 `action` 里，现在收敛进接口层，请求本身没有变化；
后者是旧版就存在、界面一直没接的管理员接口——评委管理页原先误用了「一键导入」的学生接口。

唯一未迁移的是 `uploadFile`：旧版是 `apis({ method: 'post' })`，没有 URL，属于无效残留。

### 两处请求细节的调整

1. `deleteCompetitionInfo` 旧版用 `qs.stringify` 生成字符串体，XHR 会把 `Content-Type` 置为 `text/plain`；
   现改用 `URLSearchParams`，请求体仍是 `comId=<id>`，但 `Content-Type` 为标准的 `application/x-www-form-urlencoded`。
2. GET 请求上旧版挂了一个从未生效的 `FormData` body（浏览器会丢弃），已移除，URL 参数不变。

## 3. 路由

静态导出（`output: "export"`，Tauri 打包必需）不支持未知的动态路由段，
因此路径参数改为查询参数，映射表见 `CLAUDE.md` 的「路由与查询参数」。

顺带修掉了旧版的一处不一致：评审入口跳 `/review/list?comId=x&page=1`，审核入口跳 `/review/list/x/1`，
现在两者统一。

## 4. 依赖替换

| 旧                         | 新                                                          |
| -------------------------- | ----------------------------------------------------------- |
| antd 4 + @ant-design/icons | shadcn/ui + lucide-react                                    |
| recoil                     | zustand                                                     |
| react-router-dom           | Next.js App Router                                          |
| form-render 1.13           | `components/schema-form/`（自研，schema 格式兼容）          |
| moment                     | `lib/datetime.ts`（原生 Date）                              |
| sass / scss                | Tailwind CSS v4                                             |
| qs                         | `URLSearchParams`                                           |
| file-saver                 | `lib/file.ts` `saveBlob`                                    |
| react-pdf-js               | 未迁移（旧版已注释停用）                                    |
| axios 0.27                 | axios 1.x                                                   |
| xlsx                       | xlsx（保留）                                                |
| @sentry/react              | @sentry/react（保留，改为按 `NEXT_PUBLIC_SENTRY_DSN` 开关） |

## 5. 行为差异（均为有意为之）

1. **创建比赛的团队人数上限**：旧版在提交前强制 `max_team_members = 15`，导致人数下拉框完全失效。
   现在按管理员实际选择提交。若要恢复旧行为，在 `app/manage/create/page.tsx` 的 `postCompetition` 里
   把 `{ ...competitionInfo, user_code: profile.code }` 改成 `{ ...competitionInfo, user_code: profile.code, max_team_members: 15 }`。
2. **创建比赛新增前端校验**：比赛名称与简介不能为空，旧版无任何校验直接提交。
3. **个人赛报名**：旧版 `onFinish` 会读 `formData.listOfParti.select_numOfParti`，个人赛下该对象不存在会抛
   `TypeError` 导致提交失败；新版做了兜底，个人赛可以正常提交。
4. **登录成功后**不再 `window.location.reload()`，改为客户端跳转到 `/account`。
5. **Sentry** 默认关闭，配置 `NEXT_PUBLIC_SENTRY_DSN` 后才初始化（旧版 DSN 见 `.env.example` 注释）。
6. **公告编辑**的回填数据改为通过 `getCompetitionNoticeList` 重新拉取，
   而不是依赖 react-router 的 `location.state`（App Router 没有等价能力，刷新也不会丢数据）。

## 6. 兼容性

`localStorage` 键名与旧版完全一致（`approval-system-token`、`userState`、`inboxPoint`、
`allReadState`、`allFoldState`、`everyInboxMessageState`、`listTotal`、`reviewEnd` 等），
旧版用户的登录态可以直接沿用。

## 7. 验证

```bash
pnpm typecheck   # 0 error
pnpm lint        # 0 error（2 个 warning 来自 shadcn 自带组件与 docs 子包，非本次改动）
pnpm test        # 11 suites / 68 tests
pnpm build       # 19 条路由全部静态导出成功
```
