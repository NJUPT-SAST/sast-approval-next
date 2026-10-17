import * as XLSX from "xlsx"
import {
  PHONE_MESSAGE,
  STUDENT_CODE_MESSAGE,
  isPhone,
  isStudentCode,
  type AccountCodeRule,
} from "@/lib/validation"

/** 模板里的三列，导入表格必须包含 */
export const REQUIRED_COLUMNS = ["学号", "姓名", "联系方式"] as const

/** 单次导入的行数上限，避免一次性提交过大的表格 */
export const MAX_IMPORT_ROWS = 500

export type AccountDraft = {
  /** Excel 里的行号，从 1 开始，1 是表头 */
  row: number
  code: string
  name: string
  contact: string
}

export type ImportIssue = {
  /** 表头层面的问题没有行号 */
  row?: number
  column?: string
  message: string
}

export type ImportCheckResult = {
  /** 通过校验的行 */
  rows: AccountDraft[]
  /** 所有问题，按行号排序 */
  issues: ImportIssue[]
  /** 跳过的整行空白 */
  blankRows: number
  /** 参与校验的数据行总数（不含表头与空行） */
  total: number
}

function cellText(value: unknown) {
  if (value === null || value === undefined) return ""
  // 学号可能被 Excel 识别成数字，number 会丢前导 0，这里统一转字符串再判断
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value)
  return String(value).trim()
}

function normalizeHeader(value: unknown) {
  return cellText(value).replace(/\s/g, "")
}

/**
 * 解析并校验一键导入的账号表格。
 * 纯函数，不碰 DOM，方便单测。
 *
 * @param data     xlsx / xls 文件内容
 * @param codeRule 学号口径：`student` 要求 B21031234 这类学号，`any` 只要求非空（评委账号）
 */
export function checkAccountWorkbook(
  data: ArrayBuffer,
  codeRule: AccountCodeRule = "student"
): ImportCheckResult {
  const empty: ImportCheckResult = { rows: [], issues: [], blankRows: 0, total: 0 }

  let sheet: XLSX.WorkSheet | undefined
  try {
    const workbook = XLSX.read(data, { type: "array" })
    sheet = workbook.Sheets[workbook.SheetNames[0]]
  } catch {
    return { ...empty, issues: [{ message: "文件无法解析，请确认是未加密的 xlsx / xls 表格" }] }
  }
  if (!sheet) {
    return { ...empty, issues: [{ message: "表格里没有任何工作表" }] }
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })
  if (matrix.length === 0) {
    return { ...empty, issues: [{ message: "表格是空的，请先按模板填写内容" }] }
  }

  // 表头
  const header = (matrix[0] ?? []).map(normalizeHeader)
  const columnIndex = new Map<string, number>()
  const missing: string[] = []
  for (const column of REQUIRED_COLUMNS) {
    const index = header.indexOf(column)
    if (index === -1) missing.push(column)
    else columnIndex.set(column, index)
  }
  if (missing.length > 0) {
    return {
      ...empty,
      issues: [
        {
          row: 1,
          message: `表头缺少「${missing.join("」「")}」列，请先下载模板，保持第一行为「${REQUIRED_COLUMNS.join("」「")}」`,
        },
      ],
    }
  }

  const body = matrix.slice(1)
  if (body.length > MAX_IMPORT_ROWS) {
    return {
      ...empty,
      issues: [
        {
          message: `一次最多导入 ${MAX_IMPORT_ROWS} 条，当前表格有 ${body.length} 行，请拆分后分批导入`,
        },
      ],
    }
  }

  const rows: AccountDraft[] = []
  const issues: ImportIssue[] = []
  const seen = new Map<string, number>()
  let blankRows = 0
  let total = 0

  body.forEach((raw, index) => {
    const row = index + 2 // 表头占第 1 行
    const code = cellText(raw[columnIndex.get("学号")!])
    const name = cellText(raw[columnIndex.get("姓名")!])
    const contact = cellText(raw[columnIndex.get("联系方式")!])

    if (code === "" && name === "" && contact === "") {
      blankRows += 1
      return
    }
    total += 1

    const rowIssues: ImportIssue[] = []
    if (code === "") {
      rowIssues.push({ row, column: "学号", message: "学号不能为空" })
    } else if (codeRule === "student" && !isStudentCode(code)) {
      rowIssues.push({
        row,
        column: "学号",
        message: `${STUDENT_CODE_MESSAGE}（当前填的是「${code}」）`,
      })
    } else {
      const first = seen.get(code)
      if (first !== undefined) {
        rowIssues.push({ row, column: "学号", message: `学号「${code}」与第 ${first} 行重复` })
      } else {
        seen.set(code, row)
      }
    }

    if (name === "") {
      rowIssues.push({ row, column: "姓名", message: "姓名不能为空" })
    }

    // 联系方式选填：留空时后端把 extra 落库为 NULL；填了就必须是合法手机号
    if (contact !== "" && !isPhone(contact)) {
      rowIssues.push({
        row,
        column: "联系方式",
        message: `${PHONE_MESSAGE}（当前填的是「${contact}」）`,
      })
    }

    if (rowIssues.length > 0) issues.push(...rowIssues)
    else rows.push({ row, code, name, contact })
  })

  if (total === 0 && issues.length === 0) {
    issues.push({ message: "表格里只有表头，没有可导入的数据" })
  }

  return { rows, issues, blankRows, total }
}

/** 把问题渲染成一行文字，供列表与复制使用 */
export function formatIssue(issue: ImportIssue) {
  if (issue.row === undefined) return issue.message
  const column = issue.column === undefined ? "" : `「${issue.column}」`
  return `第 ${issue.row} 行${column}：${issue.message}`
}
