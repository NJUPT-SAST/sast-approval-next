"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon, SaveIcon, SendIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { Section, SectionList } from "@/components/common/section"
import { DateTimePicker } from "@/components/common/date-time-picker"
import { EmptyState, LoadingState } from "@/components/common/states"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { deleteCompetitionNotice, editNotice, releaseNotice } from "@/lib/api/admin"
import { getCompetitionNoticeList } from "@/lib/api/public"
import { getCompetitionInfo } from "@/lib/api/user"
import { useUiStore } from "@/lib/store/ui"
import { cn } from "@/lib/utils"
import type { CompetitionNoticeItem } from "@/lib/types/api"

const AUDIENCE = [
  { value: -1, label: "公开", hint: "所有人可见" },
  { value: 0, label: "选手", hint: "仅参赛选手" },
  { value: 1, label: "评委", hint: "仅评审专家" },
  { value: 2, label: "审核人", hint: "仅审核人员" },
]

function NoticeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const competitionId = Number(params.get("id"))
  const noticeIdParam = params.get("noticeId")
  const noticeId = noticeIdParam ? Number(noticeIdParam) : undefined
  const isEdit = Boolean(noticeId)
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const { requestKey, loading, markLoaded } = useLoadState(`${competitionId}|${noticeId ?? ""}`)
  const [submitting, setSubmitting] = React.useState(false)
  const [competitionName, setCompetitionName] = React.useState("")
  const [pageState, setPageState] = React.useState({
    time: "",
    content: "",
    title: "",
    role: -1,
  })

  React.useEffect(() => {
    if (!competitionId) return
    let cancelled = false

    const tasks: Promise<unknown>[] = [
      getCompetitionInfo(competitionId)
        .then((res) => {
          if (cancelled || !res.data.data) return
          setCompetitionName(res.data.data.name)
          setPageLabel(res.data.data.name)
        })
        .catch(() => undefined),
    ]

    // 编辑模式下从公告列表中找回该条公告的内容
    if (noticeId) {
      tasks.push(
        getCompetitionNoticeList(competitionId)
          .then((res) => {
            if (cancelled) return
            const list: CompetitionNoticeItem[] = res.data.data ?? []
            const target = list.find((item) => item.id === noticeId)
            if (target) {
              setPageState({
                title: target.title ?? "",
                content: target.content ?? "",
                time: (target.time ?? "").replace(/\./g, "-").slice(0, 16),
                role: target.role ?? -1,
              })
            } else {
              toast.warning("未找到该公告", { description: "可能已被删除，请返回重试" })
            }
          })
          .catch(() => undefined)
      )
    }

    Promise.all(tasks).finally(() => {
      if (!cancelled) markLoaded(requestKey)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const validate = () => {
    if (!pageState.title.trim()) {
      toast.error("请填写公告标题")
      return false
    }
    if (!pageState.content.trim()) {
      toast.error("请填写公告内容")
      return false
    }
    return true
  }

  const postNotice = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      // 与旧版一致：未选择时间时提交空字符串，由后端按「立即发布」处理
      const res = await releaseNotice(
        competitionId,
        pageState.title,
        pageState.content,
        pageState.role,
        pageState.time
      )
      if (res.data.success) {
        toast.success("😸 发布成功")
        router.back()
      } else {
        toast.error("😭 发布失败", { description: res.data.errMsg ?? "" })
      }
    } catch {
      toast.error("😭 发布失败")
    } finally {
      setSubmitting(false)
    }
  }

  const saveNotice = async () => {
    if (!validate() || !noticeId) return
    setSubmitting(true)
    try {
      const res = await editNotice(
        noticeId,
        pageState.title,
        pageState.content,
        pageState.role,
        pageState.time
      )
      if (res.data.success) {
        toast.success("😸 保存成功")
        router.back()
      } else {
        toast.error("😭 保存失败", { description: res.data.errMsg ?? "" })
      }
    } catch {
      toast.error("😭 保存失败", { description: "快看看哪里出问题了" })
    } finally {
      setSubmitting(false)
    }
  }

  const removeNotice = async () => {
    if (!noticeId) return
    setSubmitting(true)
    try {
      const res = await deleteCompetitionNotice(noticeId)
      if (res.data.success) {
        toast.success("😸 删除成功")
        router.back()
      } else {
        toast.error("😭 删除失败", { description: "待会儿再试试吧" })
      }
    } catch {
      toast.error("😭 删除失败")
    } finally {
      setSubmitting(false)
    }
  }

  if (!competitionId) {
    return (
      <PageContainer>
        <EmptyState title="缺少比赛 ID" description="请从比赛管理页面重新进入。" />
      </PageContainer>
    )
  }

  if (loading) return <LoadingState label="正在加载公告信息……" className="min-h-[60vh]" />

  const primaryAction = isEdit ? (
    <Button onClick={saveNotice} disabled={submitting}>
      {submitting ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SaveIcon className="size-4" />
      )}
      保存修改
    </Button>
  ) : (
    <Button onClick={postNotice} disabled={submitting}>
      {submitting ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
      {pageState.time ? "定时发布" : "立即发布"}
    </Button>
  )

  const deleteDialog = isEdit ? (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={submitting}
        >
          <Trash2Icon className="size-4" />
          删除公告
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除该公告？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后参赛者将无法再看到「{pageState.title}」，该操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={removeNotice}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null

  return (
    <PageContainer size="narrow">
      <PageHeader
        eyebrow={competitionName || undefined}
        title={isEdit ? "编辑公告" : "发布公告"}
        description="向指定角色推送比赛通知，可选择立即发布或定时发布。"
      />

      <SectionList className="mt-8">
        <Section title="公告内容">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="notice-title">
                <span className="text-destructive me-0.5">*</span>标题
              </Label>
              <Input
                id="notice-title"
                placeholder="请输入公告标题"
                value={pageState.title}
                disabled={submitting}
                className="h-11 text-base font-medium"
                onChange={(event) =>
                  setPageState((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-content">
                <span className="text-destructive me-0.5">*</span>正文
              </Label>
              <Textarea
                id="notice-content"
                rows={12}
                placeholder="请输入公告内容"
                value={pageState.content}
                disabled={submitting}
                className="leading-relaxed"
                onChange={(event) =>
                  setPageState((prev) => ({ ...prev, content: event.target.value }))
                }
              />
            </div>
          </div>
        </Section>

        <Section title="发布设置" description="面向对象决定哪些角色能在比赛详情中看到这条公告。">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>面向对象</Label>
              <RadioGroup
                value={String(pageState.role)}
                disabled={submitting}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                onValueChange={(value) =>
                  setPageState((prev) => ({ ...prev, role: Number(value) }))
                }
              >
                {AUDIENCE.map((item) => (
                  <Label
                    key={item.value}
                    htmlFor={`audience-${item.value}`}
                    className={cn(
                      "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 font-normal transition-colors",
                      submitting && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <RadioGroupItem
                      value={String(item.value)}
                      id={`audience-${item.value}`}
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="text-muted-foreground block text-xs">{item.hint}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-time">发布时间</Label>
              <DateTimePicker
                id="notice-time"
                value={pageState.time}
                withSeconds={false}
                placeholder="立即发布"
                disabled={submitting}
                className="sm:max-w-xs"
                onChange={(time) => setPageState((prev) => ({ ...prev, time }))}
              />
              <p className="text-muted-foreground text-xs">
                留空表示立即发布；选择未来时间则系统会在该时间点自动发布。
              </p>
            </div>
          </div>
        </Section>
      </SectionList>

      <div className="mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex sm:order-1">{deleteDialog}</div>
        <div className="hidden gap-2 sm:order-2 sm:flex">{primaryAction}</div>
      </div>

      <MobileActionBar>{primaryAction}</MobileActionBar>
    </PageContainer>
  )
}

export default function NoticePage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <NoticeContent />
    </React.Suspense>
  )
}
