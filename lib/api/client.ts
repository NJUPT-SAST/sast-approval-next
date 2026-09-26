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
  if (token !== null) {
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

apis.interceptors.response.use(
  (res: AxiosResponse) => {
    const payload = res.data
    // blob 响应没有 success 字段，跳过
    if (payload && typeof payload === "object" && "success" in payload && !payload.success) {
      switch (payload.errCode) {
        case 1003:
        case 1005:
          handleUnauthorized()
          break
        default:
          break
      }
    }
    return res
  },
  (error: unknown) => {
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
