"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ClipboardCheckIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FolderDownIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShieldCheckIcon,
  UploadIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"
import { notifyRequestError } from "@/lib/api/errors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { Section } from "@/components/common/section"
import { StatStrip } from "@/components/common/stat-strip"
import { EmptyState, LoadingState } from "@/components/common/states"
import { FileDropzone } from "@/components/common/file-dropzone"
import { useLoadState } from "@/lib/hooks/use-load-state"
import {
  assignJudge,
  exportJudgeResult,
  exportTeamInfo,
  exportWorkFile,
  exportWorkFileDataToAssignScorer,
  getManageCompetitionList,
} from "@/lib/api/admin"
import { saveBlobResponse } from "@/lib/file"
import { withQuery } from "@/lib/navigation"
import { useUiStore } from "@/lib/store/ui"
import type { ManageDetailItem } from "@/lib/types/api"

function JudgesCell({ item }: { item: ManageDetailItem }) {
  if (item.isAssignJudge !== 1) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        未分配
      </Badge>
    )
  }
  const judges = item.judges ?? []
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2">
          <UserCheckIcon className="size-3.5" />
          已分配
          <span className="bg-muted rounded px-1 font-mono text-[11px] tabular-nums">
            {judges.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <p className="text-muted-foreground px-2 py-1 text-xs font-medium">评委名单</p>
        <ul className="max-h-60 overflow-y-auto">
          {judges.map((judge, index) => (
            <li key={`${judge}-${index}`} className="px-2 py-1.5 font-mono text-sm">
              {judge}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function ManageDetailContent() {
  const params = useSearchParams()
  const id = Number(params.get("id"))
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [competitionName, setCompetitionName] = React.useState("")
  const [fileList, setFileList] = React.useState<File[]>([])
  const [pageState, setPageState] = React.useState({ total: 0, pageNumber: 1, pageSize: 10 })
  const {
    requestKey,
    loading: isLoading,
    markLoaded,
    reload,
  } = useLoadState(`${id}|${pageState.pageNumber}|${pageState.pageSize}`)
  const [regState, setRegState] = React.useState({ regNum: 0, revNum: 0, subNum: 0 })
  const [data, setData] = React.useState<ManageDetailItem[]>([])
  const [importing, setImporting] = React.useState(false)

  const getList = React.useCallback(
    (competitionId: number, pageNumber: number, pageSize: number, key: string) => {
      return getManageCompetitionList(competitionId, pageNumber, pageSize)
        .then((res) => {
          const payload = res.data.data
          if (!payload) {
            setData([])
            return
          }
          setRegState({
            regNum: payload.regNum ?? 0,
            subNum: payload.subNum ?? 0,
            revNum: payload.revNum ?? 0,
          })
          setData(payload.records ?? [])
          setCompetitionName(payload.comName ?? "")
          setPageLabel(payload.comName ?? null)
          setPageState((prev) => ({ ...prev, total: payload.total ?? 0 }))
        })
        .catch((error) => {
          notifyRequestError(error, "😭 请求失败", { id: "loading" })
        })
        .finally(() => markLoaded(key))
    },
    [setPageLabel, markLoaded]
  )

  React.useEffect(() => {
    if (!id) return
    getList(id, pageState.pageNumber, pageState.pageSize, requestKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const runExport = (request: Promise<{ data: unknown }>, filename: string, label: string) => {
    toast.loading(`${label}，请稍等`, { id: "download" })
    request
      .then((res) =>
        saveBlobResponse(res.data as Blob, filename, {
          success: `😸 ${label}成功`,
          failure: `😭 ${label}失败`,
        })
      )
      .catch((error) => notifyRequestError(error, "😭 请求失败", { id: "download" }))
  }

  /** 导入评委分配表 */
  const uploadJudges = async () => {
    if (fileList.length !== 1) {
      toast.error("请先上传文件！")
      return
    }
    setImporting(true)
    toast.loading("导入中，请稍等", { id: "download" })
    try {
      const formData = new FormData()
      formData.append("file", fileList[0])
      const res = await assignJudge(formData)
      if (res.data.success) {
        setFileList([])
        setPageState((prev) => ({ ...prev, pageNumber: 1 }))
        reload()
        toast.success("😸 导入成功", { id: "download" })
      } else {
        toast.error("😭 导入失败", { id: "download", description: res.data.errMsg ?? "" })
      }
    } catch {
      toast.error("😭 导入失败", { id: "download" })
    } finally {
      setImporting(false)
    }
  }

  if (!id) {
    return (
      <PageContainer>
        <EmptyState title="缺少比赛 ID" description="请从比赛管理页面重新进入。" />
      </PageContainer>
    )
  }

  const exportWorkOf = (value: ManageDetailItem) =>
    runExport(
      exportWorkFile(value.comId, value.userCode),
      `项目${value.fileName}的附件.zip`,
      "项目附件导出"
    )

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow="管理比赛"
        title={competitionName || (isLoading ? <Skeleton className="h-8 w-56" /> : "管理比赛")}
        description="查看报名与提交情况，分配评委并导出参赛资料。"
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={withQuery("/activity/notice", { id })}>
                <MegaphoneIcon className="size-4" />
                发布公告
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={withQuery("/activity/manage/edit", { id })}>
                <PencilIcon className="size-4" />
                编辑比赛
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href={withQuery("/activity/manage/white-list", { id })}>
                    <ShieldCheckIcon className="size-4" />
                    编辑白名单
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={withQuery("/activity/detail", { id })}>
                    <FileSpreadsheetIcon className="size-4" />
                    查看比赛详情
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  导出
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    runExport(
                      exportJudgeResult(id),
                      `${competitionName} 的评审结果.xlsx`,
                      "评审结果下载"
                    )
                  }
                >
                  <DownloadIcon className="size-4" />
                  评审结果 (xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    runExport(
                      exportTeamInfo(id),
                      `${competitionName} 的参赛信息.xlsx`,
                      "参赛信息导出"
                    )
                  }
                >
                  <FolderDownIcon className="size-4" />
                  参赛信息 (xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <StatStrip
        className="mt-8"
        loading={isLoading && data.length === 0}
        items={[
          {
            key: "regist",
            label: "已报名",
            value: regState.regNum,
            icon: UsersIcon,
            tone: "text-primary",
          },
          {
            key: "submit",
            label: "已提交材料",
            value: regState.subNum,
            icon: FileSpreadsheetIcon,
            tone: "text-chart-2",
          },
          {
            key: "approve",
            label: "已审批",
            value: regState.revNum,
            icon: ClipboardCheckIcon,
            tone: "text-chart-3",
          },
        ]}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div className="min-w-0 space-y-4 lg:order-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-tight">
              已提交项目
              {!isLoading ? (
                <span className="text-muted-foreground ms-2 text-sm font-normal tabular-nums">
                  {pageState.total}
                </span>
              ) : null}
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheetIcon}
              title="没有数据"
              description="现在还没有提交的项目，再等等吧！"
              className="rounded-xl border border-dashed"
            />
          ) : (
            <>
              <TableSurface className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-14">#</TableHead>
                      <TableHead className="min-w-56">项目名称</TableHead>
                      <TableHead className="w-36">评委</TableHead>
                      <TableHead className="w-28 text-right">附件</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((value, index) => (
                      <TableRow key={`${value.fileName}-${index}`}>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {(pageState.pageNumber - 1) * pageState.pageSize + index + 1}
                        </TableCell>
                        <TableCell className="max-w-96 whitespace-normal font-medium">
                          <span className="line-clamp-2">{value.fileName}</span>
                        </TableCell>
                        <TableCell>
                          <JudgesCell item={value} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => exportWorkOf(value)}>
                            <DownloadIcon className="size-3.5" />
                            导出
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableSurface>

              <MobileList className="md:hidden">
                {data.map((value, index) => (
                  <MobileListItem
                    key={`${value.fileName}-${index}`}
                    leading={
                      <IndexBadge>
                        {(pageState.pageNumber - 1) * pageState.pageSize + index + 1}
                      </IndexBadge>
                    }
                    title={value.fileName}
                    meta={<JudgesCell item={value} />}
                    trailing={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="导出附件"
                        onClick={() => exportWorkOf(value)}
                      >
                        <DownloadIcon className="size-4" />
                      </Button>
                    }
                  />
                ))}
              </MobileList>
            </>
          )}

          <DataPagination
            current={pageState.pageNumber}
            pageSize={pageState.pageSize}
            total={pageState.total}
            onChange={(page) => setPageState((prev) => ({ ...prev, pageNumber: page }))}
          />
        </div>

        <aside className="lg:order-2 lg:border-s lg:ps-10">
          <Section
            title="评委分配"
            description="先下载评委模板，在表中填写每个项目的评委学号后再导入。"
          >
            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  runExport(
                    exportWorkFileDataToAssignScorer(id),
                    `${competitionName} 的评委模板.xlsx`,
                    "评委模板下载"
                  )
                }
              >
                <DownloadIcon className="size-4" />
                下载评委模板
              </Button>
              <FileDropzone
                value={fileList}
                onChange={setFileList}
                accept=".xlx,.xlsx"
                maxCount={1}
                title="点击或拖拽上传评委分配表"
                hint="仅支持 xlsx、xlx 格式的单个文件"
                disabled={importing}
              />
              <Button
                className="w-full"
                onClick={uploadJudges}
                disabled={importing || fileList.length === 0}
              >
                <UploadIcon className="size-4" />
                导入评委分配
              </Button>
              <p className="text-muted-foreground text-xs leading-relaxed">
                评委模板含「作品id / 作品名称 / 项目类别」三列，填入评委学号后原表导入即可。
                项目附件为 zip 压缩包，参赛信息与评审结果为 xlsx 表格。
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                注：评审结果目前仅包含已评分的作品，未被评分的作品不会出现在表中；
                参赛信息暂不含指导老师与评分进度，需后端支持后补充。
              </p>
            </div>
          </Section>
        </aside>
      </div>
    </PageContainer>
  )
}

export default function ManageDetailPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <ManageDetailContent />
    </React.Suspense>
  )
}
