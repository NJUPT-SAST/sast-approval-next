# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SAST 通用比赛管理评审系统** 是南京邮电大学大学生科技协会的赛事管理与评审平台。
本仓库是旧版 `approval-system`（CRA + antd 4 + Recoil + react-router 6）在新技术栈上的完整重写：
Next.js 16 (React 19) + Tauri 2.11 + TypeScript + Tailwind CSS v4 + shadcn/ui + Zustand。

后端接口沿用旧版，未做任何改动，详见 `lib/api/`。逐页迁移对照见 `MIGRATION.md`。

**Dual Runtime Model:**

- **Web mode** (`pnpm dev`): Next.js dev server at <http://localhost:3000>
- **Desktop mode** (`pnpm tauri dev`): Tauri wraps Next.js in a native window

### 业务角色

登录后按后端返回的 `role` 映射为四种角色，决定侧边栏菜单与可访问路由（见 `lib/navigation.ts` 与 `lib/store/user.ts`）：

| role | 角色                | 主要能力                                        |
| ---- | ------------------- | ----------------------------------------------- |
| 0    | `user` 参赛选手     | 浏览比赛、报名、提交项目材料                    |
| 1    | `judge` 审核人员    | 审核项目、一键导入账号                          |
| 2    | `approver` 评审专家 | 给项目评分与评语                                |
| 3    | `admin` 系统管理员  | 创建/编辑比赛、公告、白名单、评委分配、数据导出 |

访问角色白名单之外的路由会渲染应用内 404（`AppShell` 里的 `canAccess`），而不是跳转。

## Development Commands

```bash
# Frontend (main app, port 3000)
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production (outputs to out/, 20 routes)
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting without writing
pnpm typecheck        # TypeScript --noEmit

# Testing
pnpm test             # Run Jest tests (17 suites / 128 tests)
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report

# Desktop (Tauri). No `tauri` script in package.json, pnpm resolves node_modules/.bin
pnpm tauri dev        # Dev mode with hot reload
pnpm tauri build      # Build desktop installer
pnpm tauri info       # Check Tauri environment

# Docs site (pnpm workspace, port 3001)
pnpm docs:dev         # Start Fumadocs dev server
pnpm docs:build       # Build docs for production
pnpm docs:start       # Start docs production server

# Add shadcn/ui components
pnpm dlx shadcn@latest add <component-name>
```

`pnpm start` is inherited from the starter and is unusable here: `output: "export"` has no server.

## Architecture

### Workspace Structure

This is a **pnpm monorepo** with two packages:

| Package  | Path       | Port | Purpose                                          |
| -------- | ---------- | ---- | ------------------------------------------------ |
| Main app | `/` (root) | 3000 | Next.js + Tauri desktop app (`output: "export"`) |
| Docs     | `docs/`    | 3001 | Fumadocs documentation site (full server mode)   |

Root `pnpm-lock.yaml` is the single lockfile for all packages. Run `pnpm install` from the repo root.

### Frontend Structure (main app)

