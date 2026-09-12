/**
 * 与后端接口保持一致的类型定义。
 * 字段命名保留后端原始风格（部分驼峰、部分下划线），不做重命名，保证接口一致性。
 */

/** 通用响应包装 */
export type ApiResponse<T = unknown> = {
  success: boolean
  errCode: number | null
  errMsg: string | null
  data: T
}

/** 创建 / 编辑活动时提交的比赛信息 */
export type CompetitionInfoType = {
  name: string // 比赛名称
  reg_begin_time: string // 报名开始时间
  reg_end_time: string // 报名结束时间
  submit_begin_time: string // 活动提交开始时间
  submit_end_time: string // 活动提交结束时间
  review_begin_time: string // 评审开始时间
  review_end_time: string // 评审结束时间
  table: object // 表单 schema
  type: number // 0 单人 1 团队
  min_team_members: number // 团队人数下限
  max_team_members: number // 团队人数上限
  user_code: string // 活动负责人学号
  is_review: number // 是否需要审核 0 否 1 是
  introduce: string // 比赛介绍
  cover: string // 封面 url
}

/** 兼容旧命名 */
export type competitionInfoType = CompetitionInfoType

/** 比赛详情（用户视角） */
export interface CompetitionDetailType {
  introduce: string
  name: string
  regBegin: string
  regEnd: string
  reviewBegin: string
  reviewEnd: string
  status: number
  submitBegin: string
  submitEnd: string
  cover: string
}

/** 比赛列表条目 */
export interface CompetitionListItem {
  id: number
  name: string
  cover: string
  intro: string
  date: string
}

/** 分页结构 */
export interface PagedResult<T> {
  pageNum: number
  pageSize: number
  records: T[]
  total: number
}

/** 报名信息（是否团队赛、人数限制） */
export interface CompetitionSignInfo {
  isTeam: boolean
  minTeamMembers: number
  maxTeamMembers: number
}

/** 队伍成员 */
export interface TeamMember {
  name: string
  code: string
  college?: string
  major?: string
  contact?: string
  isCaptain?: string
}

/** 队伍信息 */
export interface TeamInfo {
  teamName: string
  teamMember: TeamMember[]
  teacherMember: TeamMember[]
}

/** 已提交的项目资料条目 */
export interface WorkDataItem {
  input: string
  content: string
  isFile: boolean
}

/** 用户资料 */
export interface UserProfile {
  code: string
  name: string
  major: string
  college: string
  contact: string
}

/** 评委账号（管理端列表条目） */
export interface JudgeAccount {
  code: string // 学号
  name: string // 姓名
  contact: string // 联系方式
}

/** 学生账号（管理端列表条目） */
export interface StudentAccount {
  code: string // 学号
  name: string // 姓名
  contact: string // 联系方式
}

/** 公告 */
export interface CompetitionNoticeItem {
  id: number
  title: string
  content: string
  time: string
  role: number | undefined
}

/** 管理端比赛列表条目 */
export interface ManageCompetitionItem {
  id: number
  name: string
  beginTime: string
  endTime: string
  introduce: string
  reviewer: string
  status: string
  regNum: number
  subNum: number
  revNum: number
}

/** 管理端活动详情列表条目 */
export interface ManageDetailItem {
  index: number
  comId: number
  userCode: string
  fileName: string
  isAssignJudge: number
  judges: string[]
}

/**
 * 学院。`id` 即「审核学院代号」，是 review_settings 的 key。
 * 唯一事实来源是后端 department 表，前端不得用本地清单的下标推导。
 */
export interface Department {
  id: number
  name: string
}
