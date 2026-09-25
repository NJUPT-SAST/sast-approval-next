"use client"

import * as React from "react"
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { notifyRequestError } from "@/lib/api/errors"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageContainer, PageHeader } from "@/components/common/page-header"
import { DataPagination } from "@/components/common/data-pagination"
import { IndexBadge, MobileList, MobileListItem, TableSurface } from "@/components/common/data-list"
import { EmptyState, ErrorState } from "@/components/common/states"
import { AccountImportDialog } from "@/components/manage/account-import-dialog"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { readPositiveInt, useQueryParams } from "@/lib/hooks/use-query-params"
import type { AccountRow } from "@/lib/excel-accounts"
import { validateJudgeForm } from "@/lib/validation"

export type AccountRecord = {
  code: string
  name: string
  contact: string
}

type ApiResult<T = unknown> = {
  data: {
    success: boolean
    data?: T
    errMsg?: string | null
  }
}

export type AccountManagerProps = {
  title: string
  description: string
  entity: string
  emptyIcon: React.ComponentType<{ className?: string }>
  listAccounts: (
    pageNum: number,
    pageSize: number
  ) => Promise<ApiResult<{ records: AccountRecord[]; total: number }>>
  createAccount: (data: AccountRecord & { password: string }) => Promise<ApiResult>
  editAccount: (data: AccountRecord & { password?: string }) => Promise<ApiResult>
  deleteAccount: (code: string) => Promise<ApiResult>
  importAccount: (file: File) => Promise<ApiResult<AccountRow[]>>
}