```
app/                       路由（全部为客户端页面，静态导出）
  layout.tsx               metadata / 字体 / Providers / AppShell
  page.tsx                 登录后重定向到 /account
  not-found.tsx            静态导出的 404
  account/                 我的账号
  activity/                比赛入口（列表）
    detail/                比赛详情
    register/              报名
    register-detail/       报名参加详情
    work-detail/           项目提交信息
    notice/                发布 / 编辑公告（管理员）
    manage/                管理比赛（管理员）
      edit/                编辑比赛
      white-list/          编辑白名单
  manage/                  比赛管理列表（管理员）
    create/                创建比赛
    judge/                 评委账号管理（管理员）
    student/               学生账号管理（管理员）
  review/                  评审 / 审核入口
    list/                  比赛项目列表
    detail/                项目评审 / 审核
  inbox/                   收件箱
  import/                  一键导入账号（审核人员）

components/
  layout/                  AppShell、侧边栏、手机端底部导航、导航图标、页头页脚、主题切换、Providers
  auth/login-view.tsx      登录页（含验证码）
  common/                  PageHeader、分区标题、统计条、表格容器、状态占位、分页、
                           日期时间选择、文件拖拽、步骤条
  competition/             比赛卡片与表单、封面上传、时间区间、评委分配、白名单、公告
  schema-form/             轻量 JSON-Schema 表单引擎（替代旧版 form-render）
  manage/                  账号管理：AccountManager（增删改查）、AccountImportDialog（导入弹窗）、
                           AccountImportView（整页导入，一键导入与审批人员的学生管理共用）
  ui/                      56 个 shadcn/ui 组件（**不要在此写测试**）

hooks/use-mobile.ts        断点判断，供 components/ui/sidebar 使用
i18n/                      next-intl 脚手架，当前未接入 UI（见「遗留脚手架」）

lib/
  api/                     接口层：client / admin / judge / public / user（48 个接口）
  store/                   Zustand：user（登录态）、ui（面包屑动态标题）
  constants/               表单模板、学院列表、报名 schema、站内信
  types/                   接口与业务类型
  hooks/                   use-load-state（请求键驱动的加载状态）、use-query-params（列表状态写进地址栏）、
                           use-logout、use-validate-code（登录验证码）
  competition-validation.ts 创建 / 编辑比赛的提交前校验与 review_settings 整理
  navigation.ts            角色 → 菜单 / 路由白名单 / 面包屑
  storage.ts               localStorage 封装（键名与旧版兼容）
  file.ts / datetime.ts    下载、文件名、时间格式化
  monitoring.ts            Sentry（仅在配置 DSN 时启用）
  console-banner.ts        控制台 SAST ASCII 彩蛋
  env.ts                   NEXT_PUBLIC_* 读取与校验
  tauri.ts                 Rust 命令的类型化封装（唯一调用 invoke() 的文件）

public/assets/             Logo、登录背景、头像等图片
```

### 页面布局约定

- **少用卡片**：页面分区用 `Section` + `SectionList`（标题 + 分割线）组织，长表单用 `layout="split"`（左标题右表单）；
  只有表格 / 列表这类需要边界的内容才包一层 `TableSurface` / `MobileList`。
- **表格在手机上换成列表**：桌面端 `<TableSurface className="hidden md:block">`，手机端 `<MobileList className="md:hidden">` + `MobileListItem`。
- **表单类页面的操作按钮**：桌面端放在表单内容末尾，并使用上边框与正文分隔；
  同一组主要操作放进页面末尾的 `MobileActionBar`，手机上固定在底部。表单页的
  `PageHeader` 只显示标题与描述，不放提交、保存、取消等操作。详情页、列表页的创建、
  下载、筛选等页面级操作仍可放入 `PageHeader.actions`。
- **导航**：桌面端为侧边栏；手机端一级页面显示底部 `MobileTabBar`，子页面隐藏底栏、页头显示返回按钮
  （由 `isTopLevelPath()` 判定）。页脚只在 `md` 及以上显示。
- Tailwind v4 的堆叠变体从左到右生效，作用于子元素请写 `[&>*:first-child]:…` 这类任意变体，不要写 `first:*:…`。

### 交互约定

- **列表状态放进地址栏**：分页、搜索词用 `useQueryParams()` + `readPositiveInt()` 读写，进入详情再返回能回到原来的页码。
  写入走原生 `history.replaceState`（Next 会同步到 `useSearchParams`），不要改成 `router.replace`：
  静态导出下带查询参数直接打开侧边栏页面后，同路径的 `router.replace` 会被预取缓存还原成原地址。
  用到它的页面同样要包 `<Suspense>`。
- **加载失败 ≠ 没有数据**：请求失败渲染 `ErrorState`（带「重新加载」），只有真的没有数据才用 `EmptyState`。
- **提交失败不离开表单**：在表单末尾用 `Alert variant="destructive"` 提示，已填写的内容保留；
  只有成功才切到 `ResultState`。表单校验失败时滚到并聚焦第一个出错的控件（`SchemaForm` 已内置，
  其它表单用 `lib/focus-field.ts`）。
- **按时间窗口给出可用状态**：报名、提交、评审超出时间范围时，按钮置灰并直接写明原因，不要等后端报错。
- **删除确认**：`AlertDialogAction` 的 `onClick` 里 `event.preventDefault()`，等请求结束再关闭，期间显示加载态。
- **整行可点的列表项里放菜单**：用 `MobileListItem` 的 `menu`，渲染在链接之外，不要把按钮嵌进 `<a>`。
- **动画克制**：页面切换与列表加载完成用 `motion-safe:animate-fade-enter`（只动透明度，240ms），
  折叠内容用 `animate-collapsible-down/up`。不要在页面容器上用 tw-animate 的 `animate-in`：
  它的关键帧带 transform，动画期间会让页面里 `fixed` 的底部操作栏错位。

