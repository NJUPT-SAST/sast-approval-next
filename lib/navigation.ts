import type { UserRole } from "@/lib/store/user"

export type NavItem = {
  href: string
  label: string
  icon: string
  /** 是否显示未读红点 */
  badge?: "inbox"
}

/** 侧边栏导航，逐条对应旧版 AdminMenu / ApproveMenu / JudgeMenu / UserMenu */
export const NAV_BY_ROLE: Record<Exclude<UserRole, "offline">, NavItem[]> = {
  admin: [
    { href: "/account", label: "我的账号", icon: "dashboard" },
    { href: "/inbox", label: "收件箱", icon: "inbox", badge: "inbox" },
    { href: "/activity", label: "比赛入口", icon: "send" },
    { href: "/manage", label: "比赛管理", icon: "settings" },
    { href: "/manage/judge", label: "评委管理", icon: "users" },
    { href: "/manage/student", label: "学生管理", icon: "students" },
  ],
  approver: [
    { href: "/account", label: "我的账号", icon: "dashboard" },
    { href: "/inbox", label: "收件箱", icon: "inbox", badge: "inbox" },
    { href: "/activity", label: "比赛入口", icon: "send" },
    { href: "/review", label: "比赛审批", icon: "clipboard" },
    { href: "/review/student", label: "学生管理", icon: "students" },
  ],
  judge: [
    { href: "/account", label: "我的账号", icon: "dashboard" },
    { href: "/inbox", label: "收件箱", icon: "inbox", badge: "inbox" },
    { href: "/activity", label: "比赛入口", icon: "send" },
    { href: "/review", label: "比赛评审", icon: "clipboard" },
    { href: "/import", label: "一键导入", icon: "import" },
  ],
  user: [
    { href: "/account", label: "我的账号", icon: "dashboard" },
    { href: "/inbox", label: "收件箱", icon: "inbox", badge: "inbox" },
    { href: "/activity", label: "比赛入口", icon: "send" },
  ],
}

/** 「我的账号」常用入口里每个菜单项的一句话说明，按角色区分措辞 */
export function navItemHint(role: UserRole, href: string): string {
  switch (href) {
    case "/inbox":
      return "查看系统通知与站内信"
    case "/activity":
      return role === "user" ? "浏览比赛、报名并提交项目材料" : "浏览全部比赛的介绍、公告与时间安排"
    case "/manage":
      return "创建、编辑比赛，分配评委并导出数据"
    case "/manage/judge":
      return "新增、编辑评委账号，或从 Excel 批量导入"
    case "/manage/student":
      return "新增、编辑学生账号，或从 Excel 批量导入"
    case "/review":
      return role === "judge" ? "审核分配给你的参赛项目" : "为分配给你的参赛项目打分"
    case "/review/student":
      return "从 Excel 批量导入学生账号"
    case "/import":
      return "从 Excel 批量创建账号并导出初始密码"
    default:
      return ""
  }
}

/** 每个角色可访问的路由白名单，未命中渲染 404，行为等价于旧版按角色注册路由表 */
const ROUTES_BY_ROLE: Record<Exclude<UserRole, "offline">, string[]> = {
  admin: [
    "/",
    "/account",
    "/inbox",
    "/activity",
    "/activity/detail",
    "/activity/manage",
    "/activity/manage/edit",
    "/activity/manage/white-list",
    "/activity/notice",
    "/manage",
    "/manage/create",
    "/manage/judge",
    "/manage/student",
  ],
  approver: [
    "/",
    "/account",
    "/inbox",
    "/activity",
    "/activity/detail",
    "/review",
    "/review/list",
    "/review/detail",
    "/review/student",
  ],
  judge: [
    "/",
    "/account",
    "/inbox",
    "/activity",
    "/activity/detail",
    "/review",
    "/review/list",
    "/review/detail",
    "/import",
  ],
  user: [
    "/",
    "/account",
    "/inbox",
    "/activity",
    "/activity/detail",
    "/activity/register",
    "/activity/register-detail",
    "/activity/work-detail",
  ],
}

/** 是否为一级页面（侧边栏 / 底部导航直达的页面） */
export function isTopLevelPath(role: UserRole, pathname: string) {
  if (role === "offline") return false
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname
  if (normalized === "/") return true
  return NAV_BY_ROLE[role].some((item) => item.href === normalized)
}

/**
 * 当前应该高亮的菜单项 href，没有匹配时返回 null。
 *
 * 菜单项之间可能存在前缀关系（`/manage` 与 `/manage/judge`），
 * 只认匹配得最长的那一项，否则父子两项会同时高亮。
 */
export function activeNavHref(role: UserRole, pathname: string) {
  if (role === "offline") return null
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname
  // 登录后的落地页重定向到 /account，根路径按「我的账号」高亮
  if (normalized === "/") return "/account"
  return NAV_BY_ROLE[role].reduce<string | null>((best, item) => {
    const matched = normalized === item.href || normalized.startsWith(`${item.href}/`)
    if (!matched) return best
    return best === null || item.href.length > best.length ? item.href : best
  }, null)
}

export function canAccess(role: UserRole, pathname: string) {
  if (role === "offline") return false
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname
  return ROUTES_BY_ROLE[role].includes(normalized)
}

/** 面包屑名称映射，沿用旧版 TopBar 的文案 */
export function breadcrumbNameMap(role: UserRole): Record<string, string> {
  const reviewValue = role === "judge" ? "比赛审核" : "比赛评审"
  return {
    "/activity": "比赛入口",
    "/inbox": "收件箱",
    "/manage": "比赛管理",
    "/manage/create": "创建比赛",
    "/manage/judge": "评委管理",
    "/manage/student": "学生管理",
    "/account": "我的账号",
    "/review": reviewValue,
    "/review/list": "项目列表",
    "/review/detail": role === "approver" ? "比赛审批" : "比赛评审",
    "/review/student": "学生管理",
    "/activity/detail": "比赛详情",
    "/activity/register": "比赛报名",
    "/activity/register-detail": "报名参加详情",
    "/activity/work-detail": "项目提交信息",
    "/activity/manage": "管理比赛",
    "/activity/manage/edit": "编辑比赛",
    "/activity/manage/white-list": "编辑白名单",
    "/activity/notice": "发布公告",
    "/import": "一键导入",
  }
}

/** 生成带查询参数的路径 */
export function withQuery(path: string, query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}
