"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  SendIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { notifyRequestError } from "@/lib/api/errors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageContainer, PageHeader } from "@/components/common/page-header"
import { Section, SectionList, InfoRow } from "@/components/common/section"
import { EmptyState, LoadingState } from "@/components/common/states"
import { useLoadState } from "@/lib/hooks/use-load-state"
import {
  getJudgeWorkInfo,
  getScoreWork,
  uploadWorkJudgeInfo,
  uploadWorkScoreInfo,
} from "@/lib/api/judge"
import { downloadCertifiedFile } from "@/lib/file"
import { useUiStore } from "@/lib/store/ui"
import { useUserStore } from "@/lib/store/user"
import { cn } from "@/lib/utils"
import type { ProgramInfo } from "@/lib/types/judge"

const EMPTY_INFO: ProgramInfo = {
  title: "",
  teamName: "",
  introduce: "",
  memberList: [],
  accessories: [],
  texts: [],
}

/** 参赛者列表 */
function MemberList({ members }: { members: ProgramInfo["memberList"] }) {
  if (members.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无参赛者信息</p>
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {members.map((member, index) => (
        <li
          key={`${member.code}-${index}`}
          className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
        >
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {member.name?.slice(0, 1) || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{member.name}</p>
            <p className="text-muted-foreground truncate font-mono text-xs">{member.code}</p>
          </div>
          <Badge variant={index === 0 ? "default" : "secondary"} className="shrink-0">
            {member.isCaptain}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

/** 项目文字信息 */
function TextsSection({ texts }: { texts: ProgramInfo["texts"] }) {
  if (!texts || texts.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无项目信息</p>
  }
  return (
    <dl className="divide-y">
      {texts.map((item, index) => (
        <InfoRow key={`${item.input}-${index}`} label={item.input}>
          <span className="whitespace-pre-wrap">{item.content || "—"}</span>
        </InfoRow>
      ))}
    </dl>
  )
}

/** 项目附件列表 */
function AccessoriesSection({ accessories }: { accessories: ProgramInfo["accessories"] }) {
  if (!accessories || accessories.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无附件</p>
  }
  return (
    <ul className="divide-y rounded-xl border">
      {accessories.map((item, index) => (
        <li key={`${item.file}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
          <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
          <button
            type="button"
            className="hover:text-primary min-w-0 flex-1 truncate text-start text-sm font-medium underline-offset-4 hover:underline"
            onClick={() => downloadCertifiedFile(item.url)}
            title={item.file}
          >
            {item.file}
          </button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="下载附件"
            onClick={() => downloadCertifiedFile(item.url)}
          >
            <DownloadIcon className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}

function ReviewDetailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = Number(params.get("id"))
  const role = useUserStore((state) => state.role)
  const isApprover = role === "approver"
  const actionLabel = isApprover ? "评审" : "审核"
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [dataList, setDataList] = React.useState<ProgramInfo>(EMPTY_INFO)
  const { requestKey, loading, markLoaded } = useLoadState(`${id}|${isApprover}`)
  const [submitting, setSubmitting] = React.useState(false)

  // 评委表单
  const [score, setScore] = React.useState<string>("")
  const [opinion, setOpinion] = React.useState<string>("")
  // 审核表单
  const [isPass, setIsPass] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false

    const request = isApprover ? getScoreWork(id) : getJudgeWorkInfo(id)
    request
      .then((res) => {
        if (cancelled) return
        const result = res.data.data
        if (!result) {
          toast.info("页面加载失败", { description: "此页面无数据" })
          router.push("/review")
          return
        }
        if (result.captain) {
          result.memberList = [result.captain, ...(result.memberList ?? [])]
        }
        result.memberList = (result.memberList ?? []).map(
          (member: { name: string; code: string }, index: number) => ({
            ...member,
            isCaptain:
              index === 0 ? (isApprover ? "负责人" : "队长") : isApprover ? "团队成员" : "队员",
          })
        )
        setDataList({ ...EMPTY_INFO, ...result })
        setPageLabel(result.title || result.teamName || null)
        if (isApprover) {
          if (result.score !== null && result.score !== undefined) setScore(String(result.score))
          if (result.opinion) setOpinion(result.opinion)
        }
      })
      .catch((error) => {
        if (!cancelled) notifyRequestError(error, "😭 数据加载失败，请稍后重试")
      })
      .finally(() => {
        if (!cancelled) markLoaded(requestKey)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  /** 评委提交评分 */
  const submitScore = async () => {
    const numeric = Number(score)
    if (score === "" || Number.isNaN(numeric) || numeric <= 0 || numeric > 100) {
      toast.error("✗ 提交失败", { description: "请输入 0-100 之间的数字" })
      return
    }
    setSubmitting(true)
    try {
      await uploadWorkScoreInfo(id, numeric, opinion)
      toast.success("✅ 提交成功", { description: "自动返回列表" })
      router.back()
    } catch {
      toast.error("😭 提交失败，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  /** 审核人提交审核结论 */
  const submitJudge = async () => {
    if (isPass === null) {
      toast.error("✗ 提交失败", { description: "请先选择审核结果" })
      return
    }
    if (!isPass && opinion.trim() === "") {
      toast.error("✗ 提交失败", { description: "意见不能为空" })
      return
    }
    setSubmitting(true)
    try {
      await uploadWorkJudgeInfo(id, isPass, opinion)
      toast.success("✅ 提交成功", { description: "自动返回列表" })
      router.back()
    } catch {
      toast.error("😭 提交失败，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  if (!id) {
    return (
      <PageContainer>
        <EmptyState title="缺少项目 ID" description={`请从${actionLabel}列表重新进入。`} />
      </PageContainer>
    )
  }

  if (loading) return <LoadingState label="正在加载项目信息……" className="min-h-[60vh]" />

  const scoreNumber = Number(score)
  const scoreInvalid =
    score !== "" && (Number.isNaN(scoreNumber) || scoreNumber <= 0 || scoreNumber > 100)

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow={isApprover && dataList.teamName ? `队伍：${dataList.teamName}` : undefined}
        title={dataList.title || dataList.teamName || `项目${actionLabel}`}
        description={`查看项目材料并给出${actionLabel}结论。`}
      />

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-14">
        {/* 项目材料 */}
        <SectionList className="min-w-0">
          <Section title="参赛者" icon={UsersIcon}>
            <MemberList members={dataList.memberList} />
          </Section>

          <Section title="项目信息" icon={FileTextIcon}>
            <TextsSection texts={dataList.texts} />
          </Section>

          <Section title="项目附件" icon={PaperclipIcon} description="点击文件名即可下载。">
            <AccessoriesSection accessories={dataList.accessories} />
          </Section>
        </SectionList>

        {/* 结论面板 */}
        <aside className="xl:border-s xl:ps-10">
          <div className="xl:sticky xl:top-24">
            <div className="border-t pt-8 xl:border-t-0 xl:pt-0">
              <h2 className="text-base font-semibold tracking-tight">{actionLabel}结论</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isApprover
                  ? "请给出 0-100 的分数，并填写评语。"
                  : "请选择是否通过，未通过时必须填写意见。"}
              </p>

              <div className="mt-6 space-y-6">
                {isApprover ? (
                  <div className="space-y-2">
                    <Label htmlFor="review-score">
                      <span className="text-destructive me-0.5">*</span>评分
                    </Label>
                    <div className="relative">
                      <Input
                        id="review-score"
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        placeholder="0 – 100"
                        value={score}
                        disabled={submitting}
                        aria-invalid={scoreInvalid}
                        className="h-11 pe-14 font-mono text-lg"
                        onChange={(event) => setScore(event.target.value)}
                      />
                      <span className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm">
                        / 100
                      </span>
                    </div>
                    {scoreInvalid ? (
                      <p className="text-destructive text-xs">请输入 0-100 之间的数字</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>
                      <span className="text-destructive me-0.5">*</span>审核结果
                    </Label>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup">
                      {[
                        { value: true, label: "通过", icon: CheckIcon, tone: "text-success" },
                        { value: false, label: "未通过", icon: XIcon, tone: "text-destructive" },
                      ].map((option) => {
                        const selected = isPass === option.value
                        return (
                          <button
                            key={option.label}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={submitting}
                            onClick={() => setIsPass(option.value)}
                            className={cn(
                              "flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary/8 text-foreground ring-primary/30 ring-2"
                                : "hover:bg-muted/60 text-muted-foreground"
                            )}
                          >
                            <option.icon className={cn("size-4", selected && option.tone)} />
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-opinion">
                    {isApprover ? (
                      "评语"
                    ) : (
                      <>
                        {isPass === false ? (
                          <span className="text-destructive me-0.5">*</span>
                        ) : null}
                        意见
                      </>
                    )}
                  </Label>
                  <Textarea
                    id="review-opinion"
                    rows={6}
                    placeholder={isApprover ? "请输入评语（可选）" : "未通过时请说明原因"}
                    value={opinion}
                    disabled={submitting}
                    onChange={(event) => setOpinion(event.target.value)}
                  />
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={isApprover ? submitScore : submitJudge}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  提交{actionLabel}结果
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}

export default function ReviewDetailPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <ReviewDetailContent />
    </React.Suspense>
  )
}