### 路由与查询参数

静态导出（`output: "export"`）不支持未知的动态路由段，因此旧版的路径参数统一改为查询参数，
其余路径保持一致：

| 旧版                                 | 新版                              |
| ------------------------------------ | --------------------------------- |
| `/activity/:id`                      | `/activity/detail?id=`            |
| `/activity/:id/register`             | `/activity/register?id=`          |
| `/activity/:id/register-detail`      | `/activity/register-detail?id=`   |
| `/activity/:id/work-detail`          | `/activity/work-detail?id=`       |
| `/activity/:id/manage`               | `/activity/manage?id=`            |
| `/activity/:id/manage/edit`          | `/activity/manage/edit?id=`       |
| `/activity/:id/manage/editWhiteList` | `/activity/manage/white-list?id=` |
| `/activity/:id/notice(/:noticeId)`   | `/activity/notice?id=&noticeId=`  |
| `/review/list/:comId/:page`          | `/review/list?comId=&page=`       |
| `/review/detail/:id`                 | `/review/detail?id=`              |

任何使用 `useSearchParams()` 的页面都必须包在 `<Suspense>` 里，否则静态导出会报错。

### 接口层

- `lib/api/client.ts` 创建 axios 实例，请求头注入 `Token`，响应里 `errCode` 为 1003 / 1005 时清空登录态并跳回登录页。
- 基地址：开发环境走 `next.config.ts` 的 `/api` rewrites 代理（目标是 `NEXT_PUBLIC_API_ORIGIN`）。生产 / Tauri 为静态导出，必须通过 `NEXT_PUBLIC_API_BASE_URL` 指定绝对地址，缺省回落到 `https://approve.sast.fun/api`。
- `lib/api/__tests__/endpoints.test.ts` 用 19 个用例逐个断言方法、URL 与请求体，**修改接口层时先跑这个测试**。

### 表单引擎

`components/schema-form/` 用 shadcn 组件复刻了旧版 form-render 1.x 的能力，
后端下发的 schema 无需改动即可渲染：

- `useSchemaForm()` 提供 `setValueByPath` / `getValues` / `submit`，与旧版 `useForm` 对齐
- 支持嵌套对象、`select` / `radio` / `slider` / `textarea`、`required`、`rules.pattern`、`default`、`order`
- `widgets` 属性注入自定义控件，项目提交页用 `createSchemaUploader(competitionId)` 实现对象存储直传

### 环境变量

`.env.example` 是唯一的清单，`env.d.ts` 声明类型，`lib/env.ts` 做必填校验。

| 变量                       | 用途                                                  |
| -------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`     | 必填，应用显示名                                      |
| `NEXT_PUBLIC_API_BASE_URL` | 生产 / Tauri 必填，后端绝对地址                       |
| `NEXT_PUBLIC_API_ORIGIN`   | `pnpm dev` 的代理目标                                 |
| `NEXT_PUBLIC_SENTRY_DSN`   | 留空则完全不初始化 Sentry                             |
| `NEXT_PUBLIC_APP_VERSION`  | Sentry release 标记，当前与 package.json 同为 `3.0.0` |

### Docs Structure (`docs/`)

- `docs/app/` - Next.js App Router for the docs site
  - `docs/app/layout.tsx` - Root layout with `RootProvider` (from `fumadocs-ui/provider/next`)
  - `docs/app/docs/layout.tsx` - `DocsLayout` with sidebar
  - `docs/app/docs/[[...slug]]/page.tsx` - Dynamic MDX page
  - `docs/app/api/search/route.ts` - Orama full-text search
- `docs/lib/source.ts` - Fumadocs loader (imports from `collections/server`)
- `docs/source.config.ts` - Content collection definition
- `docs/content/docs/` - MDX content files and `meta.json` sidebar config
- `docs/superpowers/` - 历史设计文档与实施计划，描述的是模板阶段的状态，不代表当前实现
- `docs/.source/` - **Auto-generated** by fumadocs-mdx at dev/build time (gitignored)

**Docs-specific import conventions:**

- Source loader: `import { source } from "@/lib/source"` (NOT `@/app/source`)
- Collection output: `import { docs } from "collections/server"` (tsconfig alias → `.source/`)
- Provider: `fumadocs-ui/provider/next` (NOT `fumadocs-ui/provider`)

### Installed shadcn/ui Components

All 56 components are pre-installed, import directly and do not run `shadcn add` for these:

`accordion` · `alert` · `alert-dialog` · `aspect-ratio` · `avatar` · `badge` · `breadcrumb` · `button` · `button-group` · `calendar` · `card` · `carousel` · `chart` · `checkbox` · `collapsible` · `combobox` · `command` · `context-menu` · `dialog` · `direction` · `drawer` · `dropdown-menu` · `empty` · `field` · `form` · `hover-card` · `input` · `input-group` · `input-otp` · `item` · `kbd` · `label` · `menubar` · `native-select` · `navigation-menu` · `pagination` · `popover` · `progress` · `radio-group` · `resizable` · `scroll-area` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` · `slider` · `sonner` · `spinner` · `switch` · `table` · `tabs` · `textarea` · `toggle` · `toggle-group` · `tooltip`

