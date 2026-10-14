"use client"

import { create } from "zustand"
import { STORAGE_KEYS, clearAppStorage, readStorage, writeStorage } from "@/lib/storage"
import type { UserProfile } from "@/lib/types/api"

/** 用户角色：未登录 / 学生 / 评委(judge) / 审批审核人员(approver) / 管理员 */
export type UserRole = "offline" | "user" | "judge" | "approver" | "admin"

const EMPTY_PROFILE: UserProfile = {
  code: "",
  name: "",
  major: "",
  college: "",
  contact: "",
}

/** 后端 role 数字 -> 前端角色字符串（与旧版一致）
 * 0: 学生参赛者
 * 1: 审批审核人员（可管理学生）
 * 2: 评委（仅评审，无管理权限）
 * 3: 系统管理员（全权限） */
export function roleNumberToState(role: number): UserRole {
  switch (role) {
    case 0:
      return "user"
    case 1:
      return "approver" // 审批审核人员
    case 2:
      return "judge" // 评委
    case 3:
      return "admin"
    default:
      return "offline"
  }
}

/** 角色字符串 -> 后端 role 数字
 * admin: 3 - 系统管理员（全权限）
 * user: 0 - 学生参赛者
 * approver: 1 - 审批审核人员（可管理学生）
 * judge: 2 - 评委（仅评审，无管理权限） */
export function roleStateToNumber(role: UserRole): number {
  switch (role) {
    case "admin":
      return 3
    case "user":
      return 0
    case "approver": // 审批审核人员
      return 1
    case "judge": // 评委
      return 2
    default:
      return 0
  }
}

export const ROLE_LABEL: Record<UserRole, string> = {
  offline: "未登录",
  user: "参赛选手",
  judge: "评委",
  approver: "审批审核人员",
  admin: "系统管理员",
}

type UserStore = {
  /** 是否已从 localStorage 完成水合 */
  hydrated: boolean
  role: UserRole
  profile: UserProfile
  /** 收件箱红点：'on' 有红点，其它无 */
  inboxPoint: string
  hydrate: () => void
  setRole: (role: UserRole) => void
  setProfile: (profile: Partial<UserProfile>) => void
  setInboxPoint: (point: string) => void
  logout: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  hydrated: false,
  role: "offline",
  profile: EMPTY_PROFILE,
  inboxPoint: "on",

  hydrate: () => {
    const stored = readStorage(STORAGE_KEYS.userState)
    const token = readStorage(STORAGE_KEYS.token)
    // 「已登录」必须同时持有 Token：只有 userState（例如别的标签页退出登录时把
    // Token 清掉了）会让界面按已登录渲染，而每个接口都不带 Token，后端只会回
    // 1005（TOKEN不能为空），用户看到的却是「请检查网络」。这里直接收敛回未登录。
    const signedIn = stored !== null && stored !== "offline" && token !== null && token !== ""
    if (!signedIn && stored !== null && stored !== "offline") {
      writeStorage(STORAGE_KEYS.userState, "offline")
    }
    set({
      hydrated: true,
      role: signedIn ? (stored as UserRole) : "offline",
      inboxPoint: readStorage(STORAGE_KEYS.inboxPoint) ?? "on",
      profile: {
        code: readStorage(STORAGE_KEYS.code) ?? "",
        name: readStorage(STORAGE_KEYS.name) ?? "",
        major: readStorage(STORAGE_KEYS.major) ?? "",
        college: readStorage(STORAGE_KEYS.college) ?? "",
        contact: readStorage(STORAGE_KEYS.contact) ?? "",
      },
    })
  },

  setRole: (role) => {
    writeStorage(STORAGE_KEYS.userState, role)
    set({ role })
  },

  setProfile: (profile) =>
    set((state) => {
      const next = { ...state.profile, ...profile }
      writeStorage(STORAGE_KEYS.code, next.code)
      writeStorage(STORAGE_KEYS.name, next.name)
      writeStorage(STORAGE_KEYS.major, next.major)
      writeStorage(STORAGE_KEYS.college, next.college)
      writeStorage(STORAGE_KEYS.contact, next.contact)
      return { profile: next }
    }),

  setInboxPoint: (point) => {
    writeStorage(STORAGE_KEYS.inboxPoint, point)
    set({ inboxPoint: point })
  },

  logout: () => {
    // 只清理本应用自己的键，不要 localStorage.clear()（见 lib/storage.ts）
    clearAppStorage()
    writeStorage(STORAGE_KEYS.userState, "offline")
    set({ role: "offline", profile: EMPTY_PROFILE })
  },
}))
