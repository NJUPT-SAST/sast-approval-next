# SAST 通用比赛管理评审系统 (sast-approval-next)

南京邮电大学大学生科学技术协会（SAST）的赛事管理与评审平台。

本仓库是旧版 [`approval-system`](https://github.com/NJUPT-SAST/approval-system)（CRA + antd 4 + Recoil + react-router 6）在新技术栈上的完整重写。后端接口未做任何改动，`lib/api/` 与旧版 `src/api/` 一一对应。

[English](./README.md) · [迁移说明 MIGRATION.md](./MIGRATION.md)

## 技术栈

| 方向     | 选型                                                       |
| -------- | ---------------------------------------------------------- |
| 框架     | Next.js 16（App Router，`output: "export"`）+ React 19     |
| 语言     | TypeScript 5.9（strict）                                   |
| 样式     | Tailwind CSS v4（PostCSS）、oklch CSS 变量、class 深色模式 |
| 组件     | shadcn/ui（new-york 风格），`components/ui/` 下 56 个组件  |
| 状态     | Zustand 5                                                  |
| 请求     | axios 1.x                                                  |
| 桌面端   | Tauri 2.11（需要 Rust 1.77.2+）                            |
| 测试     | Jest 30 + Testing Library，jsdom 环境                      |
| 异常上报 | Sentry（可选，仅在配置 `NEXT_PUBLIC_SENTRY_DSN` 后启用）   |
| 文档站   | Fumadocs，独立的 pnpm workspace 子包 `docs/`               |

同一份代码支持两种运行形态：

- **Web**（`pnpm dev`）：Next.js 开发服务器，<http://localhost:3000>
- **桌面端**（`pnpm tauri dev`）：Tauri 把静态导出包进原生窗口

## 业务角色

登录后按后端返回的数字 `role` 映射（见 `lib/store/user.ts`），角色决定侧边栏菜单与可访问路由白名单（见 `lib/navigation.ts`）。访问白名单之外的路由会渲染应用内 404。

| `role` | 键名       | 角色         | 主要能力                                        |
| ------ | ---------- | ------------ | ----------------------------------------------- |
| 0      | `user`     | 参赛选手     | 浏览比赛、报名、提交项目材料                    |
| 1      | `approver` | 审批审核人员 | 审核项目（`/review/*`）、学生管理、一键导入账号 |
| 2      | `judge`    | 评委         | 给项目评分与评语（`/score/*`）                  |
| 3      | `admin`    | 系统管理员   | 创建/编辑比赛、公告、白名单、评委分配、数据导出 |

## 环境要求

- **Node.js** 20.x 及以上（见 `.nvmrc`）
- **pnpm** 10.x（`packageManager` 锁定在 pnpm 10.30.3）
- **Rust** 1.77.2 及以上，仅桌面端构建需要
  - Windows：Visual Studio C++ Build Tools
  - macOS：Xcode Command Line Tools
  - Linux：见 [Tauri 环境要求](https://tauri.app/start/prerequisites/)

## 快速开始

```bash
git clone https://github.com/NJUPT-SAST/sast-approval-next.git
cd sast-approval-next
pnpm install          # 必须在仓库根目录执行，会一并安装 workspace 子包
cp .env.example .env.local
pnpm dev
```

`pnpm install` 会通过 `prepare` 脚本顺带安装 Husky git hooks。

## 脚本

### 主应用（端口 3000）

| 命令                 | 说明                            |
| -------------------- | ------------------------------- |
| `pnpm dev`           | 启动开发服务器，`/api` 代理生效 |
| `pnpm build`         | 静态导出到 `out/`（19 条路由）  |
| `pnpm lint`          | 运行 ESLint                     |
| `pnpm lint:fix`      | ESLint 自动修复                 |
| `pnpm format`        | Prettier 格式化                 |
| `pnpm format:check`  | 只检查格式不写入                |
| `pnpm typecheck`     | `tsc --noEmit`                  |
| `pnpm test`          | Jest（11 个套件，68 个用例）    |
| `pnpm test:watch`    | Jest watch 模式                 |
| `pnpm test:coverage` | 生成覆盖率报告到 `coverage/`    |

`pnpm start` 虽然存在但在本项目用不上。`output: "export"` 产出的是纯静态站点，直接用任意静态服务器托管 `out/` 即可。

### 桌面端（Tauri）

| 命令               | 说明                    |
| ------------------ | ----------------------- |
| `pnpm tauri dev`   | 开发模式，支持热重载    |
| `pnpm tauri build` | 构建当前平台的安装包    |
| `pnpm tauri info`  | 打印 Tauri 环境诊断信息 |

`package.json` 里并没有 `tauri` 脚本，pnpm 会直接调用 `node_modules/.bin` 下的可执行文件。

### 文档站（端口 3001）

| 命令              | 说明                                               |
| ----------------- | -------------------------------------------------- |
| `pnpm docs:dev`   | 启动 Fumadocs 开发服务器，同时生成 `docs/.source/` |
| `pnpm docs:build` | 构建文档站                                         |
| `pnpm docs:start` | 以生产模式启动文档站                               |

### shadcn/ui

56 个组件已全部落到 `components/ui/`，直接 import 即可。只有确实需要新组件时才执行：

```bash
pnpm dlx shadcn@latest add <component-name>
```

## 目录结构

```
app/                        路由，全部为客户端页面，静态导出
  layout.tsx                metadata、字体、Providers、AppShell
  page.tsx                  已登录时重定向到 /account
  not-found.tsx             静态导出的 404
  account/                  我的账号
  activity/                 比赛入口（列表）
    detail/                 比赛详情
    register/               报名
    register-detail/        报名参加详情
    work-detail/            项目提交信息（schema 表单 + 对象存储直传）
    notice/                 发布 / 编辑公告（管理员）
    manage/                 管理比赛（管理员）
      edit/                 编辑比赛
      white-list/           编辑白名单
  manage/                   比赛管理列表（管理员）
    create/                 创建比赛（两步）
  review/                   评审 / 审核入口
    list/                   比赛项目列表
    detail/                 项目评审（评委）或项目审核（审核人员）
  inbox/                    收件箱
  import/                   一键导入账号（审核人员）

components/
  layout/                   AppShell、侧边栏、手机端底部导航、导航图标、页头页脚、主题切换、Providers
  auth/login-view.tsx       登录页（含验证码）
  common/                   PageHeader、分区标题、统计条、表格容器、状态占位、分页、
                            日期时间选择、文件拖拽、步骤条
  competition/              比赛卡片与表单、封面上传、时间区间、评委分配、白名单、公告
  schema-form/              自研 JSON-Schema 表单引擎（替代旧版 form-render）
  ui/                       56 个 shadcn/ui 组件，不要在此写测试

hooks/use-mobile.ts         断点判断，供 components/ui/sidebar 使用
i18n/                       next-intl 脚手架，说明见下方「遗留脚手架」

lib/
  api/                      接口层 client / admin / judge / public / user（48 个接口）
  store/                    Zustand：user（登录态）、ui（面包屑动态标题）
  constants/                表单模板、学院列表、报名 schema、站内信文案
  types/                    接口与业务类型
  hooks/                    use-load-state（请求键驱动的加载状态）、use-logout
  navigation.ts             角色到菜单 / 路由白名单 / 面包屑的映射
  storage.ts                localStorage 封装（键名与旧版完全一致）
  file.ts、datetime.ts      下载、文件名、时间格式化
  monitoring.ts             Sentry，仅在配置 DSN 时初始化
  console-banner.ts         控制台 SAST ASCII 彩蛋
  env.ts                    NEXT_PUBLIC_* 读取与校验
  tauri.ts                  Rust 命令的类型化封装，全项目唯一调用 invoke() 的地方

public/assets/              Logo、登录背景、头像等图片
src-tauri/                  Rust 桌面壳
docs/                       Fumadocs 文档站（独立子包，独立构建）
```

## 路由与查询参数

静态导出（`output: "export"`）无法预渲染未知的动态路由段，因此旧版的路径参数统一改为查询参数，其余路径保持不变。

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

## 配置

### 环境变量

把 `.env.example` 复制为 `.env.local`。只有 `NEXT_PUBLIC_*` 前缀的变量会暴露给浏览器，本项目所有变量按设计都是公开值，不要往里放任何密钥。

| 变量                       | 是否必填 | 用途                                                             |
| -------------------------- | -------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`     | 必填     | 应用显示名，由 `lib/env.ts` 校验                                 |
| `NEXT_PUBLIC_API_BASE_URL` | 生产必填 | 后端接口绝对地址。开发环境留空即可走代理                         |
| `NEXT_PUBLIC_API_ORIGIN`   | 可选     | `pnpm dev` 时代理的目标后端，默认 `https://approve.sast.fun/api` |
| `NEXT_PUBLIC_SENTRY_DSN`   | 可选     | 留空则完全不初始化 Sentry，也不会有任何外部请求                  |
| `NEXT_PUBLIC_APP_VERSION`  | 可选     | 打在 Sentry release 上的版本号                                   |

### 接口层

- `lib/api/client.ts` 创建 axios 实例，从 localStorage 注入 `Token` 请求头，响应里 `errCode` 为 1003 / 1005 时清空登录态并跳回登录页。
- 基地址：开发环境由 `next.config.ts` 把 `/api/*` rewrite 到 `NEXT_PUBLIC_API_ORIGIN`，规避跨域。生产与 Tauri 都是静态产物，必须用 `NEXT_PUBLIC_API_BASE_URL` 指定绝对地址（缺省回落到 `https://approve.sast.fun/api`）。
- `lib/api/__tests__/endpoints.test.ts` 逐个断言方法、URL 与请求体。改动 `lib/api/` 时先跑这个测试。

### 表单引擎

`components/schema-form/` 用 shadcn 组件复刻了旧版 form-render 1.x 的能力，后端下发的 schema 无需改动即可渲染：

- `useSchemaForm()` 提供 `setValueByPath` / `getValues` / `submit`，与旧版 `useForm` 对齐
- 支持嵌套对象、`select` / `radio` / `slider` / `textarea`、`required`、`rules.pattern`、`default`、`order`
- `widgets` 属性可注入自定义控件。项目提交页用 `createSchemaUploader(competitionId)` 实现对象存储直传

### 路径别名

`@/components`、`@/lib`、`@/ui`、`@/hooks`、`@/utils`，在 `tsconfig.json` 与 `components.json` 中同步配置。

### 前端调用 Rust

`lib/tauri.ts` 是全项目唯一调用 `invoke()` 的文件，业务代码从中 import 具名函数，并用 `isTauri()` 做运行时判断。

1. 在 `src-tauri/src/commands.rs` 新增命令
2. 在 `src-tauri/src/lib.rs` 的 `generate_handler!` 列表里注册
3. 在 `lib/tauri.ts` 加一层类型化封装

目前注册的命令只有 `greet`，没有任何 UI 调用它，保留它是作为 IPC 写法的可运行样例。

## 测试

11 个套件，68 个用例，全部通过。

| 套件                                    | 用例数 | 覆盖内容                    |
| --------------------------------------- | ------ | --------------------------- |
| `lib/api/__tests__/endpoints.test.ts`   | 19     | 每个接口的方法、URL、请求体 |
| `lib/__tests__/navigation.test.ts`      | 9      | 菜单、路由白名单、面包屑    |
| `components/schema-form/__tests__/`     | 8      | schema 表单引擎             |
| `lib/__tests__/register-schema.test.ts` | 6      | 报名 schema                 |
| `lib/__tests__/form-templates.test.ts`  | 5      | 表单模板                    |
| `lib/__tests__/user-store.test.ts`      | 5      | 登录态与角色映射            |
| `lib/__tests__/datetime.test.ts`        | 4      | 时间格式化                  |
| `lib/tauri.test.ts`                     | 4      | IPC 封装                    |
| `lib/__tests__/file.test.ts`            | 3      | 下载工具                    |
| `lib/env.test.ts`                       | 3      | 环境变量校验                |
| `lib/utils.test.ts`                     | 2      | `cn()`                      |

约定与写法详见 [TESTING.md](./TESTING.md)。

## 构建与部署

### Web

```bash
pnpm build          # 产物在 out/
```

用任意静态服务器托管 `out/`（Nginx、对象存储、Netlify、Vercel 均可）。构建时必须设置 `NEXT_PUBLIC_API_BASE_URL`，静态产物没有服务端可以代理。

### 桌面端

```bash
pnpm tauri build
```

产物在 `src-tauri/target/release/bundle/`（Windows 为 `msi`/`nsis`，macOS 为 `dmg`，Linux 为 `AppImage`/`deb`）。应用标识符是 `fun.sast.approval`。

`src-tauri/tauri.conf.json` 的 CSP 已在 `connect-src` 中放行 `https://approve.sast.fun`。如果桌面端要指向别的后端，必须同步把那个源加进去，否则所有请求都会被静默拦截。

更新器签名流程见 [`src-tauri/UPDATER.md`](./src-tauri/UPDATER.md)，updater 插件目前处于关闭状态。

### 文档站

```bash
pnpm docs:build     # 产物在 docs/.next/
```

文档站是完整的 Next.js 服务端应用，独立部署。用 Vercel 时把 Root Directory 设为 `docs/`。

## 遗留脚手架

以下内容来自初始模板，本项目暂未使用。它们不会造成问题，但在你去找调用方之前值得先知道：

- `i18n/` 以及 `next.config.ts` 里的 `next-intl` 插件。没有任何组件调用 `useTranslations`，也没有挂载 `NextIntlClientProvider`，文案文件里还是模板自带的内容。目前 UI 只有中文。
- `lib/env.ts` 与 `lib/tauri.ts` 的 `greet`：有测试覆盖，但没有运行时调用方。
- `public/next.svg`、`vercel.svg`、`window.svg`、`file.svg`、`globe.svg`。

## 常见问题

**`pnpm docs:build` 报 `MODULE_NOT_FOUND`，或 pnpm 提示 "Local package.json exists, but node_modules missing"。**
`docs/` 子包没有安装依赖。在仓库根目录执行 `pnpm install`，不要在子目录里装。

**文档站报 `Cannot find module 'collections/server'`。**
该模块由 fumadocs-mdx 生成到 `docs/.source/`，先跑一次 `pnpm docs:dev` 或 `pnpm docs:build`。

**桌面端请求全部失败，但浏览器正常。**
检查 `src-tauri/tauri.conf.json` 里 CSP 的 `connect-src`，被拦截的请求不会有任何可见报错。

**静态导出报 `useSearchParams` 相关错误。**
把该页面包进 `<Suspense>`。

**3000 端口被占用。**
开发环境的 `assetPrefix` 跟随 `PORT`，请用 `PORT=3001 pnpm dev` 显式指定，不要让 Next.js 静默换端口。

## 参与贡献

commitlint 会在 `commit-msg` 阶段强制 Conventional Commits，`lint-staged` 会对暂存文件跑 ESLint 与 Prettier。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 延伸阅读

- [MIGRATION.md](./MIGRATION.md)：逐页迁移对照、接口差异、有意为之的行为变更
- [TESTING.md](./TESTING.md)：测试组织方式与约定
- [CI_CD.md](./CI_CD.md)：GitHub Actions 工作流与可选 secrets
- [CLAUDE.md](./CLAUDE.md) / [AGENTS.md](./AGENTS.md)：给 AI 编码助手的指引

## 许可证

[MIT](./LICENSE)
