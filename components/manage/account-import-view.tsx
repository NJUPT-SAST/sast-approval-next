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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageContainer, PageHeader } from "@/components/common/page-header"
import { Section, SectionList } from "@/components/common/section"
import { TableSurface } from "@/components/common/data-list"
import { EmptyState } from "@/components/common/states"
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
  type ImportCheckResult,
  checkAccountWorkbook,
} from "@/lib/import-accounts"

type ImportResult = {
  data: { success: boolean; data?: AccountRow[] | null; errMsg?: string | null }
}

/**
 * 整页形式的账号批量导入：上传 → 本地逐行校验 → 导入 → 展示并导出初始密码。
 * 「一键导入」与审批人员的「学生管理」共用。
 */
export function AccountImportView({
  title,
  description,
  entity,
  importAccount,
}: {
  title: string
  description: string
  /** 账号类型，如「评委」「学生」 */
  entity: string
  importAccount: (file: File) => Promise<ImportResult>
}) {
  const [fileList, setFileList] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const [check, setCheck] = React.useState<ImportCheckResult | null>(null)
  const [data, setData] = React.useState<AccountRow[]>([])

  const blocked = check === null || check.issues.length > 0 || check.rows.length === 0

  // 初始密码只返回一次：有未离开的导入结果时，关闭或刷新页面前让浏览器确认一次
  React.useEffect(() => {
    if (data.length === 0) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [data.length])

  /** 选完文件立刻在本地解析并逐行校验，不合格就不让提交 */
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
          description: "请按下方提示修改后重新上传",
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
    if (check.issues.length > 0) {
      toast.error(`表格还有 ${check.issues.length} 处问题未修正`, {
        description: "修好后重新上传即可导入",
      })
      return
    }
    if (check.rows.length === 0) {
      toast.error("表格里没有可导入的数据")
      return
    }
    setUploading(true)
    try {
      const res = await importAccount(fileList[0])
      if (res.data?.success === true) {
        const rows: AccountRow[] = res.data.data ?? []
        setData(rows)
        void downloadAccountPasswords(rows)
        setFileList([])
        setCheck(null)
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
    <PageContainer size="narrow">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" onClick={() => void downloadAccountTemplate()}>
            <FileDownIcon className="size-4" />
            下载模板
          </Button>
        }
      />

      <SectionList className="mt-8">
        <Section
          title="1. 上传账号表格"
          description={`表格第一行需为「${REQUIRED_COLUMNS.join("」「")}」，单次最多 ${MAX_IMPORT_ROWS} 条，可先下载模板后填写。`}
        >
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

            <ImportCheckAlerts check={check} />

            <Button
              onClick={handleUpload}
              disabled={uploading || checking || fileList.length === 0 || blocked}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="size-4" />
              )}
              开始导入
            </Button>
          </div>
        </Section>

        <Section
          title="2. 生成的账号"
          description={`导入成功后会自动下载${entity}账号的密码表，也可以在这里重新导出。`}
          actions={
            data.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void downloadAccountPasswords(data)}
              >
                <DownloadIcon className="size-4" />
                导出 Excel
              </Button>
            ) : null
          }
        >
          <div className="space-y-4">
            {data.length > 0 ? (
              <Alert variant="destructive" className="motion-safe:animate-fade-enter">
                <TriangleAlertIcon />
                <AlertTitle>请及时保存账号数据</AlertTitle>
                <AlertDescription>
                  初始密码只返回这一次，离开页面后无法再次导出，请务必妥善保管密码表格。
                </AlertDescription>
              </Alert>
            ) : null}

            {data.length === 0 ? (
              <EmptyState
                title="还没有导入记录"
                description="上传表格并导入后，生成的账号会显示在这里。"
                className="min-h-40 rounded-xl border border-dashed"
              />
            ) : (
              <TableSurface className="motion-safe:animate-fade-enter">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>账号</TableHead>
                      <TableHead>密码</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, index) => (
                      <TableRow key={`${row.code}-${index}`}>
                        <TableCell className="font-mono">{row.code}</TableCell>
                        <TableCell className="font-mono">{row.password}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableSurface>
            )}
          </div>
        </Section>
      </SectionList>
    </PageContainer>
  )
}
