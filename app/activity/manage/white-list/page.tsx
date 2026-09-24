"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { WhiteListForm } from "@/components/competition/white-list-form"
import { editWhiteList } from "@/lib/api/admin"
import { getCompetitionInfo } from "@/lib/api/user"
import { useUiStore } from "@/lib/store/ui"

function WhiteListContent() {
  const router = useRouter()
  const params = useSearchParams()
  const competitionId = Number(params.get("id"))
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [competitionName, setCompetitionName] = React.useState("")
  const [checked, setChecked] = React.useState(false)
  const [fileList, setFileList] = React.useState<File[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!competitionId) return
    let cancelled = false
    getCompetitionInfo(competitionId)
      .then((res) => {
        if (cancelled || !res.data.data) return
        setCompetitionName(res.data.data.name)
        setPageLabel(res.data.data.name)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [competitionId, setPageLabel])

  const postWhiteList = async () => {
    if (checked && fileList.length === 0) {
      toast.error("😭 设置失败", { description: "请先上传文件或者选择不设置白名单！" })
      return
    }
    setSubmitting(true)
    try {
      const res = await editWhiteList(competitionId, checked, checked ? fileList[0] : undefined)
      if (res.data.success) {
        toast.success("设置成功")
        router.back()
      } else {
        toast.error("😭 设置失败", { description: res.data.errMsg ?? "" })
      }
    } catch {
      toast.error("😭 设置失败")
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
      <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
        <XIcon className="size-4" />
        取消
      </Button>
      <Button onClick={postWhiteList} disabled={submitting}>
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
        <WhiteListForm
          checked={checked}
          fileList={fileList}
          onCheckedChange={setChecked}
          onFileChange={setFileList}
          disabled={submitting}
        />
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
