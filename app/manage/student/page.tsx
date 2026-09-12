"use client"

import { UserRoundIcon } from "lucide-react"
import AccountManager from "@/components/manage/account-manager"
import type { AccountManagerProps } from "@/components/manage/account-manager"
import {
  createStudentAccount,
  deleteStudentAccount,
  editStudentAccount,
  getStudentAccountList,
} from "@/lib/api/admin"
import { importAccountsFromExcel } from "@/lib/api/judge"

export default function ManageStudentPage() {
  const managerProps: AccountManagerProps = {
    title: "学生管理",
    description: "管理学生账号，直接在网页上新增、编辑、删除，也可导入 Excel。",
    entity: "学生",
    emptyIcon: UserRoundIcon,
    listAccounts: getStudentAccountList,
    createAccount: createStudentAccount,
    editAccount: editStudentAccount,
    deleteAccount: deleteStudentAccount,
    importAccount: importAccountsFromExcel,
  }

  return <AccountManager {...managerProps} />
}
