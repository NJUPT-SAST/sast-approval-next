import { parseDateTime } from "@/lib/datetime"
import type { CompetitionInfoType } from "@/lib/types/api"

/** 审核设置的一行：key 为学院代号（0 表示默认审核者，-1 表示还没选学院），value 为审核者学号 */
export type ReviewSetting = { key: number; value: string }

/** 表单问题：field 是出错控件的 DOM id，页面用它定位、聚焦并标红 */
export type CompetitionIssue = { field: string; message: string }

/** 三个阶段与表单控件 id 前缀（与 TimeRangeField 的 operation 一致） */
const PHASES = [
  { operation: "signUp", label: "报名", begin: "reg_begin_time", end: "reg_end_time" },
  { operation: "submit", label: "材料提交", begin: "submit_begin_time", end: "submit_end_time" },
  { operation: "review", label: "评审", begin: "review_begin_time", end: "review_end_time" },
] as const

/**
 * 创建 / 编辑比赛表单的提交前校验，返回第一个问题，没有问题返回 null。
 * 纯函数，不碰 DOM。
 *
 * - 名称、简介必填
 * - 三个阶段的起止时间必填，且截止要晚于开始
 * - 开启审核时必须有默认审核者；按学院分配的行要么整行留空，要么学号与学院都填，学院不能重复
 */
export function validateCompetition(
  info: CompetitionInfoType,
  reviewSettings: ReviewSetting[],
  reviewerNum: number
): CompetitionIssue | null {
  if (!info.name.trim()) return { field: "competition-name", message: "请填写比赛名称" }
  if (!info.introduce.trim()) {
    return { field: "competition-introduce", message: "请填写比赛简介" }
  }

  for (const phase of PHASES) {
    const begin = parseDateTime(info[phase.begin])
    const end = parseDateTime(info[phase.end])
    if (!begin) {
      return { field: `${phase.operation}-start`, message: `请选择${phase.label}开始时间` }
    }
    if (!end) {
      return { field: `${phase.operation}-end`, message: `请选择${phase.label}截止时间` }
    }
    if (end.getTime() <= begin.getTime()) {
      return {
        field: `${phase.operation}-end`,
        message: `${phase.label}截止时间要晚于开始时间`,
      }
    }
  }

  if (info.is_review !== 1) return null

  if (!reviewSettings[0]?.value.trim()) {
    return { field: "default-reviewer", message: "开启审核后需要填写默认审核者学号" }
  }

  const usedColleges = new Set<number>()
  for (let index = 1; index < Math.min(reviewerNum, reviewSettings.length); index += 1) {
    const row = reviewSettings[index]
    const hasCode = row.value.trim() !== ""
    const hasCollege = row.key > 0
    if (!hasCode && !hasCollege) continue
    if (!hasCollege) {
      return {
        field: `reviewer-college-${index}`,
        message: `请为第 ${index} 位学院审核者选择负责学院`,
      }
    }
    if (!hasCode) {
      return { field: `reviewer-code-${index}`, message: `请填写第 ${index} 位学院审核者的学号` }
    }
    if (usedColleges.has(row.key)) {
      return {
        field: `reviewer-college-${index}`,
        message: `第 ${index} 位学院审核者的负责学院与前面重复了`,
      }
    }
    usedColleges.add(row.key)
  }

  return null
}

/**
 * 把表单里的审核设置整理成提交给后端的 review_settings。
 * 默认审核者（key 0）始终保留；整行留空的学院审核者直接丢弃，
 * 不再把 -1 这种占位学院代号发给后端。
 */
export function buildReviewSettings(reviewSettings: ReviewSetting[], reviewerNum: number) {
  const result: Record<number, string> = {}
  const count = Math.min(reviewerNum, reviewSettings.length)
  for (let index = 0; index < count; index += 1) {
    const row = reviewSettings[index]
    if (row.key < 0) continue
    const value = row.value.trim()
    if (row.key !== 0 && value === "") continue
    result[row.key] = value
  }
  return result
}

/**
 * 编辑比赛时，把后端返回的 review_settings 还原成表单行：
 * 默认审核者（key 0）固定排在第一行，后面至少留一行学院审核者方便直接填写。
 */
export function reviewSettingsFromApi(settings: Record<string, string> | null | undefined) {
  const rows: ReviewSetting[] = Object.entries(settings ?? {}).map(([key, value]) => ({
    key: Number(key),
    value: value ?? "",
  }))
  const defaultIndex = rows.findIndex((row) => row.key === 0)
  const defaultRow = defaultIndex >= 0 ? rows.splice(defaultIndex, 1)[0] : { key: 0, value: "" }
  const result = [defaultRow, ...rows]
  if (result.length === 1) result.push({ key: -1, value: "" })
  return result
}
