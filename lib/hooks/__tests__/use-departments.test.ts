/**
 * 学院列表 hook 测试。
 *
 * 重点是模块级缓存：ReviewerSet 会按审核者条数渲染多份，
 * 若每份各自发请求会打出 N 个并发请求，这里断言只发一次。
 */
jest.mock("@/lib/api/public", () => ({
  getDepartmentList: jest.fn(),
}))

import { renderHook, waitFor } from "@testing-library/react"
import { getDepartmentList } from "@/lib/api/public"
import { resetDepartmentCache, useDepartments } from "@/lib/hooks/use-departments"

const mockedGet = getDepartmentList as jest.Mock

beforeEach(() => {
  resetDepartmentCache()
})

describe("useDepartments", () => {
  it("把后端返回的 id 归一成数字（建表语句里是 varchar）", async () => {
    mockedGet.mockResolvedValue({
      data: { data: [{ id: "3", name: "甲学院" }] },
    })

    const { result } = renderHook(() => useDepartments())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.departments).toEqual([{ id: 3, name: "甲学院" }])
  })

  it("多个组件同时使用时只发一次请求", async () => {
    mockedGet.mockResolvedValue({ data: { data: [{ id: 1, name: "甲学院" }] } })

    const first = renderHook(() => useDepartments())
    const second = renderHook(() => useDepartments())
    const third = renderHook(() => useDepartments())

    await waitFor(() => expect(first.result.current.loading).toBe(false))
    await waitFor(() => expect(second.result.current.loading).toBe(false))
    await waitFor(() => expect(third.result.current.loading).toBe(false))

    expect(mockedGet).toHaveBeenCalledTimes(1)
    expect(third.result.current.departments).toEqual([{ id: 1, name: "甲学院" }])
  })

  it("请求失败时标记 failed，且不会缓存失败结果", async () => {
    mockedGet.mockRejectedValueOnce(new Error("boom"))

    const { result } = renderHook(() => useDepartments())
    await waitFor(() => expect(result.current.failed).toBe(true))
    expect(result.current.departments).toEqual([])

    // 失败没有被缓存：下一次挂载会重新发起请求
    mockedGet.mockResolvedValue({ data: { data: [{ id: 2, name: "乙学院" }] } })
    const retry = renderHook(() => useDepartments())
    await waitFor(() => expect(retry.result.current.loading).toBe(false))

    expect(retry.result.current.departments).toEqual([{ id: 2, name: "乙学院" }])
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it("响应缺少 data 字段时退化为空列表而不是抛错", async () => {
    mockedGet.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useDepartments())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.departments).toEqual([])
    expect(result.current.failed).toBe(false)
  })
})
