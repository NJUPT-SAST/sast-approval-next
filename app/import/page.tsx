"use client"

import { AccountImportView } from "@/components/manage/account-import-view"
import { importAccountsFromExcel } from "@/lib/api/judge"

export default function ImportPage() {
  return (
    <AccountImportView
      title="一键导入"
      description="从 Excel 表格批量创建评委账号，导入完成后自动导出账号与初始密码。"
      entity="评委"
      importAccount={importAccountsFromExcel}
    />
  )
}