`TooltipProvider` is already mounted in `app/layout.tsx`, no extra wrapper needed.

### Tauri Integration

- `src-tauri/` - Rust backend
  - `tauri.conf.json` - `frontendDist` 指向 `../out`，`identifier` 为 `fun.sast.approval`
  - `beforeDevCommand`: runs `pnpm dev`
  - `beforeBuildCommand`: runs `pnpm build`
  - CSP 的 `connect-src` 已放行 `https://approve.sast.fun`。换后端地址时必须同步修改，否则桌面端请求会被静默拦截
- `src/commands.rs` 目前只注册了 `greet`，没有 UI 调用方，作为 IPC 写法的样例保留

### Styling System

- **Tailwind v4** via PostCSS (`@tailwindcss/postcss`)
- CSS variables for theme colors (oklch color space) in `globals.css`
- Dark mode: class-based, driven by `next-themes` (`attribute="class"`, `defaultTheme="system"`)
- Custom variant: `@custom-variant dark (&:is(.dark *))`

### Path Aliases

`@/components`, `@/lib`, `@/utils`, `@/ui`, `@/hooks` - all configured in tsconfig.json and components.json

## Code Patterns

```tsx
// Always use cn() for conditional classes
import { cn } from "@/lib/utils"
cn("base-classes", condition && "conditional", className)

// Button composition with asChild
<Button asChild>
  <Link href="/path">Click me</Link>
</Button>
```

```tsx
// Calling Rust from the frontend (Tauri only), see lib/tauri.ts
import { greet, isTauri } from "@/lib/tauri"
if (isTauri()) {
  greet("World").then((msg) => console.log(msg))
}
```

## 遗留脚手架

来自初始模板、当前没有运行时调用方的部分。改动前先确认是否值得直接删掉，而不是顺手扩展：

- `i18n/` 与 `next.config.ts` 的 `next-intl` 插件：没有任何组件调用 `useTranslations`，也没有挂载 `NextIntlClientProvider`，`i18n/messages/*.json` 里仍是模板文案。UI 目前只有中文。
- `lib/env.ts`、`lib/tauri.ts` 的 `greet`：只有测试覆盖，业务代码未调用。
- `public/next.svg`、`vercel.svg`、`window.svg`、`file.svg`、`globe.svg`。

## Critical Notes

- **Always use pnpm** (lockfile present). Run `pnpm install` from repo root to install all workspaces
- **Tauri production builds require static export**: `next.config.ts` (main app) has `output: "export"`, do not remove it
- **Docs does NOT use static export**: `docs/next.config.ts` is full server mode, keep them separate
- **Rust toolchain**: Requires v1.77.2+ for Tauri builds
- **Docs `.source/` is generated**: run `pnpm docs:dev` or `pnpm docs:build` once before TypeScript resolves `collections/server`
- shadcn/ui configured with "new-york" style and RSC mode
- **所有页面都是客户端组件**：登录态存在 localStorage，`AppShell` 在水合完成前渲染骨架，未登录时只渲染登录页
- **不要在 effect 里同步调用 setState**：`eslint-config-next` 的 React Compiler 规则会报错，加载状态请用 `lib/hooks/use-load-state.ts`
- **接口保持与旧版一致**：新增/修改 `lib/api/` 时同步更新 `lib/api/__tests__/endpoints.test.ts`
- **版本号三处对齐**：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 当前都是 `3.0.0`
