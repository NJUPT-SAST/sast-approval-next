"use client"

import axios, { type AxiosResponse } from "axios"
import { toast } from "sonner"
import {
  getNetworkErrorNotice,
  isNetworkError,
  markNetworkErrorNotified,
  wasNetworkErrorNotified,
} from "@/lib/api/errors"
import { STORAGE_KEYS, readStorage } from "@/lib/storage"
import { useUserStore } from "@/lib/store/user"

/**
 * 接口基地址。
 * - 开发环境走 next.config.ts 中的 rewrites 代理到 https://approve.sast.fun/api
 * - 生产 / Tauri 桌面端为静态导出，没有 Node 服务器，必须使用绝对地址
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development" ? "/api" : "https://approve.sast.fun/api")

export const apis = axios.create({
  baseURL: API_BASE_URL,
})

apis.interceptors.request.use((config) => {
  const token = readStorage(STORAGE_KEYS.token)
  // 空字符串等同于没有登录态：与其发一个空的 Token 头让后端回 1005，不如直接不带
  if (token !== null && token !== "") {
    config.headers.set("Token", token)
  }
  return config
})

/**
 * 登录失效：清空登录态。
 * AppShell 会在当前地址直接渲染登录页，不整页跳转，重新登录后还能回到原来的页面。
 */
function handleUnauthorized() {
  // 并发请求可能同时返回 1003，只处理第一次
  if (useUserStore.getState().role === "offline") return
  toast.warning("⚠️ 登录已过期", { id: "unlogin", description: "请重新登录后继续操作" })
  useUserStore.getState().logout()
}

/** 业务错误码：1003 登录过期 / 1005 未携带 Token，都表示当前会话不可用 */
const UNAUTHORIZED_ERROR_CODES = [1003, 1005]

type BusinessPayload = { success?: boolean; errCode?: number | null }

/** 取出后端统一响应结构；blob 等没有 success 字段的响应返回 null */
function readBusinessPayload(source: unknown): BusinessPayload | null {
  if (source === null || typeof source !== "object") return null
  if (!("success" in source)) return null
  return source as BusinessPayload
}

/**
 * 业务层登录失效判定。
 *
 * 成功与失败两条分支都要跑一遍：后端业务错误一般是 HTTP 200，但经过网关 / 代理
 * 可能变成 500 等非 2xx 状态，此时 axios 走的是 reject 分支。只在 2xx 分支判断会让
 * 「登录已过期」被当成网络故障——用户看到「请检查网络」，永远等不到重新登录的提示。
 */
function handleBusinessFailure(payload: BusinessPayload | null) {
  if (payload === null || payload.success !== false) return
  if (payload.errCode === null || payload.errCode === undefined) return
  if (UNAUTHORIZED_ERROR_CODES.includes(payload.errCode)) handleUnauthorized()
}

apis.interceptors.response.use(
  (res: AxiosResponse) => {
    handleBusinessFailure(readBusinessPayload(res.data))
    return res
  },
  (error: unknown) => {
    // 非 2xx 也可能是带着业务错误码的响应（例如 500 + errCode 1005）
    if (axios.isAxiosError(error)) {
      handleBusinessFailure(readBusinessPayload(error.response?.data))
    }
    // DNS 解析失败等网络层错误在这里统一提示，页面自己的 catch 不再重复弹窗。
    // 固定 id 让并发请求同时失败时只出现一条提示。
    if (isNetworkError(error) && !wasNetworkErrorNotified(error)) {
      markNetworkErrorNotified(error)
      const notice = getNetworkErrorNotice(error)
      toast.error(notice.title, { id: "network", description: notice.description })
    }
    return Promise.reject(error)
  }
)
