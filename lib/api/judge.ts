"use client"

import { apis } from "./client"

/**
 * 提交项目审核列表
 * @param workId 项目 id
 * @param accept 是否通过
 * @param opinion 对通过情况的说明，为空时提交空字符串
 * @return axios 对象
 */
export const uploadWorkJudgeInfo = (workId: number, accept: boolean, opinion?: string | null) => {
  const data = new FormData()
  data.append("id", workId.toString())
  data.append("accept", accept.toString())
  // FormData 会把 undefined / null 转成字面量 "undefined" / "null"，必须先归一化
  data.append("opinion", opinion ?? "")
  return apis({
    method: "POST",
    url: "/review/upload",
    data: data,
  })
}

/**
 * 获取审核比赛列表
 * @param page 当前页数
 * @return axios 对象
 */
export const getJudgeCompetitionList = (page: number) => {
  return apis({
    method: "get",
    url: "/review/competition-list?page=" + page,
  })
}

/**
 * 获取审核项目列表
 * @param comId 比赛 id
 * @param page 当前页数
 * @return axios 对象
 */
export const getJudgeWorkList = (comId: number, page: number) => {
  return apis({
    method: "get",
    url: "/review/program-list?comId=" + comId + "&page=" + page,
  })
}

/**
 * 获取审核项目信息
 * @param workId 项目id
 * @return axios 对象
 */
export const getJudgeWorkInfo = (workId: number) => {
  return apis({
    method: "get",
    url: "/review/program-info?id=" + workId,
  })
}

/**
 * 获取评分比赛列表
 * @param page 当前页数
 * @return axios 对象
 */
export const getScoreCompetitionList = (page: number) => {
  return apis({
    method: "get",
    url: "/score/competition-list?page=" + page,
  })
}

/**
 * 获取评分项目列表
 * @param comId 比赛 id
 * @param page 当前页数
 * @return axios 对象
 */
export const getScoreWorkList = (comId: number, page: number) => {
  return apis({
    method: "get",
    url: "/score/program-list?comId=" + comId + "&page=" + page,
  })
}

/**
 * 获取评分项目信息
 * @param workId 项目id
 * @return axios 对象
 */
export const getScoreWork = (workId: number) => {
  if (workId === undefined) {
    workId = 1
  }
  return apis({
    method: "get",
    url: "/score/program-info?id=" + workId,
  })
}

/**
 * 获取评分项目总数
 * @param workId 比赛id
 * @return axios 对象
 */
export const getScoreWorkTotal = (workId: number) => {
  return apis({
    method: "get",
    url: "/score/total?comId=" + workId,
  })
}

/**
 * 获取审批项目总数
 * @param workId 比赛id
 * @return axios 对象
 */
export const getJudgeWorkTotal = (workId: number) => {
  return apis({
    method: "get",
    url: "/review/total?comId=" + workId,
  })
}

/**
 * 提交项目评分信息
 * @param workId 项目 id
 * @param score 评的分 0 ~ 100
 * @param opinion 评语，为空时提交空字符串
 * @return axios 对象
 */
export const uploadWorkScoreInfo = (workId: number, score: number, opinion?: string | null) => {
  const data = new FormData()
  data.append("id", workId.toString())
  data.append("score", score.toString())
  // FormData 会把 undefined / null 转成字面量 "undefined" / "null"，必须先归一化
  data.append("opinion", opinion ?? "")
  return apis({
    method: "POST",
    url: "/score/upload",
    data: data,
  })
}

/**
 * 审核红点
 * @return axios 对象
 */
export const judgePoint = () => {
  return apis({
    method: "get",
    url: "/review/red-point",
  })
}

/**
 * 评分红点
 * @return axios 对象
 */
export const scorePoint = () => {
  return apis({
    method: "get",
    url: "/score/red-point",
  })
}

/**
 * 从 Excel 一键导入评委账号
 * @param file 账号表格（学号 / 姓名 / 联系方式）
 * @param depId 部门 id，旧版固定为 1
 * @return axios 对象
 */
export const importAccountsFromExcel = (file: File, depId = 1) => {
  const data = new FormData()
  data.append("file", file)
  return apis({
    method: "POST",
    url: "/review/import?depId=" + depId,
    data: data,
  })
}
