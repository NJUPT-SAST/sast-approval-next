import { formatDateTime, isFuture, isPast, parseDateTime, toDateString } from "@/lib/datetime"

describe("时间工具", () => {
  it("格式化为后端约定的格式", () => {
    const date = new Date(2026, 0, 2, 3, 4, 5)
    expect(formatDateTime(date)).toBe("2026-01-02 03:04:05")
    expect(formatDateTime(date, false)).toBe("2026-01-02 03:04")
  })

  it("兼容 '.' 与 '-' 两种分隔符", () => {
    expect(parseDateTime("2026.01.02 03:04")?.getFullYear()).toBe(2026)
    expect(parseDateTime("2026-01-02 03:04")?.getMonth()).toBe(0)
    expect(parseDateTime("")).toBeUndefined()
    expect(parseDateTime("不是时间")).toBeUndefined()
  })

  it("截取日期部分", () => {
    expect(toDateString("2026-01-02 03:04:05")).toBe("2026-01-02")
    expect(toDateString(null)).toBe("—")
  })

  it("判断评审是否已截止", () => {
    expect(isPast("2000-01-01 00:00:00")).toBe(true)
    expect(isPast("2999-01-01 00:00:00")).toBe(false)
    expect(isFuture("2999-01-01 00:00:00")).toBe(true)
    expect(isFuture("2000-01-01 00:00:00")).toBe(false)
    expect(isPast(undefined)).toBe(false)
  })

  describe("时间边界", () => {
    const now = new Date(2026, 5, 15, 12, 0, 0)

    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(now)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("恰好相等时 isPast 与 isFuture 均为 false", () => {
      const exact = formatDateTime(now)
      expect(isPast(exact)).toBe(false)
      expect(isFuture(exact)).toBe(false)
    })

    it("前一秒 isPast 为 true、isFuture 为 false", () => {
      const before = formatDateTime(new Date(now.getTime() - 1000))
      expect(isPast(before)).toBe(true)
      expect(isFuture(before)).toBe(false)
    })

    it("后一秒 isPast 为 false、isFuture 为 true", () => {
      const after = formatDateTime(new Date(now.getTime() + 1000))
      expect(isPast(after)).toBe(false)
      expect(isFuture(after)).toBe(true)
    })

    it.each([undefined, null, "", "不是时间", "2026-13-40 99:99:99"])(
      "无效输入 %p 时 parseDateTime 返回 undefined 且 isPast/isFuture 为 false",
      (input) => {
        expect(parseDateTime(input)).toBeUndefined()
        expect(isPast(input)).toBe(false)
        expect(isFuture(input)).toBe(false)
      }
    )
  })
})
