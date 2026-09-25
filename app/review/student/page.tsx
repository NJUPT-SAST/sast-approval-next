"use client"

import { AccountImportView } from "@/components/manage/account-import-view"
import { importAccountsFromExcel } from "@/lib/api/judge"

/**
 * 审批人员的学生管理。
 * 目前后端只给这个角色开放了 Excel 批量导入，查看 / 修改已有账号的接口只有管理员能用，
 * 所以这里只做导入，不展示一个点了「成功」却什么都没发生的增删改界面。
 */
export default function ReviewStudentPage() {
  return (
    <AccountImportView
      title="学生管理"
      description="从 Excel 批量导入学生账号，导入完成后自动导出账号与初始密码。查看或修改已有账号请联系系统管理员。"
      entity="学生"
      importAccount={importAccountsFromExcel}
    />
  )
}
