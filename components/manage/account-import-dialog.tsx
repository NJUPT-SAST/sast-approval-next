"use client"

import * as React from "react"
import {
  DownloadIcon,
  FileDownIcon,
  Loader2Icon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableSurface } from "@/components/common/data-list"
import { FileDropzone } from "@/components/common/file-dropzone"
import { ImportCheckAlerts } from "@/components/common/import-check-alerts"
import { notifyRequestError } from "@/lib/api/errors"
import {
  ACCOUNT_FILE_TYPES,
  MAX_ACCOUNT_FILE_SIZE,
  downloadAccountPasswords,
  downloadAccountTemplate,
  type AccountRow,
} from "@/lib/excel-accounts"
import {
  MAX_IMPORT_ROWS,
  REQUIRED_COLUMNS,
  checkAccountWorkbook,
  type ImportCheckResult,
} from "@/lib/import-accounts"

type ImportResult = {
  data: { success: boolean; data?: AccountRow[] | null; errMsg?: string | null }
}

/**
 * 从 Excel 批量导入账号的弹窗：上传 → 本地校验 → 导入 → 导出初始密码。
 * 评委管理、学生管理共用，`importAccount` 决定调用哪个接口。
 *
 * 后端只在导入成功时返回一次初始密码，所以导入完成后不自动关闭弹窗：
 * 密码留在这里，可以反复导出，直到管理员自己确认保存完毕。
 */
export function AccountImportDialog({
  entity,
  open,
  onOpenChange,
  onImported,
  importAccount,
}: {
  /** 账号类型，如「评委」「学生」 */
  entity: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
  importAccount: (file: File) => Promise<ImportResult>
}) {
  const [fileList, setFileList] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const [check, setCheck] = React.useState<ImportCheckResult | null>(null)
  const [created, setCreated] = React.useState<AccountRow[] | null>(null)

  const blocked = check === null || check.issues.length > 0 || check.rows.length === 0

  const handleFileChange = async (files: File[]) => {
    setFileList(files)
    setCheck(null)
    if (files.length === 0) return
    setChecking(true)
    try {
      const result = checkAccountWorkbook(await files[0].arrayBuffer())
      setCheck(result)
      if (result.issues.length > 0) {
        toast.error(`表格有 ${result.issues.length} 处问题`, {
          description: "请按提示修改后重新上传",
        })
      } else {
        toast.success(`校验通过，共 ${result.rows.length} 条记录`)
      }
    } catch {
      setCheck({
        rows: [],
        issues: [{ message: "文件读取失败，请确认文件没有损坏后重试" }],
        blankRows: 0,
        total: 0,
      })
    } finally {
      setChecking(false)
    }
  }

  const handleUpload = async () => {
    if (fileList.length === 0) {
      toast.error("请先选择要导入的 Excel 文件")
      return
    }
    if (check === null) {
      toast.error("表格还在校验中，请稍候")
      return
    }
    if (check.issues.length > 0 || check.rows.length === 0) {
      toast.error("表格校验未通过，请修正后重新上传")
      return
    }
    setUploading(true)
    try {
      const res = await importAccount(fileList[0])
      if (res.data?.success === true) {
        const rows: AccountRow[] = res.data.data ?? []
        // 先把密码留在弹窗里，再尝试自动下载：即使下载被浏览器拦截也不会丢
        setCreated(rows)
        onImported()
        void downloadAccountPasswords(rows)
        toast.success("😸 导入成功", { description: `共生成 ${rows.length} 个账号` })
      } else {
        toast.error("😭 导入失败", { description: res.data?.errMsg ?? "后端没有返回具体原因" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 导入失败", { description: "请稍后重试" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={created === null}
        // 密码只返回这一次：已经生成后不允许点遮罩或按 Esc 误关，必须点「我已保存」
        onInteractOutside={(event) => created !== null && event.preventDefault()}
        onEscapeKeyDown={(event) => created !== null && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>导入{entity}</DialogTitle>
          <DialogDescription>
            {created === null
              ? `从 Excel 批量创建${entity}账号，第一行需为「${REQUIRED_COLUMNS.join("」「")}」，单次最多 ${MAX_IMPORT_ROWS} 条。`
              : "以下是本次生成的账号与初始密码，关闭弹窗后将无法再次查看。"}
          </DialogDescription>
        </DialogHeader>

        {created === null ? (
          <div className="space-y-4">
            <FileDropzone
              value={fileList}
              onChange={handleFileChange}
              accept={ACCOUNT_FILE_TYPES.join(",")}
              maxSize={MAX_ACCOUNT_FILE_SIZE}
              maxCount={1}
              title="点击或拖拽上传账号表格"
              hint="仅支持 xlsx、xls 格式的单个文件，选完会先在本地校验"
              disabled={uploading || checking}
            />

            {checking ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2Icon className="size-4 animate-spin" />
                正在校验表格内容…
              </p>
            ) : null}

            <ImportCheckAlerts check={check} listClassName="max-h-48" />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => void downloadAccountTemplate()}
              >
                <FileDownIcon className="size-4" />
                下载模板
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploading || checking || fileList.length === 0 || blocked}
              >
                {uploading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <UploadIcon className="size-4" />
                )}
                开始导入
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>请及时保存账号数据</AlertTitle>
              <AlertDescription>
                初始密码只在这次导入时返回一次，关闭弹窗后无法再取回，请确认密码表格已经下载并妥善保管。
              </AlertDescription>
            </Alert>

            <TableSurface>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>账号</TableHead>
                      <TableHead>密码</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {created.map((row, index) => (
                      <TableRow key={`${row.code}-${index}`}>
                        <TableCell className="font-mono">{row.code}</TableCell>
                        <TableCell className="font-mono">{row.password}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TableSurface>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => void downloadAccountPasswords(created)}
              >
                <DownloadIcon className="size-4" />
                重新导出
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                我已保存，关闭
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
