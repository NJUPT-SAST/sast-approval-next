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
} from "@/lib/api/admin"
import { importAccountsFromExcel } from "@/lib/api/judge"

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
        // 账号表格（学号 / 姓名 / 联系方式）走一键导入接口；
        // /admin/judge/assign 是「评委分配表」的上传接口，表头完全不同，不能混用
        importAccount={importAccountsFromExcel}
      />
    </React.Suspense>
  )
}
