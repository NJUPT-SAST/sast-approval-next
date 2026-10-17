# SAST 通用比赛管理评审系统 (sast-approval-next)

Competition management and review platform for the Student Association for Science and Technology (SAST) at Nanjing University of Posts and Telecommunications.

This repository is a full rewrite of the legacy [`approval-system`](https://github.com/NJUPT-SAST/approval-system) (CRA + antd 4 + Recoil + react-router 6) on a new stack. The backend HTTP API is unchanged: `lib/api/` matches the old `src/api/` method for method.

[中文文档](./README_zh.md) · [迁移说明 MIGRATION.md](./MIGRATION.md)

## Stack

| Area          | Choice                                                          |
| ------------- | --------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, `output: "export"`) + React 19          |
| Language      | TypeScript 5.9 (strict)                                         |
| Styling       | Tailwind CSS v4 (PostCSS), oklch CSS variables, class dark mode |
| Components    | shadcn/ui (new-york style), 56 components in `components/ui/`   |
| State         | Zustand 5                                                       |
| HTTP          | axios 1.x                                                       |
| Desktop shell | Tauri 2.11 (Rust 1.77.2+)                                       |
| Tests         | Jest 30 + Testing Library, jsdom                                |
| Monitoring    | Sentry (opt-in, only when `NEXT_PUBLIC_SENTRY_DSN` is set)      |
| Docs site     | Fumadocs, separate pnpm workspace package in `docs/`            |

Two runtimes from one codebase:

- **Web** (`pnpm dev`): Next.js dev server on <http://localhost:3000>
- **Desktop** (`pnpm tauri dev`): Tauri wraps the static export in a native window

## Roles

The backend returns a numeric `role` on login, mapped in `lib/store/user.ts`. The role decides the sidebar menu and the route allow-list (`lib/navigation.ts`). A route outside the allow-list renders the in-app 404.

| `role` | Key        | Chinese label | Capabilities                                                                  |
| ------ | ---------- | ------------- | ----------------------------------------------------------------------------- |
| 0      | `user`     | 参赛选手      | Browse competitions, sign up, submit project material                         |
| 1      | `approver` | 审批审核人员  | Screen submissions (`/review/*`), manage students, bulk-import accounts       |
| 2      | `judge`    | 评委          | Score submissions and leave comments (`/score/*`)                             |
| 3      | `admin`    | 系统管理员    | Create/edit competitions, notices, white lists, assign reviewers, export data |

## Prerequisites

