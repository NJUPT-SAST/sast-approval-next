import {
  NAV_BY_ROLE,
  breadcrumbNameMap,
  canAccess,
  isTopLevelPath,
  withQuery,
  activeNavHref,
} from "@/lib/navigation"

describe("角色路由与导航", () => {
  it("各角色的侧边栏与旧版菜单一一对应", () => {
    expect(NAV_BY_ROLE.admin.map((item) => item.label)).toEqual([
      "我的账号",
      "收件箱",
      "比赛入口",
      "比赛管理",
      "评委管理",
      "学生管理",
    ])
    expect(NAV_BY_ROLE.approver.map((item) => item.label)).toEqual([
      "我的账号",
      "收件箱",
      "比赛入口",
      "比赛审批",
      "学生管理",
    ])
    expect(NAV_BY_ROLE.judge.map((item) => item.label)).toEqual([
      "我的账号",
      "收件箱",
      "比赛入口",
      "比赛评审",
      "一键导入",
    ])
    expect(NAV_BY_ROLE.user.map((item) => item.label)).toEqual(["我的账号", "收件箱", "比赛入口"])
  })

  it("管理员可以访问管理相关路由，审批人可以访问学生管理", () => {
    expect(canAccess("admin", "/manage")).toBe(true)
    expect(canAccess("admin", "/manage/create")).toBe(true)
    expect(canAccess("admin", "/manage/judge")).toBe(true)
    expect(canAccess("admin", "/manage/student")).toBe(true)
    expect(canAccess("admin", "/activity/manage/edit")).toBe(true)
    expect(canAccess("approver", "/review/student")).toBe(true)
    expect(canAccess("user", "/manage")).toBe(false)
    expect(canAccess("judge", "/manage/judge")).toBe(false)
    expect(canAccess("user", "/activity/manage")).toBe(false)
  })

  it("学生可以访问报名与项目提交，评委不可以", () => {
    expect(canAccess("user", "/activity/register")).toBe(true)
    expect(canAccess("user", "/activity/work-detail")).toBe(true)
    expect(canAccess("approver", "/activity/register")).toBe(false)
  })

  it("一键导入只对审核人员开放", () => {
    expect(canAccess("judge", "/import")).toBe(true)
    expect(canAccess("approver", "/import")).toBe(false)
    expect(canAccess("admin", "/import")).toBe(false)
  })

  it("未登录角色不能访问任何受保护路由", () => {
    expect(canAccess("offline", "/account")).toBe(false)
    expect(canAccess("offline", "/")).toBe(false)
  })

  it("未知路由一律拒绝，用于渲染 404", () => {
    expect(canAccess("admin", "/not-exist")).toBe(false)
  })

  it("路径末尾的斜杠不影响判定", () => {
    expect(canAccess("admin", "/manage/")).toBe(true)
  })

  it("审核人员与评审专家的面包屑文案不同", () => {
    expect(breadcrumbNameMap("judge")["/review"]).toBe("比赛审核")
    expect(breadcrumbNameMap("approver")["/review"]).toBe("比赛评审")
  })

  it("withQuery 会忽略空值", () => {
    expect(withQuery("/review/list", { comId: 3, page: 1 })).toBe("/review/list?comId=3&page=1")
    expect(withQuery("/activity/notice", { id: 3, noticeId: undefined })).toBe(
      "/activity/notice?id=3"
    )
    expect(withQuery("/activity", {})).toBe("/activity")
  })

  it("菜单项互为前缀时只高亮匹配最长的那一项", () => {
    // /manage 是 /manage/judge 的前缀，两项不能同时亮
    expect(activeNavHref("admin", "/manage/judge")).toBe("/manage/judge")
    expect(activeNavHref("admin", "/manage/create")).toBe("/manage")
    expect(activeNavHref("admin", "/manage")).toBe("/manage")
    expect(activeNavHref("admin", "/activity/detail")).toBe("/activity")
    // 登录后的落地页与未匹配的路径
    expect(activeNavHref("admin", "/")).toBe("/account")
    expect(activeNavHref("user", "/manage/judge")).toBeNull()
    expect(activeNavHref("offline", "/manage")).toBeNull()
  })

  it.each([{ pathname: "/" }, { pathname: "/account" }, { pathname: "/manage/judge" }])(
    "offline 角色访问 $pathname 时永远不是一级页面",
    ({ pathname }) => {
      expect(isTopLevelPath("offline", pathname)).toBe(false)
    }
  )

  it.each([{ role: "admin" }, { role: "approver" }, { role: "judge" }, { role: "user" }] as const)(
    "登录角色 $role 的根路径是一级页面",
    ({ role }) => {
      expect(isTopLevelPath(role, "/")).toBe(true)
    }
  )

  it.each([
    { role: "admin", pathname: "/manage/judge" },
    { role: "admin", pathname: "/manage/judge/" },
    { role: "approver", pathname: "/review/student" },
    { role: "judge", pathname: "/import/" },
    { role: "user", pathname: "/activity/" },
  ] as const)("角色自身菜单路径与单个结尾斜杠是一级页面：$role $pathname", ({ role, pathname }) => {
    expect(isTopLevelPath(role, pathname)).toBe(true)
  })

  it.each([
    // 详情等子路径可以访问，但不是一级页面
    { role: "admin", pathname: "/activity/detail" },
    { role: "admin", pathname: "/manage/create" },
    { role: "approver", pathname: "/review/detail" },
    { role: "user", pathname: "/activity/register" },
    // 其他角色专属的菜单路径
    { role: "user", pathname: "/manage/judge" },
    { role: "admin", pathname: "/import" },
    { role: "user", pathname: "/review/student" },
    // 未知路径
    { role: "admin", pathname: "/not-exist" },
    { role: "admin", pathname: "/management" },
    // 归一化只去掉一个结尾斜杠，双斜杠不匹配
    { role: "admin", pathname: "/manage/judge//" },
  ] as const)(
    "子路径、其他角色专属路径与未知路径不是一级页面：$role $pathname",
    ({ role, pathname }) => {
      expect(isTopLevelPath(role, pathname)).toBe(false)
    }
  )

  it.each([
    // /manage/judge/detail 同时以 /manage 与 /manage/judge 为前缀，取最长匹配
    { role: "admin", pathname: "/manage/judge/detail", expected: "/manage/judge" },
    // 单个结尾斜杠不改变匹配结果
    { role: "admin", pathname: "/manage/judge/", expected: "/manage/judge" },
    { role: "admin", pathname: "/manage/", expected: "/manage" },
    { role: "judge", pathname: "/import/", expected: "/import" },
    { role: "user", pathname: "/activity/register", expected: "/activity" },
  ] as const)(
    "activeNavHref 取最长匹配且忽略单个结尾斜杠：$role 访问 $pathname 时高亮 $expected",
    ({ role, pathname, expected }) => {
      expect(activeNavHref(role, pathname)).toBe(expected)
    }
  )

  it.each([
    // 与 /manage 共享前缀但缺少 "/" 段边界，不能误匹配
    { role: "admin", pathname: "/management" },
    { role: "admin", pathname: "/manage-judge" },
  ] as const)(
    "activeNavHref 要求路径段边界：$role 访问 $pathname 时不匹配任何菜单项",
    ({ role, pathname }) => {
      expect(activeNavHref(role, pathname)).toBeNull()
    }
  )
})
