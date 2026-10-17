"use client"

import { apis } from "./client"
import type { CompetitionInfoType } from "@/lib/types/api"

// 经询问，比赛与接口文档中的「活动」是同一个东西
// 故该文件内「比赛」字段指的是接口文档中的「活动」字段

/**
 * 创建比赛信息
 * @param data 见类型定义
 * @return axios对象
 */
export const createCompetitionInfo = (
  data: CompetitionInfoType,
  review_settings: object,
  cover?: Blob
) => {
  const formData = new FormData()
  if (cover) formData.append("cover", cover)
  else formData.append("cover", "")
  if (data.is_review === 1) {
    formData.append(
      "competition",
      JSON.stringify({ review_settings: { ...review_settings }, is_white_list: 0, ...data })
    )
  } else {
    formData.append(
      "competition",
      JSON.stringify({ review_settings: {}, is_white_list: 0, ...data })
    )
  }
  return apis({
    method: "POST",
    url: "/admin/com/create",
    data: formData,
  })
}

/**
 * 删除比赛
 * @param competitionId 比赛id
 * @return axios对象
 */
export const deleteCompetitionInfo = (competitionId: number) => {
  return apis({
    method: "POST",
    url: "/admin/com/delete",
    data: new URLSearchParams({ comId: String(competitionId) }),
  })
}

/**
 * 修改活动信息
 * @param competitionId 比赛活动 ID
 * @param data 见类型定义
 * @return axios对象
 */
export const editCompetitionInfo = (
  competitionId: number,
  data: CompetitionInfoType,
  review_settings: object,
  cover?: Blob
) => {
  const formData = new FormData()
  if (cover) formData.append("cover", cover)
  else formData.append("cover", "")
  if (data.is_review === 1) {
    formData.append(
      "competition",
      JSON.stringify({ id: competitionId, review_settings: { ...review_settings }, ...data })
    )
  } else {
    formData.append(
      "competition",
      JSON.stringify({ id: competitionId, review_settings: {}, ...data })
    )
  }
  return apis({
    method: "POST",
    url: "/admin/com/edit",
    data: formData,
  })
}

/**
 * 查看活动信息
 * @return axios对象
 */
export const viewCompetitionInfo = (competitionId: number) => {
  return apis({
    method: "get",
    url: "/admin/com/competitionInfo?comId=" + competitionId,
  })
}

/**
 * 获取活动列表
 * @param cur 当前页数
 * @param limit 每页数据条数
 * @return axios对象
 */
export const getCompetitionList = (cur: number, limit: number) => {
  return apis({
    method: "get",
    url: "/admin/com/competitionList?pageNum=" + cur + "&pageSize=" + limit,
  })
}

/**
 * 分配评委
 * @return axios对象
 */
export const assignJudge = (formData: FormData) => {
  return apis({
    method: "POST",
    url: "/admin/judge/assign",
    data: formData,
  })
}

/**
 * 导出项目（分配评委）导出的是一个 excel 文件
 * @param competitionId 活动Id
 * @return axios对象
 */
export const exportWorkFileDataToAssignScorer = (competitionId: number) => {
  return apis({
    method: "get",
    url: "/admin/exportWorkData?comId=" + competitionId,
    responseType: "blob",
  })
}

/**
 * 查询用户信息
 * @param code 学号
 * @return axios对象
 */
export const getUserInfo = (code: string) => {
  return apis({
    method: "get",
    url: "/admin/userInfo?code=" + code,
  })
}

/**
 * 获取评委账号列表（分页）
 * @param pageNum 页码，从 1 开始
 * @param pageSize 每页条数
 * @return axios对象
 */
export const getJudgeAccountList = (pageNum: number, pageSize: number) => {
  return apis({
    method: "get",
    url: "/admin/judge/list?pageNum=" + pageNum + "&pageSize=" + pageSize,
  })
}

/**
 * 新增单个评委账号（不依赖 Excel 导入）
 * @param data 学号 / 姓名 / 联系方式 / 初始密码
 * @return axios对象
 */
export const createJudgeAccount = (data: {
  code: string
  name: string
  contact: string
  password: string
}) => {
  return apis({
    method: "POST",
    url: "/admin/judge/create",
    data: data,
  })
}

/**
 * 从 Excel 批量导入评委账号（管理员）
 *
 * 表头与「一键导入」一致（学号 / 姓名 / 联系方式），但后端建的是 role=2 的**评委**账号；
 * `/review/import`（一键导入）里角色写死为 COMMON_STUDENT，建的是学生，两者不能混用。
 * 也不能和 `/admin/judge/assign`（评委分配表）混用，那个表头完全不同。
 *
 * @param file 账号表格
 * @param depId 部门 id，旧版固定为 1
 * @return axios对象
 */
export const importJudgeAccounts = (file: File, depId = 1) => {
  const data = new FormData()
  data.append("file", file)
  return apis({
    method: "POST",
    url: "/admin/judge/import?depId=" + depId,
    data,
  })
}

/**
 * 编辑评委账号（学号作为唯一标识，不可修改；密码留空表示不重置）
 * @param data 学号 / 姓名 / 联系方式 / 新密码（可选）
 * @return axios对象
 */
