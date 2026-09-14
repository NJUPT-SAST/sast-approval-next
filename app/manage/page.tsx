"use client"

import * as React from "react"
import Link from "next/link"
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "lucide-react"
import { toast } from "sonner"
import { notifyRequestError } from "@/lib/api/errors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MobileList, MobileListItem, TableSurface } from "@/components/common/data-list"
import { EmptyState } from "@/components/common/states"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { exportWorkFileDataToAssignScorer, getCompetitionList } from "@/lib/api/admin"
import { saveBlobResponse } from "@/lib/file"
import { withQuery } from "@/lib/navigation"
import { toDateString } from "@/lib/datetime"
import type { ManageCompetitionItem } from "@/lib/types/api"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  报名中: "default",
  提交中: "default",
  评审中: "secondary",
  已结束: "outline",
  未开始: "outline",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="shrink-0">
      {status || "—"}
    </Badge>
  )
}

/** 报名 / 提交 / 审核 三个数字并排展示 */
function Counters({ item, compact }: { item: ManageCompetitionItem; compact?: boolean }) {
  const cells = [
    { label: "报名", value: item.regNum },
    { label: "提交", value: item.subNum },
    { label: "审核", value: item.revNum },
  ]
  return (
    <div className={compact ? "flex gap-3" : "flex gap-5"}>
      {cells.map((cell) => (
        <span key={cell.label} className="flex items-baseline gap-1">
          <span className="text-muted-foreground text-[11px]">{cell.label}</span>
          <span className="font-mono text-sm tabular-nums">{cell.value}</span>
        </span>
      ))}
    </div>
  )
}

function RowMenu({
  item,
  onExport,
}: {
  item: ManageCompetitionItem
  onExport: (item: ManageCompetitionItem) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="更多操作">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={withQuery("/activity/manage/edit", { id: item.id })}>
            <PencilIcon className="size-4" />
            编辑比赛
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={withQuery("/activity/manage/white-list", { id: item.id })}>
            <ShieldCheckIcon className="size-4" />
            编辑白名单
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={withQuery("/activity/notice", { id: item.id })}>
            <MegaphoneIcon className="size-4" />
            发布公告
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onExport(item)}>
          <DownloadIcon className="size-4" />
          下载评委模板
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ManagePage() {
  const [pageState, setPageState] = React.useState({ pageNumber: 1, pageSize: 9, total: 0 })
  const [records, setRecords] = React.useState<ManageCompetitionItem[]>([])
  const {
    requestKey,
    loading: isLoading,
    markLoaded,
  } = useLoadState(`${pageState.pageNumber}|${pageState.pageSize}`)

  React.useEffect(() => {
    let cancelled = false
    getCompetitionList(pageState.pageNumber, pageState.pageSize)
      .then((res) => {
        if (cancelled) return
        setRecords(res.data.data?.records ?? [])
        setPageState((prev) => ({ ...prev, total: res.data.data?.total ?? 0 }))
      })
      .catch((error) => {
        if (!cancelled) {
          setRecords([])
          notifyRequestError(error, "😭 请求失败", { description: "比赛列表加载失败，请稍后重试" })
        }
      })
      .finally(() => {
        if (!cancelled) markLoaded(requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const handleExport = (item: ManageCompetitionItem) => {
    toast.loading("😸 导出中，请稍等", { id: "download" })
    exportWorkFileDataToAssignScorer(item.id)
      .then((res) =>
        saveBlobResponse(res.data as Blob, `${item.name} 的评委模板.xlsx`, {
          success: `😸 ${item.name} 的评委模板已下载`,
          failure: `😭 ${item.name} 的评委模板下载失败`,
        })
      )
      .catch((error) => notifyRequestError(error, "😭 请求失败", { id: "download" }))
  }

  const empty = (
    <EmptyState
      icon={TrophyIcon}
      title="没有比赛数据"
      description="现在还没有任何比赛，快去创建第一个比赛吧！"
      action={
        <Button asChild>
          <Link href="/manage/create">
            <PlusIcon className="size-4" />
            创建比赛
          </Link>
        </Button>
      }
    />
  )

  return (
    <PageContainer size="wide">
      <PageHeader
        title="比赛管理"
        description="创建、维护全部比赛活动，下载评委模板并发布公告。"
        actions={
          <Button asChild>
            <Link href="/manage/create">
              <PlusIcon className="size-4" />
              创建比赛
            </Link>
          </Button>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : records.length === 0 ? (
          empty
        ) : (
          <>
            {/* 桌面表格 */}
            <TableSurface className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14">#</TableHead>
                    <TableHead className="min-w-56">比赛</TableHead>
                    <TableHead className="min-w-44">时间</TableHead>
                    <TableHead className="min-w-32">审核人员</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                    <TableHead className="min-w-52">报名 / 提交 / 审核</TableHead>
                    <TableHead className="w-32 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {item.id}
                      </TableCell>
                      <TableCell className="max-w-96 whitespace-normal">
                        <Link
                          href={withQuery("/activity/detail", { id: item.id })}
                          className="hover:text-primary line-clamp-1 font-medium underline-offset-4 hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p
                          className="text-muted-foreground line-clamp-1 text-xs"
                          title={item.introduce}
                        >
                          {item.introduce}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {toDateString(item.beginTime)}
                        <span className="mx-1">–</span>
                        {toDateString(item.endTime)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-40 truncate text-sm">
                        <span title={item.reviewer}>{item.reviewer || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <Counters item={item} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={withQuery("/activity/manage", { id: item.id })}>
                              <FileSpreadsheetIcon className="size-3.5" />
                              管理
                            </Link>
                          </Button>
                          <RowMenu item={item} onExport={handleExport} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableSurface>

            {/* 手机列表 */}
            <MobileList className="md:hidden">
              {records.map((item) => (
                <MobileListItem
                  key={item.id}
                  href={withQuery("/activity/manage", { id: item.id })}
                  title={item.name}
                  meta={
                    <>
                      <span className="font-mono">
                        {toDateString(item.beginTime)} – {toDateString(item.endTime)}
                      </span>
                      <Counters item={item} compact />
                    </>
                  }
                  trailing={
                    <>
                      <StatusBadge status={item.status} />
                      <span onClick={(event) => event.preventDefault()}>
                        <RowMenu item={item} onExport={handleExport} />
                      </span>
                    </>
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </div>

      <DataPagination
        className="mt-6"
        current={pageState.pageNumber}
        pageSize={pageState.pageSize}
        total={pageState.total}
        onChange={(page) => setPageState((prev) => ({ ...prev, pageNumber: page }))}
      />
    </PageContainer>
  )
}
