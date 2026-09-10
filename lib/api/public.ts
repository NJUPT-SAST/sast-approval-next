"use client"

import { apis } from "./client"

/**
 * 登录接口
 * @param captcha 通过验证码接口获取的验证码uuid
 * @param validateCode 输入的验证码内容
 * @param studentId 学号
 * @param password 密码
 */
export const login = (
  captcha: string,
  validateCode: string,
  studentId: string,
  password: string
) => {
  const data = new FormData()
  data.append("validateCode", validateCode)
  data.append("code", studentId)
  data.append("password", password)
  return apis({
    method: "POST",
    url: "/login",
    headers: {
      CAPTCHA: captcha,
    },
    data: data,
  })
}

/**
 * 获取验证码图片
 * @returns axios对象
 */
export const getValidateCode = () => {
  return apis({
    method: "get",
    url: "/getValidateCode",
    responseType: "blob",
  })
}

/**
 * 获取比赛公告列表
 * @param competitionId 比赛ID
 * @returns axios对象
 */
export const getCompetitionNoticeList = (competitionId: number) => {
  return apis({
    method: "get",
    url: "/com/notice/list?id=" + competitionId.toString(),
  })
}

/**
 * 下载上传的文件
 * @param url 需要下载的文件url
 * @returns axios对象
 */
export const fileDownload = (url: string) => {
  return apis({
    method: "get",
    url: "/com/file/download?url=" + url,
    responseType: "blob",
  })
}

/**
 * 下载验证
 * @param url 需要下载的文件url
 * @returns axios对象
 */
export const downloadCertificate = (url: string) => {
  return apis({
    method: "get",
    url: "/com/file/downloadCertificate",
    params: {
      url: url,
    },
  })
}

/**
 * 获取学院列表（免鉴权）
 *
 * 返回的 `id` 即「审核学院代号」，是 review_settings 的 key，
 * 必须直接使用，不能用列表下标推导，否则学院增删后会静默错位。
 * @returns axios对象
 */
export const getDepartmentList = () => {
  return apis({
    method: "get",
    url: "/com/department/list",
  })
}
