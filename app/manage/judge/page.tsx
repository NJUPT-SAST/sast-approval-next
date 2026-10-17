"use client"

import * as React from "react"
import { UserCogIcon } from "lucide-react"
import { LoadingState } from "@/components/common/states"
import AccountManager from "@/components/manage/account-manager"
import {
  createJudgeAccount,
  deleteJudgeAccount,
  editJudgeAccount,
  getJudgeAccountList,
  importJudgeAccounts,
} from "@/lib/api/admin"

export default function ManageJudgePage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <AccountManager
        title="评委管理"
        description="管理评委账号，可在网页上逐个新增、编辑、删除，也可从 Excel 批量导入。"
        entity="评委"
        emptyIcon={UserCogIcon}
        listAccounts={getJudgeAccountList}
        createAccount={createJudgeAccount}
        editAccount={editJudgeAccount}
        deleteAccount={deleteJudgeAccount}
        // 账号表格（学号 / 姓名 / 联系方式）走 /admin/judge/import，建的是评委账号；
        // 不能用「一键导入」的 /review/import（那里角色写死为学生），
        // 也不能用 /admin/judge/assign（那是「评委分配表」的上传接口，表头完全不同）
        importAccount={importJudgeAccounts}
        // 评委账号的学号不做学生学号格式限制：工号 / SAST30 这类编号都能录入
        codeRule="any"
      />
    </React.Suspense>
  )
}
