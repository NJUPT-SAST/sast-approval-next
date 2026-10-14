import { ROLE_LABEL, roleNumberToState, roleStateToNumber, useUserStore } from "@/lib/store/user"
import { STORAGE_KEYS } from "@/lib/storage"

describe("用户状态", () => {
  beforeEach(() => {
    window.localStorage.clear()
    useUserStore.setState({
      hydrated: false,
      role: "offline",
      profile: { code: "", name: "", major: "", college: "", contact: "" },
      inboxPoint: "on",
    })
  })

  it("后端 role 与前端角色的映射与新版一致", () => {
    expect(roleNumberToState(0)).toBe("user")
    expect(roleNumberToState(1)).toBe("approver") // 审批审核人员
    expect(roleNumberToState(2)).toBe("judge") // 评委
    expect(roleNumberToState(3)).toBe("admin")
    expect(roleNumberToState(99)).toBe("offline")

    expect(roleStateToNumber("user")).toBe(0)
    expect(roleStateToNumber("approver")).toBe(1) // 审批审核人员
    expect(roleStateToNumber("judge")).toBe(2) // 评委
    expect(roleStateToNumber("admin")).toBe(3)
  })

  it("角色中文名可用于界面展示", () => {
    expect(ROLE_LABEL.admin).toBe("系统管理员")
    expect(ROLE_LABEL.user).toBe("参赛选手")
  })

  it("从 localStorage 水合登录态，键名与旧版兼容", () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "jwt")
    window.localStorage.setItem(STORAGE_KEYS.userState, "admin")
    window.localStorage.setItem(STORAGE_KEYS.name, "王小明")
    window.localStorage.setItem(STORAGE_KEYS.code, "B21021021")
    window.localStorage.setItem(STORAGE_KEYS.inboxPoint, "off")

    useUserStore.getState().hydrate()

    const state = useUserStore.getState()
    expect(state.hydrated).toBe(true)
    expect(state.role).toBe("admin")
    expect(state.profile.name).toBe("王小明")
    expect(state.inboxPoint).toBe("off")
  })

  it("只有 userState 没有 Token 时按未登录处理（半登录状态会发出不带 Token 的请求）", () => {
    window.localStorage.setItem(STORAGE_KEYS.userState, "user")

    useUserStore.getState().hydrate()

    expect(useUserStore.getState().role).toBe("offline")
    expect(window.localStorage.getItem(STORAGE_KEYS.userState)).toBe("offline")
  })

  it("Token 为空字符串时同样按未登录处理", () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "")
    window.localStorage.setItem(STORAGE_KEYS.userState, "judge")

    useUserStore.getState().hydrate()

    expect(useUserStore.getState().role).toBe("offline")
  })

  it("设置资料时同步写回 localStorage", () => {
    useUserStore.getState().setProfile({ code: "B2101", name: "李四" })
    expect(window.localStorage.getItem(STORAGE_KEYS.code)).toBe("B2101")
    expect(window.localStorage.getItem(STORAGE_KEYS.name)).toBe("李四")
  })

  it("退出登录会清空本应用的存储并把角色重置为 offline", () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "t")
    useUserStore.getState().setRole("admin")
    useUserStore.getState().logout()

    expect(useUserStore.getState().role).toBe("offline")
    expect(window.localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEYS.userState)).toBe("offline")
  })

  it("退出登录不碰同一域名下其它应用（不是 localStorage.clear）", () => {
    window.localStorage.setItem("some-other-app-key", "keep-me")
    useUserStore.getState().setRole("admin")

    useUserStore.getState().logout()

    expect(window.localStorage.getItem("some-other-app-key")).toBe("keep-me")
  })
})
