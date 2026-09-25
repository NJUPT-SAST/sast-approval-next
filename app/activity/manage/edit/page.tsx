"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon, SaveIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { notifyRequestError } from "@/lib/api/errors"
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
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states"
import { CompetitionForm, type ReviewSetting } from "@/components/competition/competition-form"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { deleteCompetitionInfo, editCompetitionInfo, viewCompetitionInfo } from "@/lib/api/admin"
import {
  buildReviewSettings,
  reviewSettingsFromApi,
  validateCompetition,
} from "@/lib/competition-validation"
import { template } from "@/lib/constants/form-templates"
import { focusField } from "@/lib/focus-field"
import { withQuery } from "@/lib/navigation"
import { useUiStore } from "@/lib/store/ui"
import { useUserStore } from "@/lib/store/user"
import type { CompetitionInfoType } from "@/lib/types/api"

function EditCompetitionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const competitionId = Number(params.get("id"))
  const profile = useUserStore((state) => state.profile)
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const { requestKey, loading, markLoaded, reload } = useLoadState(String(competitionId))
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  // 校验未通过的控件 id，任何改动后清掉，提交时重新校验
  const [invalidField, setInvalidField] = React.useState<string | null>(null)
  const [cover, setCover] = React.useState<Blob>()
  const [coverPreview, setCoverPreview] = React.useState("")
  const [preSchema, setPreSchema] = React.useState<object | null>(null)
  const [templateValue, setTemplateValue] = React.useState("-1")
  const [reviewerNum, setReviewerNum] = React.useState(2)
  const [reviewSettings, setReviewSettings] = React.useState<ReviewSetting[]>([
    { key: 0, value: "" },
    { key: -1, value: "" },
  ])

  const [competitionInfo, setCompetitionInfo] = React.useState<CompetitionInfoType>({
    name: "",
    reg_begin_time: "",
    reg_end_time: "",
    submit_begin_time: "",
    submit_end_time: "",
    review_begin_time: "",
    review_end_time: "",
    table: {},
    type: 0,
    min_team_members: 1,
    max_team_members: 1,
    user_code: profile.code,
    is_review: 0,
    introduce: "",
    cover: "",
  })

  const patchInfo = (patch: Partial<CompetitionInfoType>) => {
    setInvalidField(null)
    setCompetitionInfo((prev) => ({ ...prev, ...patch }))
  }

  React.useEffect(() => {
    if (!competitionId) return
    let cancelled = false
    viewCompetitionInfo(competitionId)
      .then((res) => {
        if (cancelled) return
        if (!res.data.success) {
          setLoadError(res.data.errMsg || "比赛信息获取失败")
          return
        }
        setLoadError(null)
        const data = res.data.data
        const array: ReviewSetting[] =
          data.is_review === true
            ? reviewSettingsFromApi(data.review_settings)
            : [{ key: 0, value: "" }]
        setReviewerNum(array.length)
        setReviewSettings(array)
        setPreSchema(data.table ?? null)
        setCoverPreview(data.cover ?? "")
        setPageLabel(data.name)
        setCompetitionInfo({
          name: data.name ?? "",
          reg_begin_time: data.reg_begin_time ?? "",
          reg_end_time: data.reg_end_time ?? "",
          submit_begin_time: data.submit_begin_time ?? "",
          submit_end_time: data.submit_end_time ?? "",
          review_begin_time: data.review_begin_time ?? "",
          review_end_time: data.review_end_time ?? "",
          table: data.table ?? {},
          type: data.type === "SINGLE_COMPETITION" ? 0 : 1,
          min_team_members: data.min_team_members ?? 1,
          max_team_members: data.max_team_members ?? 1,
          user_code: data.user_code ?? profile.code,
          is_review: data.is_review === false ? 0 : 1,
          introduce: data.introduce ?? "",
          cover: data.cover ?? "",
        })
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError("比赛信息没有加载出来，请检查网络后重试。")
        notifyRequestError(error, "😭 获取比赛信息失败")
      })
      .finally(() => {
        if (!cancelled) markLoaded(requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const setStartTime = (time: string, operation: string) => {
    if (operation === "signUp") patchInfo({ reg_begin_time: time })
    if (operation === "submit") patchInfo({ submit_begin_time: time })
    if (operation === "review") patchInfo({ review_begin_time: time })
  }

  const setEndTime = (time: string, operation: string) => {
    if (operation === "signUp") patchInfo({ reg_end_time: time })
    if (operation === "submit") patchInfo({ submit_end_time: time })
    if (operation === "review") patchInfo({ review_end_time: time })
  }

  const setReviewerKey = (index: number, key: number) => {
    setInvalidField(null)
    setReviewSettings((prev) => prev.map((item, i) => (i === index ? { ...item, key } : item)))
  }

  const setReviewerValue = (index: number, value: string) => {
    setInvalidField(null)
    setReviewSettings((prev) => prev.map((item, i) => (i === index ? { ...item, value } : item)))
  }

  const handleAddReviewer = () => {
    if (competitionInfo.is_review === 1) {
      setReviewerNum((num) => num + 1)
      setReviewSettings((prev) => [...prev, { key: -1, value: "" }])
    } else {
      patchInfo({ is_review: 1 })
    }
  }

  const handleRemoveReviewer = () => {
    if (reviewerNum === 1) {
      if (competitionInfo.is_review === 1) patchInfo({ is_review: 0 })
      return
    }
    setReviewerNum((num) => num - 1)
    setReviewSettings((prev) => prev.slice(0, -1))
  }

  const handleTemplateChange = (value: string) => {
    setTemplateValue(value)
    if (value === "-1") {
      patchInfo({ table: (preSchema ?? {}) as object })
    } else {
      patchInfo({ table: template[Number(value)] as unknown as object })
    }
  }

  const submitEdit = async () => {
    const issue = validateCompetition(competitionInfo, reviewSettings, reviewerNum)
    if (issue) {
      setInvalidField(issue.field)
      toast.error(issue.message)
      focusField(issue.field)
      return
    }
    setSubmitting(true)
    try {
      const res = await editCompetitionInfo(
        competitionId,
        competitionInfo,
        buildReviewSettings(reviewSettings, reviewerNum),
        cover
      )
      if (res.data.success) {
        toast.success("😸 保存成功", { description: "已打开更新后的比赛详情" })
        // 替换掉编辑页，返回时回到进入编辑前的页面
        router.replace(withQuery("/activity/detail", { id: res.data.data ?? competitionId }))
      } else {
        toast.error("😭 保存失败", { description: res.data.errMsg ?? "请检查填写内容后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 保存失败", { description: "请稍后重试" })
    } finally {
      setSubmitting(false)
    }
  }

  const submitDelete = async () => {
    setDeleting(true)
    try {
      const res = await deleteCompetitionInfo(competitionId)
      if (res.data.success) {
        toast.success("😸 比赛已删除")
        setDeleteOpen(false)
        router.replace("/manage")
      } else {
        toast.error("😭 删除失败", { description: res.data.errMsg ?? "请稍后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 删除失败", { description: "请稍后重试" })
    } finally {
      setDeleting(false)
    }
  }

  if (!competitionId) {
    return (
      <PageContainer>
        <EmptyState title="缺少比赛 ID" description="请从比赛管理页面重新进入。" />
      </PageContainer>
    )
  }

  if (loading) return <LoadingState label="正在加载比赛信息……" className="min-h-[60vh]" />

  if (loadError) {
    return (
      <PageContainer>
        <ErrorState className="min-h-[50vh]" description={loadError} onRetry={reload} />
      </PageContainer>
    )
  }

  const deleteDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={submitting}
        >
          <Trash2Icon className="size-4" />
          删除比赛
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除该比赛？</AlertDialogTitle>
          <AlertDialogDescription>
            删除「{competitionInfo.name}」后，相关报名与提交数据将无法恢复，请谨慎操作。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // 等请求结束再关闭，失败时弹窗还在，可以直接重试
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
  )

  const primaryActions = (
    <>
      <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
        <XIcon className="size-4" />
        取消
      </Button>
      <Button onClick={submitEdit} disabled={submitting}>
        {submitting ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SaveIcon className="size-4" />
        )}
        保存修改
      </Button>
    </>
  )

  return (
    <PageContainer>
      <PageHeader
        eyebrow={competitionInfo.name || undefined}
        title="编辑比赛"
        description="修改比赛的基本信息、时间安排与审核设置。"
      />

      <div className="mt-10">
        <CompetitionForm
          info={competitionInfo}
          onInfoChange={patchInfo}
          coverPreview={coverPreview}
          onCoverChange={(file, dataUrl) => {
            setCover(file)
            setCoverPreview(dataUrl)
          }}
          templateValue={templateValue}
          onTemplateChange={handleTemplateChange}
          allowKeepTemplate
          reviewSettings={reviewSettings}
          reviewerNum={reviewerNum}
          onAddReviewer={handleAddReviewer}
          onRemoveReviewer={handleRemoveReviewer}
          setReviewerKey={setReviewerKey}
          setReviewerValue={setReviewerValue}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          disabled={submitting}
          invalidField={invalidField}
        />
      </div>

      <div className="mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex sm:order-1">{deleteDialog}</div>
        <div className="hidden gap-2 sm:order-2 sm:flex">{primaryActions}</div>
      </div>

      <MobileActionBar>{primaryActions}</MobileActionBar>
    </PageContainer>
  )
}

export default function EditCompetitionPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <EditCompetitionContent />
    </React.Suspense>
  )
}
