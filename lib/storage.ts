/**
 * 浏览器 localStorage 的安全封装（SSR / 静态导出阶段没有 window）。
 * key 与旧版 approval-system 完全一致，保证已登录用户无感迁移。
 */
export const STORAGE_KEYS = {
  token: "approval-system-token",
  code: "approval-system-code",
  name: "approval-system-name",
  major: "approval-system-major",
  college: "approval-system-college",
  contact: "approval-system-contact",
  userState: "userState",
  inboxPoint: "inboxPoint",
  allRead: "allRead",
  allReadState: "allReadState",
  allFoldState: "allFoldState",
  everyInboxMessageState: "everyInboxMessageState",
  listTotal: "listTotal",
  reviewEnd: "reviewEnd",
} as const

export const isBrowser = () => typeof window !== "undefined"

export function readStorage(key: string): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): boolean {
  if (!isBrowser()) return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    /* 隐私模式 / 配额写满时写入会抛错，返回 false 让调用方决定怎么提示 */
    return false
  }
}

export function removeStorage(key: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

/** 本应用写入过的存储键，供退出登录清理与跨标签页同步使用 */
export const APP_STORAGE_KEYS: readonly string[] = Object.values(STORAGE_KEYS)

/**
 * 退出登录 / 登录失效时清理本应用自己写入的键。
 *
 * 不要用 `localStorage.clear()`：它会把同一域名下的所有键（包括别的标签页、同一
 * 域名下别的应用的数据）一起删掉；而界面只认内存里的角色，于是会出现「看起来已
 * 登录、请求却不带 Token」的状态，后端只会回 1005（TOKEN不能为空）。
 */
export function clearAppStorage(): void {
  for (const key of APP_STORAGE_KEYS) removeStorage(key)
}
