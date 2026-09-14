"use client"

import { toast } from "sonner"
import { notifyRequestError } from "@/lib/api/errors"
import { downloadCertificate } from "@/lib/api/public"

/** 触发浏览器下载一个 Blob */
export function saveBlob(blob: Blob, filename: string) {
  const href = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.style.display = "none"
  anchor.href = href
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(href)
}

/** 从 url 中截取文件名 */
export function getFileNameFromUrl(url: string) {
  const urlParts = url.split("/")
  return decodeURIComponent(urlParts[urlParts.length - 1].split("?")[0])
}

/**
 * 从对象存储 url 中还原用户上传时的原始文件名。
 * 与旧版逻辑一致：去掉 "时间戳-随机数-" 前缀。
 */
export function getOriginalFileName(url: string) {
  const nameList = url.split("/")
  return decodeURIComponent(
    nameList[nameList.length - 1].split("-").slice(2).join("-").split("?")[0]
  )
}

/**
 * 后端返回的 blob 接口在出错时会返回 JSON（形如 `{status:"failure", message:"..."}`），
 * 且 HTTP 状态码仍是 200，axios 不会 reject，只能靠响应体类型判断。
 *
 * 注意不能用 `!==` 精确比较 MIME：后端 `setContentType("application/json")` 之后
 * 紧跟 `setCharacterEncoding("utf-8")`，Servlet 会把两者合并成
 * `application/json;charset=utf-8`，精确比较会把错误响应当成文件存盘，
 * 用户拿到一个内容是 JSON 报错的 .xlsx，界面却提示「导出成功」。
 */
export async function saveBlobResponse(
  data: Blob,
  filename: string,
  messages: { success: string; failure: string }
) {
  if (!data.type.startsWith("application/json")) {
    saveBlob(new Blob([data]), filename)
    toast.success(messages.success, { id: "download" })
    return true
  }
  toast.error(messages.failure, {
    id: "download",
    description: await readBlobErrorMessage(data),
  })
  return false
}

/** 从后端的 JSON 错误响应里取出 message，取不到则返回 undefined（只显示通用提示） */
async function readBlobErrorMessage(data: Blob): Promise<string | undefined> {
  try {
    const payload = JSON.parse(await data.text())
    const message = payload?.message ?? payload?.errMsg
    return typeof message === "string" && message.length > 0 ? message : undefined
  } catch {
    return undefined
  }
}

/**
 * 通过后端换取带签名的直链后下载文件。
 * 评审、审核、报名详情、项目提交页共用。
 */
export async function downloadCertifiedFile(url: string) {
  toast.loading("正在下载文件…", { id: "downloading" })
  try {
    const res = await downloadCertificate(url)
    const response = res.data
    if (response?.success) {
      const file = await fetch(response.data.url)
      const fileBlob = await file.blob()
      saveBlob(fileBlob, getFileNameFromUrl(url))
      toast.success("😁 下载完成！", { id: "downloading" })
      return true
    }
    toast.error("😞 下载发生了错误，请联系管理员", { id: "downloading" })
    return false
  } catch (error) {
    // 拿签名直链和取文件都可能因为 DNS 解析失败而挂掉，这里区分网络问题与服务端问题
    notifyRequestError(error, "😞 下载发生了错误，请联系管理员", { id: "downloading" })
    return false
  }
}

/** 人类可读的文件大小 */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
