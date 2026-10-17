"use client"

import axios from "axios"
import { toast } from "sonner"

/**
 * 请求失败的两类情况：
 * - 网络层：请求根本没拿到响应（DNS 解析失败、连接被拒、超时、断网、被 CORS 拦截、代理断流），
 *   这类问题多半出在用户侧的网络环境或浏览器策略上，提示「联系管理员」是误导。
 * - 业务层：拿到了响应但 success 为 false 或状态码非 2xx，沿用调用方自己的文案。
 */

export const NETWORK_ERROR_TITLE = "🌐 网络连接失败"
/**
 * 浏览器只告诉我们「没拿到响应」，分不清是断网、DNS、代理还是 CORS 拦截。
 * 所以文案不能写死某一种原因——曾经写的是「无法解析服务器地址」，
 * 结果把 CORS 拦截、代理断流都误导成 DNS 问题。
 */
export const NETWORK_ERROR_DESCRIPTION = "请求没有拿到响应，请检查网络连接或更换网络环境后重试"

export const TIMEOUT_ERROR_TITLE = "🌐 网络超时"
export const TIMEOUT_ERROR_DESCRIPTION = "服务器响应超时，请检查网络连接或更换网络环境后重试"

/**
 * 浏览器直传对象存储（PUT 到 COS 域名）失败。这是跨域请求，
 * 被存储桶的 CORS 规则或网络代理拦掉时同样表现为「没拿到响应」，需要单独提示。
 */
export const STORAGE_ERROR_TITLE = "☁️ 文件上传被拦截"
export const STORAGE_ERROR_DESCRIPTION =
  "浏览器没能把文件直传到对象存储。常见原因是存储桶未放行当前域名的跨域（CORS）请求，或网络代理拦截了存储域名。"

/** 失败提示的上下文：storage 表示浏览器直传对象存储 */
export type RequestErrorContext = "storage"

/** 已经提示过的错误对象，避免拦截器与调用方各弹一次 */
const notified = new WeakSet<object>()

function isTimeout(error: unknown) {
  return axios.isAxiosError(error) && (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
}

/** 是否是网络层错误。DNS 解析失败、连接被拒、被 CORS 拦截都表现为「没有 response」 */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    // 主动取消不算失败
    if (error.code === "ERR_CANCELED") return false
    // 拿到响应就是业务 / 服务端错误
    return error.response === undefined
  }
  // 原生 fetch / XHR 拿不到响应时抛 TypeError: Failed to fetch / Network request failed
  return error instanceof TypeError && /fetch|network/i.test(error.message)
}

/** 网络层错误对应的提示文案 */
export function getNetworkErrorNotice(error: unknown, context?: RequestErrorContext) {
  if (isTimeout(error)) {
    return { title: TIMEOUT_ERROR_TITLE, description: TIMEOUT_ERROR_DESCRIPTION }
  }
  if (context === "storage") {
    return { title: STORAGE_ERROR_TITLE, description: STORAGE_ERROR_DESCRIPTION }
  }
  return { title: NETWORK_ERROR_TITLE, description: NETWORK_ERROR_DESCRIPTION }
}

export function markNetworkErrorNotified(error: unknown) {
  if (error !== null && typeof error === "object") notified.add(error)
}

export function wasNetworkErrorNotified(error: unknown) {
  return error !== null && typeof error === "object" && notified.has(error)
}

/**
 * 统一展示请求失败提示。
 * 网络层错误提示更换网络环境（直传对象存储时提示跨域/代理），其余沿用调用方传入的 fallback 文案。
 */
export function notifyRequestError(
  error: unknown,
  fallback: string,
  options?: { id?: string; description?: string; context?: RequestErrorContext }
) {
  if (isNetworkError(error)) {
    // 拦截器已经弹过网络提示，这里只负责收掉调用方的 loading toast
    if (wasNetworkErrorNotified(error)) {
      if (options?.id !== undefined) toast.dismiss(options.id)
      return
    }
    markNetworkErrorNotified(error)
    const notice = getNetworkErrorNotice(error, options?.context)
    toast.error(notice.title, { id: options?.id ?? "network", description: notice.description })
    return
  }
  toast.error(fallback, { id: options?.id, description: options?.description })
}
