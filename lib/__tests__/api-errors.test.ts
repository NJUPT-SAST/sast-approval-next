import { AxiosError, AxiosHeaders } from "axios"
import { toast } from "sonner"
import {
  NETWORK_ERROR_TITLE,
  STORAGE_ERROR_TITLE,
  TIMEOUT_ERROR_TITLE,
  isNetworkError,
  markNetworkErrorNotified,
  notifyRequestError,
} from "@/lib/api/errors"

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), dismiss: jest.fn() },
}))

const config = { headers: new AxiosHeaders() }

/**
 * 「没拿到响应」的统一表现：断网、DNS 失败、连接被拒、被 CORS 拦截、代理断流
 * 在浏览器里都一样，所以只能按这一层分类，不能断言具体原因。
 */
function noResponseError() {
  return new AxiosError("Network Error", "ERR_NETWORK", config)
}

describe("请求错误分类", () => {
  it("把没有响应的请求判定为网络层错误", () => {
    expect(isNetworkError(noResponseError())).toBe(true)
    expect(isNetworkError(new AxiosError("timeout", "ECONNABORTED", config))).toBe(true)
    // 原生 fetch / XHR 在拿不到响应时抛 TypeError
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true)
    // 直传对象存储被 CORS 拦掉时，XHR 就是这么抛的
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true)
  })

  it("拿到响应的业务错误与主动取消不算网络层错误", () => {
    const serverError = new AxiosError("Bad Request", "ERR_BAD_REQUEST", config, undefined, {
      status: 400,
      statusText: "Bad Request",
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    expect(isNetworkError(serverError)).toBe(false)
    expect(isNetworkError(new AxiosError("canceled", "ERR_CANCELED", config))).toBe(false)
  })
})

describe("请求失败提示", () => {
  it("网络层错误提示更换网络环境，而不是联系管理员", () => {
    notifyRequestError(noResponseError(), "😞 下载发生了错误，请联系管理员", { id: "downloading" })
    expect(toast.error).toHaveBeenCalledWith(
      NETWORK_ERROR_TITLE,
      expect.objectContaining({ description: expect.stringContaining("更换网络环境") })
    )
  })

  it("文案不把「没拿到响应」断言成 DNS 解析失败", () => {
    notifyRequestError(noResponseError(), "😭 请求失败")
    const description = (toast.error as jest.Mock).mock.calls[0][1].description as string
    expect(description).not.toContain("无法解析服务器地址")
  })

  it("直传对象存储失败时提示跨域配置，而不是笼统的网络故障", () => {
    notifyRequestError(new TypeError("Network request failed"), "a.pdf 上传失败", {
      description: "请稍后重试",
      context: "storage",
    })
    expect(toast.error).toHaveBeenCalledWith(
      STORAGE_ERROR_TITLE,
      expect.objectContaining({ description: expect.stringContaining("CORS") })
    )
  })

  it("超时使用单独的文案", () => {
    notifyRequestError(new AxiosError("timeout", "ECONNABORTED", config), "😭 请求失败")
    expect(toast.error).toHaveBeenCalledWith(TIMEOUT_ERROR_TITLE, expect.anything())
  })

  it("业务错误沿用调用方文案", () => {
    notifyRequestError(new Error("boom"), "😭 请求失败", { id: "download" })
    expect(toast.error).toHaveBeenCalledWith("😭 请求失败", {
      id: "download",
      description: undefined,
    })
  })

  it("拦截器已提示过时不再重复弹窗，只收掉 loading", () => {
    const error = noResponseError()
    markNetworkErrorNotified(error)
    notifyRequestError(error, "😭 请求失败", { id: "download" })
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.dismiss).toHaveBeenCalledWith("download")
  })
})
