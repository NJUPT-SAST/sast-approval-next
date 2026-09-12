import {
  formatFileSize,
  getFileNameFromUrl,
  getOriginalFileName,
  saveBlobResponse,
} from "@/lib/file"
import { toast } from "sonner"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("文件工具", () => {
  it("从对象存储 url 还原用户上传的原始文件名", () => {
    // 旧版规则：去掉 "时间戳-随机数-" 前缀，并丢弃查询串
    expect(getOriginalFileName("https://cdn.example.com/1712-8899-申报书.pdf?sign=abc")).toBe(
      "申报书.pdf"
    )
    expect(getOriginalFileName("https://cdn.example.com/1712-8899-my-report-v2.pdf")).toBe(
      "my-report-v2.pdf"
    )
  })

  it("从 url 截取文件名并解码", () => {
    expect(getFileNameFromUrl("https://cdn.example.com/a/b/%E9%99%84%E4%BB%B6.zip?x=1")).toBe(
      "附件.zip"
    )
  })

  it("格式化文件大小", () => {
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(2048)).toBe("2.0 KB")
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB")
  })
})

/**
 * 后端导出接口出错时返回 JSON 但 HTTP 状态码仍是 200，axios 不会 reject，
 * 只能靠响应体类型判断。而后端 `setContentType("application/json")` 之后紧跟
 * `setCharacterEncoding("utf-8")`，Servlet 会合并成 `application/json;charset=utf-8`，
 * 若用 `!==` 精确比较 MIME，错误响应会被当成文件存盘并提示「导出成功」。
 */
describe("saveBlobResponse", () => {
  const messages = { success: "导出成功", failure: "导出失败" }
  let saved: string[] = []

  beforeAll(() => {
    window.URL.createObjectURL = jest.fn(() => "blob:fake")
    window.URL.revokeObjectURL = jest.fn()
    // 拦下 anchor.click()，记录实际触发下载的文件名
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      saved.push(this.download)
    })
  })

  beforeEach(() => {
    saved = []
  })

  it("真正的 xlsx 响应会落盘并提示成功", async () => {
    const blob = new Blob(["PK"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    await expect(saveBlobResponse(blob, "结果.xlsx", messages)).resolves.toBe(true)
    expect(saved).toEqual(["结果.xlsx"])
    expect(toast.success).toHaveBeenCalled()
  })

  // 这三种 MIME 都必须判为错误。带 charset 的两种是后端的真实输出。
  it.each([
    ["application/json"],
    ["application/json;charset=utf-8"],
    ["application/json; charset=UTF-8"],
  ])("JSON 错误响应（type=%s）不落盘且提示失败", async (type) => {
    const blob = new Blob([JSON.stringify({ status: "failure", message: "评审结果不存在" })], {
      type,
    })

    await expect(saveBlobResponse(blob, "结果.xlsx", messages)).resolves.toBe(false)
    expect(saved).toEqual([])
    expect(toast.error).toHaveBeenCalledWith(
      "导出失败",
      expect.objectContaining({ description: "评审结果不存在" })
    )
  })

  it("错误体解析不出 message 时只报通用提示，不抛错", async () => {
    const blob = new Blob(["not json at all"], { type: "application/json" })

    await expect(saveBlobResponse(blob, "结果.xlsx", messages)).resolves.toBe(false)
    expect(saved).toEqual([])
    expect(toast.error).toHaveBeenCalledWith(
      "导出失败",
      expect.objectContaining({ description: undefined })
    )
  })

  it("后端用 errMsg 字段时也能取到原因", async () => {
    const blob = new Blob([JSON.stringify({ errMsg: "比赛不存在" })], {
      type: "application/json;charset=utf-8",
    })

    await saveBlobResponse(blob, "结果.xlsx", messages)
    expect(toast.error).toHaveBeenCalledWith(
      "导出失败",
      expect.objectContaining({ description: "比赛不存在" })
    )
  })
})
