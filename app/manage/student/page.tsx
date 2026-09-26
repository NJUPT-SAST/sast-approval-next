"use client"

import * as React from "react"
import { UserRoundIcon } from "lucide-react"
import { LoadingState } from "@/components/common/states"
import AccountManager from "@/components/manage/account-manager"
import {
  createStudentAccount,
  deleteStudentAccount,
  editStudentAccount,
  getStudentAccountList,
} from "@/lib/api/admin"
import { importAccountsFromExcel } from "@/lib/api/judge"

export default function ManageStudentPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <AccountManager
        title="学生管理"
        description="管理学生账号，可在网页上逐个新增、编辑、删除，也可从 Excel 批量导入。"
        entity="学生"
        emptyIcon={UserRoundIcon}
        listAccounts={getStudentAccountList}
        createAccount={createStudentAccount}
        editAccount={editStudentAccount}
        deleteAccount={deleteStudentAccount}
        importAccount={importAccountsFromExcel}
      />
    </React.Suspense>
  )
}