- **Node.js** 20.x or later (see `.nvmrc`)
- **pnpm** 10.x (`packageManager` is pinned to pnpm 10.30.3)
- **Rust** 1.77.2 or later, only for desktop builds
  - Windows: Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: see [Tauri prerequisites](https://tauri.app/start/prerequisites/)

## Getting started

```bash
git clone https://github.com/NJUPT-SAST/sast-approval-next.git
cd sast-approval-next
pnpm install          # run from the repo root, it covers all workspace packages
cp .env.example .env.local
pnpm dev
```

`pnpm install` also installs the Husky git hooks through the `prepare` script.

## Scripts

### Main app (port 3000)

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `pnpm dev`           | Next.js dev server, with the `/api` proxy enabled |
| `pnpm build`         | Static export to `out/` (19 routes)               |
| `pnpm lint`          | ESLint                                            |
| `pnpm lint:fix`      | ESLint with `--fix`                               |
| `pnpm format`        | Prettier write                                    |
| `pnpm format:check`  | Prettier check                                    |
| `pnpm typecheck`     | `tsc --noEmit`                                    |
| `pnpm test`          | Jest (11 suites, 68 tests)                        |
| `pnpm test:watch`    | Jest watch mode                                   |
| `pnpm test:coverage` | Jest with coverage into `coverage/`               |

`pnpm start` exists but is not usable here. `output: "export"` produces a static site, so serve `out/` with any static host instead.

### Desktop (Tauri)

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `pnpm tauri dev`   | Dev mode with hot reload            |
| `pnpm tauri build` | Build the installer for the host OS |
| `pnpm tauri info`  | Print the Tauri environment report  |

There is no `tauri` entry in `package.json`. pnpm resolves the binary from `node_modules/.bin`.

### Docs site (port 3001)

| Command           | Description                                         |
| ----------------- | --------------------------------------------------- |
| `pnpm docs:dev`   | Fumadocs dev server, also generates `docs/.source/` |
| `pnpm docs:build` | Build the docs site                                 |
| `pnpm docs:start` | Serve the built docs site                           |

### shadcn/ui

All 56 components are already vendored in `components/ui/`. Import them directly. Only run the CLI for something genuinely new:

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Project layout

```
app/                        Routes. Every page is a client component, statically exported.
  layout.tsx                Metadata, fonts, Providers, AppShell
  page.tsx                  Redirects a signed-in user to /account
  not-found.tsx             Static-export 404
  account/                  My account
  activity/                 Competition entry (list)
    detail/                 Competition detail
    register/               Sign-up form
    register-detail/        Sign-up detail
    work-detail/            Project submission (schema form + direct upload)
    notice/                 Publish / edit notice (admin)
    manage/                 Manage one competition (admin)
      edit/                 Edit competition
      white-list/           Edit white list
  manage/                   Competition management list (admin)
    create/                 Create competition (2 steps)
  review/                   Review / screening entry
    list/                   Submissions of one competition
    detail/                 Score (approver) or screen (judge)
  inbox/                    Inbox
  import/                   Bulk account import from Excel (judge)

components/
  layout/                   AppShell, sidebar, mobile tab bar, nav icons, header,
                            footer, theme toggle, Providers
  auth/login-view.tsx       Login page with captcha
  common/                   PageHeader, section, stat strip, data list wrapper,
                            empty/error/loading states, pagination, date-time picker,
                            file dropzone, steps
  competition/              Competition card & form, cover uploader, time range,
                            reviewer assignment, white list, notice
  schema-form/              In-house JSON-Schema form engine (replaces form-render)
  ui/                       56 shadcn/ui components. Do not add tests here.

hooks/use-mobile.ts         Viewport breakpoint hook used by components/ui/sidebar
i18n/                       next-intl scaffolding. See "Known scaffolding" below.

lib/
  api/                      client / admin / judge / public / user (48 endpoints)
  store/                    Zustand: user (auth state), ui (dynamic breadcrumb label)
  constants/                Form templates, college list, sign-up schema, inbox copy
  types/                    API and domain types
  hooks/                    use-load-state (request-key loading state), use-logout
  navigation.ts             role to menu / route allow-list / breadcrumb
  storage.ts                localStorage wrapper (keys kept identical to the old app)
  file.ts, datetime.ts      Download, filename, date formatting
  monitoring.ts             Sentry, only initialised when a DSN is configured
  console-banner.ts         SAST ASCII banner in the browser console
  env.ts                    NEXT_PUBLIC_* reader and validator
  tauri.ts                  Typed wrappers for Rust commands, sole caller of invoke()

public/assets/              Logos, login background, avatar images
src-tauri/                  Rust desktop wrapper
docs/                       Fumadocs site (own package, own build)
```

## Routes and query parameters

`output: "export"` cannot pre-render unknown dynamic segments, so the old path parameters became query parameters. Everything else keeps the old path.

| Legacy                               | Current                           |
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

Any page calling `useSearchParams()` must be wrapped in `<Suspense>`, otherwise the static export fails.

## Configuration

### Environment variables

Copy `.env.example` to `.env.local`. Only `NEXT_PUBLIC_*` variables reach the browser, and every value in this app is public by design. Never put a secret here.

| Variable                   | Required | Purpose                                                                 |
| -------------------------- | -------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`     | yes      | Display name, validated by `lib/env.ts`                                 |
| `NEXT_PUBLIC_API_BASE_URL` | prod     | Absolute backend base URL. Leave empty in dev to use the proxy          |
| `NEXT_PUBLIC_API_ORIGIN`   | no       | Proxy target for `pnpm dev`, defaults to `https://approve.sast.fun/api` |
| `NEXT_PUBLIC_SENTRY_DSN`   | no       | Empty disables Sentry entirely, with no outbound request                |
| `NEXT_PUBLIC_APP_VERSION`  | no       | Tagged on Sentry releases                                               |

### API layer

- `lib/api/client.ts` creates the axios instance, injects the `Token` header from localStorage, and on `errCode` 1003 / 1005 clears the session and returns to the login page.
- Base URL: in development `next.config.ts` rewrites `/api/*` to `NEXT_PUBLIC_API_ORIGIN`, which avoids CORS. Production and Tauri are static, so `NEXT_PUBLIC_API_BASE_URL` must be an absolute URL (it falls back to `https://approve.sast.fun/api`).
- `lib/api/__tests__/endpoints.test.ts` asserts method, URL and request body for each endpoint. Run it first whenever you touch `lib/api/`.

### Form engine

`components/schema-form/` reimplements the capabilities of form-render 1.x with shadcn components, so schemas served by the backend render unchanged:

- `useSchemaForm()` exposes `setValueByPath` / `getValues` / `submit`, matching the old `useForm`
- Supports nested objects, `select` / `radio` / `slider` / `textarea`, `required`, `rules.pattern`, `default`, `order`
- The `widgets` prop injects custom controls. The submission page uses `createSchemaUploader(competitionId)` for direct-to-object-storage upload

### Path aliases

`@/components`, `@/lib`, `@/ui`, `@/hooks`, `@/utils`, configured in both `tsconfig.json` and `components.json`.

### Calling Rust from the frontend

`lib/tauri.ts` is the only file that calls `invoke()`. Business code imports named functions from it and gates them with `isTauri()`.

1. Add the command in `src-tauri/src/commands.rs`
2. Register it in the `generate_handler!` list in `src-tauri/src/lib.rs`
3. Add a typed wrapper in `lib/tauri.ts`

`greet` is currently the only registered command and has no UI caller. It is kept as a working reference for the IPC pattern.

## Testing

11 suites, 68 tests, all green.

| Suite                                   | Tests | Covers                               |
| --------------------------------------- | ----- | ------------------------------------ |
| `lib/api/__tests__/endpoints.test.ts`   | 19    | Every endpoint's method/URL/body     |
| `lib/__tests__/navigation.test.ts`      | 9     | Menus, route allow-list, breadcrumbs |
| `components/schema-form/__tests__/`     | 8     | Schema form engine                   |
| `lib/__tests__/register-schema.test.ts` | 6     | Sign-up schema                       |
| `lib/__tests__/form-templates.test.ts`  | 5     | Form templates                       |
| `lib/__tests__/user-store.test.ts`      | 5     | Auth store and role mapping          |
| `lib/__tests__/datetime.test.ts`        | 4     | Date formatting                      |
| `lib/tauri.test.ts`                     | 4     | IPC wrappers                         |
| `lib/__tests__/file.test.ts`            | 3     | Download helpers                     |
| `lib/env.test.ts`                       | 3     | Env validation                       |
| `lib/utils.test.ts`                     | 2     | `cn()`                               |

Details and conventions: [TESTING.md](./TESTING.md).

## Building and deploying

### Web

```bash
pnpm build          # writes out/
```

Serve `out/` from any static host (Nginx, object storage, Netlify, Vercel). Set `NEXT_PUBLIC_API_BASE_URL` at build time, because a static export has no server to proxy through.

### Desktop

```bash
pnpm tauri build
```

Artifacts land in `src-tauri/target/release/bundle/` (`msi`/`nsis` on Windows, `dmg` on macOS, `AppImage`/`deb` on Linux). The bundle identifier is `fun.sast.approval`.

The Tauri CSP in `src-tauri/tauri.conf.json` allow-lists `https://approve.sast.fun` under `connect-src`. Pointing the desktop build at a different backend requires adding that origin there too, otherwise every request is blocked with no visible error.

Updater signing is described in [`src-tauri/UPDATER.md`](./src-tauri/UPDATER.md). The updater plugin is currently inactive.

### Docs site

```bash
pnpm docs:build     # writes docs/.next/
```

The docs site is a full Next.js server app, deployed independently. On Vercel, set the root directory to `docs/`.

## Known scaffolding

Leftovers from the starter template that this app does not use yet. They are harmless but worth knowing before you go looking for a caller:

- `i18n/` plus the `next-intl` plugin in `next.config.ts`. No component calls `useTranslations`, no `NextIntlClientProvider` is mounted, and the message files still contain starter-template copy. The UI is Chinese-only today.
- `lib/env.ts` and `lib/tauri.ts` (`greet`) are exercised by tests but have no runtime caller.
- `public/next.svg`, `vercel.svg`, `window.svg`, `file.svg`, `globe.svg`.

## Troubleshooting

**`pnpm docs:build` fails with `MODULE_NOT_FOUND`, or pnpm warns "Local package.json exists, but node_modules missing".**
The `docs/` workspace has not been installed. Run `pnpm install` from the repo root, not from a subdirectory.

**`Cannot find module 'collections/server'` in the docs package.**
That module is generated by fumadocs-mdx into `docs/.source/`. Run `pnpm docs:dev` or `pnpm docs:build` once.

**Requests fail in the packaged desktop app but work in the browser.**
Check `connect-src` in the CSP in `src-tauri/tauri.conf.json`. Blocked requests produce no visible error.

**Static export fails with a `useSearchParams` error.**
Wrap the page in `<Suspense>`.

**Port 3000 is taken.** `assetPrefix` follows `PORT` in development, so start with `PORT=3001 pnpm dev` rather than letting Next.js pick a port silently.

## Contributing

Conventional Commits are enforced by commitlint on `commit-msg`, and `lint-staged` runs ESLint plus Prettier on staged files. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Further reading

- [MIGRATION.md](./MIGRATION.md): page-by-page mapping from the legacy app, API deltas, intentional behaviour changes
- [TESTING.md](./TESTING.md): test layout and conventions
- [CI_CD.md](./CI_CD.md): GitHub Actions workflows and optional secrets
- [CLAUDE.md](./CLAUDE.md) / [AGENTS.md](./AGENTS.md): guidance for AI coding assistants

## License

[MIT](./LICENSE)