export const editJudgeAccount = (data: {
  code: string
  name: string
  contact: string
  password?: string
}) => {
  return apis({
    method: "POST",
    url: "/admin/judge/edit",
    data: data,
  })
}

/**
 * 删除评委账号
 * @param code 学号
 * @return axios对象
 */
export const deleteJudgeAccount = (code: string) => {
  return apis({
    method: "POST",
    url: "/admin/judge/delete",
    data: { code },
  })
}

/**
 * 获取学生账号列表（分页）
 * @param pageNum 页码，从 1 开始
 * @param pageSize 每页条数
 * @return axios对象
 */
export const getStudentAccountList = (pageNum: number, pageSize: number) => {
  return apis({
    method: "get",
    url: "/admin/student/list?pageNum=" + pageNum + "&pageSize=" + pageSize,
  })
}

/**
 * 新增单个学生账号（不依赖 Excel 导入）
 * @param data 学号 / 姓名 / 联系方式 / 初始密码
 * @return axios对象
 */
export const createStudentAccount = (data: {
  code: string
  name: string
  contact: string
  password: string
}) => {
  return apis({
    method: "POST",
    url: "/admin/student/create",
    data: data,
  })
}

/**
 * 编辑学生账号（学号作为唯一标识，不可修改；密码留空表示不重置）
 * @param data 学号 / 姓名 / 联系方式 / 新密码（可选）
 * @return axios对象
 */
export const editStudentAccount = (data: {
  code: string
  name: string
  contact: string
  password?: string
}) => {
  return apis({
    method: "POST",
    url: "/admin/student/edit",
    data: data,
  })
}

/**
 * 删除学生账号
 * @param code 学号
 * @return axios对象
 */
export const deleteStudentAccount = (code: string) => {
  return apis({
    method: "POST",
    url: "/admin/student/delete",
    data: { code },
  })
}

/**
 * 导出评审结果
 * @param competitionId 比赛 id
 * @return axios对象
 */
export const exportJudgeResult = (competitionId: number) => {
  return apis({
    method: "get",
    url: "/admin/data/result?comId=" + competitionId,
    responseType: "blob",
  })
}

/**
 * 发布公告
 * @param competitionId 比赛 id
 * @param title 公告标题
 * @param content 公告正文
 * @param role 公告接收角色
 * @param time 发布时间 格式为 'yyyy.mm.dd hh:mm'，未来时间将在未来发布
 * @return axios对象
 */
export const releaseNotice = (
  competitionId: number,
  title: string,
  content: string,
  role: number,
  time?: string
) => {
  return apis({
    method: "POST",
    url: "/admin/notice/release",
    data: {
      time: time,
      com_id: competitionId,
      title: title,
      content: content,
      role: role,
    },
  })
}

/**
 * 导出材料，所有参赛人员的附件
 * @param competitionId 比赛Id
 * @return axios对象
 */
export const exportTeamInfo = (competitionId: number) => {
  return apis({
    method: "get",
    url: "/admin/data/exportComInfo?comId=" + competitionId,
    responseType: "blob",
  })
}

/**
 * 修改公告
 * @param noticeId 公告Id
 * @param title 公告标题
 * @param content 公告正文
 * @param role 公告接收角色
 * @param time 公告发布时间 默认为当前时间 格式为 'yyyy.mm.dd hh:mm'
 * @return axios对象
 */
export const editNotice = (
  noticeId: number,
  title: string,
  content: string,
  role: number,
  time?: string
) => {
  return apis({
    method: "POST",
    url: "/admin/notice/edit",
    data: {
      id: noticeId,
      title: title,
      content: content,
      role: role,
      time: time,
    },
  })
}

/**
 * 删除公告
 * @param NoticeId 公告id
 */
export const deleteCompetitionNotice = (NoticeId: number) => {
  return apis({
    method: "POST",
    url: "/admin/notice/del?id=" + NoticeId,
  })
}

/**
 * 获取管理活动界面的 list
 * @param competitionId 活动Id
 * @param pageNumber 页码
 * @param pageSize 单页最大数据条数
 * @returns Axios对象
 */
export const getManageCompetitionList = (
  competitionId: number,
  pageNumber: number,
  pageSize: number
) => {
  return apis({
    method: "get",
    url:
      "/admin/com/manager?comId=" +
      competitionId +
      "&pageNum=" +
      pageNumber +
      "&pageSize=" +
      pageSize,
  })
}

/**
 * 导出附件
 * @param competitionId 比赛Id
 * @param userCode 队长学号
 * @returns Axios 对象
 */
export const exportWorkFile = (competitionId: number, userCode: string) => {
  return apis({
    method: "get",
    url: "/admin/data/exportWork?comId=" + competitionId + "&userCode=" + userCode,
    responseType: "blob",
  })
}

/**
 * 设置白名单
 * @param competitionId 比赛Id
 * @param isWhiteList 是否添加白名单
 * @param file 文件
 * @returns Axios 对象
 */
export const editWhiteList = (competitionId: number, isWhiteList: boolean, file?: Blob) => {
  const formData = new FormData()
  if (isWhiteList && file) {
    formData.append("file", file)
  }
  formData.append("isWhiteList", isWhiteList.toString())
  formData.append("comId", competitionId + "")
  return apis({
    method: "POST",
    url: "/admin/com/whitelist",
    data: formData,
  })
}
