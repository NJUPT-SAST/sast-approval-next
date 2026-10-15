/**
 * 拦截器行为测试。
 *
 * 重点回归「登录失效」判定：后端业务错误一般带 HTTP 200，但经过网关 / 代理后可能变成
 * 非 2xx（真实故障里是 500 + errCode 1005），此时 axios 走 reject 分支。只在 2xx 分支
 * 判断 1003/1005 会让用户看到「请检查网络」，永远等不到重新登录。
 */
const mockLogout = jest.fn()
const mockToastWarning = jest.fn()
const mockToastError = jest.fn()

jest.mock("sonner", () => ({
  toast: {
    warning: (...args: unknown[]) => mockToastWarning(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

jest.mock("@/lib/store/user", () => ({
  useUserStore: {
    getState: () => ({ role: "user", logout: mockLogout }),
  },
}))

import { apis } from "@/lib/api/client"

type Handler = {
  fulfilled?: (value: unknown) => unknown
  rejected?: (error: unknown) => Promise<unknown>
}

function responseHandler() {
  const handler = apis.interceptors.response.handlers?.[0] as Handler | undefined
  if (!handler?.fulfilled || !handler.rejected) throw new Error("响应拦截器未注册")
  return handler
}

function axiosError(status: number, data: unknown) {
  return {
    isAxiosError: true,
    response: { status, data },
    message: `Request failed with status ${status}`,
  }
}

beforeEach(() => {
  mockLogout.mockClear()
  mockToastWarning.mockClear()
  mockToastError.mockClear()
})

describe("响应拦截器：登录失效", () => {
  it("200 + errCode 1005 视为登录失效", () => {
    responseHandler().fulfilled?.({
      data: { success: false, errCode: 1005, errMsg: "TOKEN不能为空" },
    })

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockToastWarning).toHaveBeenCalledWith(
      "⚠️ 登录已过期",
      expect.objectContaining({ id: "unlogin" })
    )
  })

  it("200 + errCode 1003 视为登录失效", () => {
    responseHandler().fulfilled?.({ data: { success: false, errCode: 1003 } })

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it("500 + errCode 1005 同样视为登录失效，而不是网络故障", async () => {
    const error = axiosError(500, {
      data: null,
      errCode: 1005,
      errMsg: "TOKEN不能为空",
      success: false,
    })

    await expect(responseHandler().rejected?.(error)).rejects.toBe(error)

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockToastWarning).toHaveBeenCalledTimes(1)
    // 已经按登录失效处理，不该再弹「网络连接失败」
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it("其它业务错误码不会踢出登录", async () => {
    const error = axiosError(500, { success: false, errCode: 1000 })

    await expect(responseHandler().rejected?.(error)).rejects.toBe(error)

    expect(mockLogout).not.toHaveBeenCalled()
    expect(mockToastWarning).not.toHaveBeenCalled()
  })

  it("blob 等没有 success 字段的响应不参与判定", () => {
    responseHandler().fulfilled?.({ data: new Blob(["x"]) })

    expect(mockLogout).not.toHaveBeenCalled()
  })

  it("网络层错误提示一次网络问题，不踢出登录", async () => {
    const error = { isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" }

    await expect(responseHandler().rejected?.(error)).rejects.toBe(error)

    expect(mockToastError).toHaveBeenCalledWith(
      "🌐 网络连接失败",
      expect.objectContaining({ id: "network" })
    )
    expect(mockLogout).not.toHaveBeenCalled()
  })
})
