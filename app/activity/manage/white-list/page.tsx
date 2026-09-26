"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { WhiteListForm } from "@/components/competition/white-list-form"
import { editWhiteList, viewCompetitionInfo } from "@/lib/api/admin"
import { notifyRequestError } from "@/lib/api/errors"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { withQuery } from "@/lib/navigation"
import { useUiStore } from "@/lib/store/ui"

/** 后端的 is_white_list 可能是布尔值也可能是 0 / 1，取不到时返回 null（未知） */
function readWhiteListFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (value === 0 || value === 1) return value === 1
  return null
}

function WhiteListContent() {
  const router = useRouter()
  const params = useSearchParams()
  const competitionId = Number(params.get("id"))
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [competitionName, setCompetitionName] = React.useState("")
  // 当前是否已启用白名单；后端没返回该字段时为 null
  const [current, setCurrent] = React.useState<boolean | null>(null)
  const [checked, setChecked] = React.useState(false)
  const [fileList, setFileList] = React.useState<File[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const { requestKey, loading, markLoaded } = useLoadState(String(competitionId))

  React.useEffect(() => {
    if (!competitionId) return
    let cancelled = false
    viewCompetitionInfo(competitionId)
      .then((res) => {
        if (cancelled || !res.data.success || !res.data.data) return
        const data = res.data.data
        setCompetitionName(data.name ?? "")
        setPageLabel(data.name ?? null)
        const flag = readWhiteListFlag(data.is_white_list)
        setCurrent(flag)
        if (flag !== null) setChecked(flag)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) markLoaded(requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  /** 保存后回到上一页；直接打开链接进来的，回到比赛管理页 */
  const leave = () => {
    if (window.history.length > 1) router.back()
    else router.replace(withQuery("/activity/manage", { id: competitionId }))
  }

  const postWhiteList = async () => {
    if (checked && fileList.length === 0) {
      if (current === true) {
        // 原本就开着、也没传新名单：什么都没变
        toast.info("白名单没有改动")
        leave()
        return
      }
      toast.error("请先上传白名单文件", { description: "或者关闭白名单，面向全校开放报名" })
      return
    }
    if (!checked && current === false) {
      toast.info("白名单没有改动")
      leave()
      return
    }
    setSubmitting(true)
    try {
      const res = await editWhiteList(competitionId, checked, checked ? fileList[0] : undefined)
      if (res.data.success) {
        toast.success(checked ? "😸 白名单已更新" : "😸 已关闭白名单，面向全校开放报名")
        leave()
      } else {
        toast.error("😭 设置失败", { description: res.data.errMsg ?? "请检查文件后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 设置失败", { description: "请稍后重试" })
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

  const actions = (
    <>
      <Button variant="outline" onClick={leave} disabled={submitting}>
        <XIcon className="size-4" />
        取消
      </Button>
      <Button onClick={postWhiteList} disabled={submitting || loading}>
        {submitting ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <CheckIcon className="size-4" />
        )}
        保存
      </Button>
    </>
  )

  return (
    <PageContainer size="narrow">
      <PageHeader
        eyebrow={competitionName || undefined}
        title="编辑白名单"
        description="限制可以报名该比赛的学号范围。上传新的白名单会覆盖原有名单；关闭则表示面向全校开放。"
      />

      <div className="mt-8">
        {loading ? (
          <LoadingState label="正在读取当前设置……" className="min-h-40" />
        ) : (
          <div className="motion-safe:animate-fade-enter space-y-3">
            {current !== null ? (
              <p className="text-muted-foreground text-sm">
                当前状态：
                <span className="text-foreground font-medium">
                  {current ? "已启用白名单" : "未启用，全校开放报名"}
                </span>
                {current ? "。保持开启且不上传新文件，则沿用原名单。" : null}
              </p>
            ) : null}
            <WhiteListForm
              checked={checked}
              fileList={fileList}
              onCheckedChange={setChecked}
              onFileChange={setFileList}
              disabled={submitting}
            />
          </div>
        )}
      </div>

      <div className="mt-10 hidden justify-end gap-2 border-t pt-6 sm:flex">{actions}</div>

      <MobileActionBar>{actions}</MobileActionBar>
    </PageContainer>
  )
}

export default function WhiteListPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <WhiteListContent />
    </React.Suspense>
  )
}
