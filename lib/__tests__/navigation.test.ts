import {
  NAV_BY_ROLE,
  breadcrumbNameMap,
  canAccess,
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

  it("每个侧边栏菜单都有面包屑名称，页头不会显示成上一级", () => {
    for (const [role, items] of Object.entries(NAV_BY_ROLE)) {
      const map = breadcrumbNameMap(role as keyof typeof NAV_BY_ROLE)
      for (const item of items) expect(map[item.href]).toBeTruthy()
    }
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
})
