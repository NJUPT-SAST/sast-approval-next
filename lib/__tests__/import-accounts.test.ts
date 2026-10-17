import * as XLSX from "xlsx"
import { MAX_IMPORT_ROWS, checkAccountWorkbook, formatIssue } from "@/lib/import-accounts"

/** 用二维数组造一个 xlsx 的 ArrayBuffer，模拟用户上传的表格 */
function makeWorkbook(rows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Sheet1")
  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
  return out as ArrayBuffer
}

const HEADER = ["学号", "姓名", "联系方式"]

describe("一键导入表格校验", () => {
  it("表格合法时返回全部行", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([
        HEADER,
        ["B21031234", "张三", "13800138000"],
        ["1234567890", "李四", "13900139000"],
      ])
    )
    expect(result.issues).toEqual([])
    expect(result.total).toBe(2)
    expect(result.rows.map((row) => row.code)).toEqual(["B21031234", "1234567890"])
    expect(result.rows[0].row).toBe(2)
  })

  it("表头缺列时直接报错并指出缺了哪些", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([
        ["学号", "姓名"],
        ["B21031234", "张三"],
      ])
    )
    expect(result.rows).toEqual([])
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].message).toContain("联系方式")
  })

  it("逐行指出学号、姓名、联系方式的问题并带上行号", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([
        HEADER,
        ["B2103", "张三", "13800138000"],
        ["B21031234", "", "13800138000"],
        ["1234567890", "李四", "123"],
      ])
    )
    expect(result.rows).toEqual([])
    const messages = result.issues.map(formatIssue)
    expect(messages[0]).toContain("第 2 行")
    expect(messages[0]).toContain("学号")
    expect(messages[1]).toBe("第 3 行「姓名」：姓名不能为空")
    expect(messages[2]).toContain("第 4 行")
    expect(messages[2]).toContain("手机号")
  })

  it("表内学号重复时指向第一次出现的行", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([
        HEADER,
        ["B21031234", "张三", "13800138000"],
        ["B21031234", "李四", "13900139000"],
      ])
    )
    expect(result.issues).toHaveLength(1)
    expect(formatIssue(result.issues[0])).toBe("第 3 行「学号」：学号「B21031234」与第 2 行重复")
  })

  it("联系方式可以留空，填了才校验手机号", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([HEADER, ["B21031234", "张三", ""], ["1234567890", "李四", "13900139000"]])
    )
    expect(result.issues).toEqual([])
    expect(result.total).toBe(2)
    expect(result.rows.map((row) => row.contact)).toEqual(["", "13900139000"])
  })

  it("评委账号表格不限制学号格式，但仍然校验重复与空值", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([HEADER, ["SAST30", "张三", "13800138000"], ["A1", "李四", ""]]),
      "any"
    )
    expect(result.issues).toEqual([])
    expect(result.rows.map((row) => row.code)).toEqual(["SAST30", "A1"])

    const dup = checkAccountWorkbook(
      makeWorkbook([HEADER, ["SAST30", "张三", ""], ["SAST30", "李四", ""]]),
      "any"
    )
    expect(formatIssue(dup.issues[0])).toContain("重复")
  })

  it("整行空白跳过而不是报错", () => {
    const result = checkAccountWorkbook(
      makeWorkbook([HEADER, ["B21031234", "张三", "13800138000"], ["", "", ""]])
    )
    expect(result.issues).toEqual([])
    expect(result.rows).toHaveLength(1)
  })

  it("只有表头时给出明确提示", () => {
    const result = checkAccountWorkbook(makeWorkbook([HEADER]))
    expect(result.issues[0].message).toContain("没有可导入的数据")
  })

  it("超过行数上限时拒绝并说明当前行数", () => {
    const rows = [HEADER]
    for (let i = 0; i < MAX_IMPORT_ROWS + 1; i += 1) {
      rows.push([`1000000${String(i).padStart(3, "0")}`, "张三", "13800138000"])
    }
    const result = checkAccountWorkbook(makeWorkbook(rows))
    expect(result.rows).toEqual([])
    expect(result.issues[0].message).toContain(String(MAX_IMPORT_ROWS))
  })

  it("学号被 Excel 存成数字时按字符串处理", () => {
    const result = checkAccountWorkbook(makeWorkbook([HEADER, [12345678901, "张三", 13800138000]]))
    expect(result.issues).toEqual([])
    expect(result.rows[0].code).toBe("12345678901")
    expect(result.rows[0].contact).toBe("13800138000")
  })

  it("不是表格的内容给出可读的错误", () => {
    const garbage = Uint8Array.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
    const result = checkAccountWorkbook(garbage.buffer)
    expect(result.rows).toEqual([])
    expect(result.issues).toHaveLength(1)
  })
})