/** 共用的新增 / 编辑账号表单弹窗 */
function AccountFormDialog({
  entity,
  open,
  editing,
  onOpenChange,
  onSaved,
  createAccount,
  editAccount,
}: {
  entity: string
  open: boolean
  editing: AccountRecord | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  createAccount: (data: AccountRecord & { password: string }) => Promise<ApiResult>
  editAccount: (data: AccountRecord & { password?: string }) => Promise<ApiResult>
}) {
  const isEdit = editing !== null
  const [values, setValues] = React.useState({
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    contact: editing?.contact ?? "",
    password: "",
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)

  const setField = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }))
    // 改动过的字段先收起错误提示，提交时再统一校验
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validateJudgeForm(values, isEdit)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const first = (["code", "name", "contact", "password"] as const).find(
        (key) => nextErrors[key]
      )
      document.getElementById(`form-${entity}-${first}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const res = isEdit
        ? await editAccount({
            code: values.code,
            name: values.name.trim(),
            contact: values.contact.trim(),
            ...(values.password ? { password: values.password } : {}),
          })
        : await createAccount({
            code: values.code.trim(),
            name: values.name.trim(),
            contact: values.contact.trim(),
            password: values.password,
          })
      if (res.data.success) {
        toast.success(`😸 已${isEdit ? "更新" : "新增"}${entity}`, {
          description: `${values.name.trim()}（${values.code.trim()}）`,
        })
        onSaved()
        onOpenChange(false)
      } else {
        toast.error("😭 保存失败", { description: res.data.errMsg ?? "请检查填写信息后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 保存失败", { description: "请稍后重试" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `编辑${entity}` : `新增${entity}`}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改姓名与联系方式，学号不可改，密码留空则不重置。"
              : `直接录入单个${entity}账号，批量添加请用「导入${entity}」。`}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor={`form-${entity}-code`}>学号</Label>
            <Input
              id={`form-${entity}-code`}
              value={values.code}
              disabled={isEdit}
              placeholder="如 B21021021"
              autoFocus={!isEdit}
              aria-invalid={Boolean(errors.code)}
              onChange={setField("code")}
            />
            {errors.code ? <p className="text-destructive text-xs">{errors.code}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`form-${entity}-name`}>姓名</Label>
            <Input
              id={`form-${entity}-name`}
              value={values.name}
              placeholder="请输入姓名"
              aria-invalid={Boolean(errors.name)}
              onChange={setField("name")}
            />
            {errors.name ? <p className="text-destructive text-xs">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`form-${entity}-contact`}>联系方式</Label>
            <Input
              id={`form-${entity}-contact`}
              value={values.contact}
              inputMode="tel"
              placeholder="请输入手机号"
              aria-invalid={Boolean(errors.contact)}
              onChange={setField("contact")}
            />
            {errors.contact ? <p className="text-destructive text-xs">{errors.contact}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`form-${entity}-password`}>
              {isEdit ? "重置密码（选填）" : "初始密码"}
            </Label>
            <Input
              id={`form-${entity}-password`}
              type="password"
              value={values.password}
              autoComplete="new-password"
              placeholder={isEdit ? "留空则不修改" : "至少 6 位"}
              aria-invalid={Boolean(errors.password)}
              onChange={setField("password")}
            />
            {errors.password ? <p className="text-destructive text-xs">{errors.password}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {isEdit ? "保存" : "新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** 共用的表格行操作菜单 */
function RowMenu({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountRecord
  onEdit: (account: AccountRecord) => void
  onDelete: (account: AccountRecord) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="更多操作">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => onEdit(account)}>
          <PencilIcon className="size-4" />
          编辑
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(account)}>
          <Trash2Icon className="size-4" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** 共用的账号管理主组件（评委管理、学生管理），使用的页面需包在 <Suspense> 里 */
export default function AccountManager({
  title,
  description,
  entity,
  emptyIcon,
  listAccounts,
  createAccount,
  editAccount,
  deleteAccount,
  importAccount,
}: AccountManagerProps) {
  // 页码放在地址栏，刷新或返回时不丢
  const { params, setParams } = useQueryParams()
  const pageNumber = readPositiveInt(params, "page", 1)
  const pageSize = 10
  const [total, setTotal] = React.useState(0)
  const [records, setRecords] = React.useState<AccountRecord[]>([])
  const [failed, setFailed] = React.useState(false)
  const [dialog, setDialog] = React.useState<{
    open: boolean
    editing: AccountRecord | null
    nonce: number
  }>({ open: false, editing: null, nonce: 0 })
  // 删除确认框：target 在关闭动画期间保留，避免文案闪成空白
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    target: AccountRecord | null
  }>({ open: false, target: null })
  const [deleting, setDeleting] = React.useState(false)
  const [importDialog, setImportDialog] = React.useState({ open: false, nonce: 0 })

  const {
    requestKey,
    loading: isLoading,
    markLoaded,
    reload,
  } = useLoadState(`${pageNumber}|${pageSize}`)

  const goToPage = React.useCallback(
    (page: number) => setParams({ page: page > 1 ? page : undefined }),
    [setParams]
  )

  React.useEffect(() => {
    let cancelled = false
    listAccounts(pageNumber, pageSize)
      .then((res) => {
        if (cancelled) return
        const nextRecords = res.data.data?.records ?? []
        const nextTotal = res.data.data?.total ?? 0
        // 删掉某页最后一条后，这一页就空了，自动退回上一页
        if (nextRecords.length === 0 && pageNumber > 1 && nextTotal > 0) {
          goToPage(Math.ceil(nextTotal / pageSize))
          return
        }
        setFailed(false)
        setRecords(nextRecords)
        setTotal(nextTotal)
      })
      .catch((error) => {
        if (cancelled) return
        setFailed(true)
        setRecords([])
        notifyRequestError(error, "😭 请求失败", {
          description: `${entity}列表加载失败，请稍后重试`,
        })
      })
      .finally(() => {
        if (!cancelled) markLoaded(requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const openCreate = () =>
    setDialog((prev) => ({ open: true, editing: null, nonce: prev.nonce + 1 }))
  const openEdit = (account: AccountRecord) =>
    setDialog((prev) => ({ open: true, editing: account, nonce: prev.nonce + 1 }))
  const openImport = () => setImportDialog((prev) => ({ open: true, nonce: prev.nonce + 1 }))
  const openDelete = (account: AccountRecord) => setDeleteDialog({ open: true, target: account })

  const submitDelete = async () => {
    const target = deleteDialog.target
    if (!target) return
    setDeleting(true)
    try {
      const res = await deleteAccount(target.code)
      if (res.data.success) {
        toast.success("😸 已删除", { description: `${target.name} 的账号已删除` })
        setDeleteDialog((prev) => ({ ...prev, open: false }))
        reload()
      } else {
        toast.error("😭 删除失败", { description: res.data.errMsg ?? "请稍后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 删除失败", { description: "请稍后重试" })
    } finally {
      setDeleting(false)
    }
  }

  const rowNumber = (index: number) => (pageNumber - 1) * pageSize + index + 1

  return (
    <PageContainer size="wide">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" onClick={openImport}>
              <UploadIcon className="size-4" />
              导入{entity}
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              新增{entity}
            </Button>
          </>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : failed ? (
          <ErrorState
            description={`${entity}列表没有加载出来，请检查网络后重试。`}
            onRetry={reload}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={`暂无${entity}账号`}
            description={`还没有${entity}账号，可以逐个新增，也可以从 Excel 批量导入。`}
            action={
              <>
                <Button variant="outline" onClick={openImport}>
                  <UploadIcon className="size-4" />
                  导入{entity}
                </Button>
                <Button onClick={openCreate}>
                  <PlusIcon className="size-4" />
                  新增{entity}
                </Button>
              </>
            }
          />
        ) : (
          <>
            {/* 桌面表格 */}
            <TableSurface className="motion-safe:animate-fade-enter hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16">#</TableHead>
                    <TableHead className="min-w-40">学号</TableHead>
                    <TableHead className="min-w-28">姓名</TableHead>
                    <TableHead className="min-w-40">联系方式</TableHead>
                    <TableHead className="w-24 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((item, index) => (
                    <TableRow key={item.code}>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {rowNumber(index)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.contact || "—"}</TableCell>
                      <TableCell className="text-right">
                        <RowMenu account={item} onEdit={openEdit} onDelete={openDelete} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableSurface>

            {/* 手机列表 */}
            <MobileList className="motion-safe:animate-fade-enter md:hidden">
              {records.map((item, index) => (
                <MobileListItem
                  key={item.code}
                  leading={<IndexBadge>{rowNumber(index)}</IndexBadge>}
                  title={
                    <span className="flex items-center gap-2">
                      {item.name}
                      <span className="text-muted-foreground font-mono text-xs">{item.code}</span>
                    </span>
                  }
                  meta={<span className="font-mono">{item.contact || "—"}</span>}
                  menu={<RowMenu account={item} onEdit={openEdit} onDelete={openDelete} />}
                />
              ))}
            </MobileList>
          </>
        )}
      </div>

      {!failed ? (
        <DataPagination
          className="mt-6"
          current={pageNumber}
          pageSize={pageSize}
          total={total}
          onChange={(page) => goToPage(page)}
        />
      ) : null}

      <AccountFormDialog
        key={`form-${dialog.nonce}`}
        entity={entity}
        open={dialog.open}
        editing={dialog.editing}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        onSaved={reload}
        createAccount={createAccount}
        editAccount={editAccount}
      />

      <AccountImportDialog
        key={`import-${importDialog.nonce}`}
        entity={entity}
        open={importDialog.open}
        onOpenChange={(open) => setImportDialog((prev) => ({ ...prev, open }))}
        onImported={reload}
        importAccount={importAccount}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !deleting && setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该{entity}？</AlertDialogTitle>
            <AlertDialogDescription>
              删除「{deleteDialog.target?.name}（{deleteDialog.target?.code}
              ）」后，该账号将无法登录系统，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // 默认点击就会关闭弹窗，这里等请求结束再关，失败时还能重试
                event.preventDefault()
                void submitDelete()
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleting ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {deleting ? "正在删除…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
