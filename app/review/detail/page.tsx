"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CalendarClockIcon,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MobileActionBar, PageContainer, PageHeader } from "@/components/common/page-header"
import { Section, SectionList, InfoRow } from "@/components/common/section"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states"
import { useLoadState } from "@/lib/hooks/use-load-state"
import {
  getJudgeWorkInfo,
  getJudgeWorkList,
  getScoreWork,
  getScoreWorkList,
  uploadWorkJudgeInfo,
  uploadWorkScoreInfo,
} from "@/lib/api/judge"
import { getCompetitionInfo } from "@/lib/api/user"
import { isPast } from "@/lib/datetime"
import { downloadCertifiedFile } from "@/lib/file"
import { withQuery } from "@/lib/navigation"
import { STORAGE_KEYS, readStorage } from "@/lib/storage"
import { useUiStore } from "@/lib/store/ui"
import { useUserStore } from "@/lib/store/user"
import { cn } from "@/lib/utils"
import type { ProgramInfo, ProgramListItem } from "@/lib/types/judge"

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

/** 评分合法区间。列表页把 0 分视为「未评分」，所以下限是 1 */
const MIN_SCORE = 1
const MAX_SCORE = 100

/** 提交后找下一个待处理项目时最多往后翻几页 */
const MAX_SCAN_PAGES = 20

function ReviewDetailContent({ id, comId, page }: { id: number; comId: number; page: number }) {
  const router = useRouter()
  const role = useUserStore((state) => state.role)
  const isApprover = role === "approver"
  const actionLabel = isApprover ? "评审" : "审核"
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [dataList, setDataList] = React.useState<ProgramInfo>(EMPTY_INFO)
  const { requestKey, loading, markLoaded, reload } = useLoadState(`${id}|${isApprover}`)
  const [failed, setFailed] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [competitionName, setCompetitionName] = React.useState("")
  // 没有比赛 id（直接打开链接）时，退回列表页写入的截止时间
  const [reviewEnd, setReviewEnd] = React.useState(() =>
    comId ? "" : (readStorage(STORAGE_KEYS.reviewEnd) ?? "")
  )
  const ended = isPast(reviewEnd)

  // 评委表单
  const [score, setScore] = React.useState<string>("")
  const [opinion, setOpinion] = React.useState<string>("")
  // 审核表单
  const [isPass, setIsPass] = React.useState<boolean | null>(null)
  const [triedSubmit, setTriedSubmit] = React.useState(false)

  const listHref = comId ? withQuery("/review/list", { comId, page }) : "/review"

  React.useEffect(() => {
    if (!id) return
    let cancelled = false

    const request = isApprover ? getScoreWork(id) : getJudgeWorkInfo(id)
    request
      .then((res) => {
        if (cancelled) return
        const result = res.data.data
        if (!result) {
          toast.info("没有找到这个项目", { description: "可能已被移除，已返回项目列表" })
          router.replace(listHref)
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
        setFailed(false)
        setDataList({ ...EMPTY_INFO, ...result })
        setPageLabel(result.title || result.teamName || null)
        // 已经给过结论的项目，把原结论带出来，方便核对或修改
        if (isApprover) {
          if (result.score !== null && result.score !== undefined) setScore(String(result.score))
        } else if (typeof result.isPass === "boolean") {
          setIsPass(result.isPass)
        }
        if (result.opinion) setOpinion(result.opinion)
      })
      .catch((error) => {
        if (cancelled) return
        setFailed(true)
        notifyRequestError(error, "😭 数据加载失败，请稍后重试")
      })
      .finally(() => {
        if (!cancelled) markLoaded(requestKey)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  // 比赛名与截止时间：用于眉题与「已截止」只读判断
  React.useEffect(() => {
    if (!comId) return
    let cancelled = false
    getCompetitionInfo(comId)
      .then((res) => {
        if (cancelled || !res.data.data) return
        setCompetitionName(res.data.data.name ?? "")
        setReviewEnd(res.data.data.reviewEnd ?? "")
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [comId])

  /** 提交成功后进入同一页里的下一个待处理项目，没有了就回到列表 */
  const goNext = async () => {
    if (!comId) {
      toast.success("✅ 提交成功")
      router.replace("/review")
      return
    }
    // 从当前页往后找第一个还没处理的项目，最多翻 MAX_SCAN_PAGES 页
    try {
      for (let cursor = page; cursor < page + MAX_SCAN_PAGES; cursor += 1) {
        const res = isApprover
          ? await getScoreWorkList(comId, cursor)
          : await getJudgeWorkList(comId, cursor)
        const result = res.data.data
        const list: ProgramListItem[] = result?.list ?? []
        const next = list.find(
          (item) =>
            item.id !== id &&
            (isApprover ? !item.score : item.isPass !== true && item.isPass !== false)
        )
        if (next) {
          toast.success("✅ 提交成功，已进入下一个项目", {
            action: {
              label: "返回列表",
              onClick: () => router.push(withQuery("/review/list", { comId, page: cursor })),
            },
          })
          router.replace(withQuery("/review/detail", { id: next.id, comId, page: cursor }))
          return
        }
        const totalPages = Math.ceil((result?.total ?? 0) / Math.max(1, result?.pageSize ?? 10))
        if (list.length === 0 || cursor >= totalPages) break
      }
    } catch {
      // 取不到列表就直接回列表页，列表页会重新加载最新状态
    }
    toast.success("✅ 提交成功", { description: `全部项目都已${actionLabel}完成` })
    router.replace(listHref)
  }

  const scrollToConclusion = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document
      .getElementById("review-conclusion")
      ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
  }

  /** 评委提交评分 */
  const submitScore = async () => {
    setTriedSubmit(true)
    const numeric = Number(score)
    if (score === "" || Number.isNaN(numeric) || numeric < MIN_SCORE || numeric > MAX_SCORE) {
      toast.error("✗ 还不能提交", { description: `请输入 ${MIN_SCORE}-${MAX_SCORE} 之间的分数` })
      scrollToConclusion()
      document.getElementById("review-score")?.focus({ preventScroll: true })
      return
    }
    setSubmitting(true)
    try {
      const res = await uploadWorkScoreInfo(id, numeric, opinion)
      if (res.data?.success) {
        await goNext()
      } else {
        toast.error("😭 提交失败", { description: res.data?.errMsg ?? "请稍后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 提交失败，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  /** 审核人提交审核结论 */
  const submitJudge = async () => {
    setTriedSubmit(true)
    if (isPass === null) {
      toast.error("✗ 还不能提交", { description: "请先选择审核结果" })
      scrollToConclusion()
      return
    }
    if (!isPass && opinion.trim() === "") {
      toast.error("✗ 还不能提交", { description: "未通过时需要填写意见" })
      scrollToConclusion()
      document.getElementById("review-opinion")?.focus({ preventScroll: true })
      return
    }
    setSubmitting(true)
    try {
      const res = await uploadWorkJudgeInfo(id, isPass, opinion)
      if (res.data?.success) {
        await goNext()
      } else {
        toast.error("😭 提交失败", { description: res.data?.errMsg ?? "请稍后重试" })
      }
    } catch (error) {
      notifyRequestError(error, "😭 提交失败，请稍后重试")
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

  if (failed) {
    return (
      <PageContainer>
        <ErrorState
          className="min-h-[50vh]"
          description="项目信息没有加载出来，请检查网络后重试。"
          onRetry={reload}
        />
      </PageContainer>
    )
  }

  const scoreNumber = Number(score)
  const scoreInvalid =
    (score !== "" || triedSubmit) &&
    (score === "" ||
      Number.isNaN(scoreNumber) ||
      scoreNumber < MIN_SCORE ||
      scoreNumber > MAX_SCORE)
  const opinionMissing = triedSubmit && !isApprover && isPass === false && opinion.trim() === ""
  const locked = submitting || ended

  const submitButton = (
    <Button
      size="lg"
      className="w-full"
      onClick={isApprover ? submitScore : submitJudge}
      disabled={locked}
    >
      {submitting ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
      提交{actionLabel}结果
    </Button>
  )

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow={
          [competitionName, isApprover && dataList.teamName ? `队伍：${dataList.teamName}` : ""]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        title={dataList.title || dataList.teamName || `项目${actionLabel}`}
        description={
          ended
            ? `${actionLabel}已截止，当前为只读查看。`
            : `查看项目材料并给出${actionLabel}结论。`
        }
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
            <div
              id="review-conclusion"
              className="scroll-mt-24 border-t pt-8 xl:border-t-0 xl:pt-0"
            >
              <h2 className="text-base font-semibold tracking-tight">{actionLabel}结论</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isApprover
                  ? `请给出 ${MIN_SCORE}-${MAX_SCORE} 的分数，评语可选。`
                  : "请选择是否通过，未通过时必须填写意见。"}
              </p>

              {ended ? (
                <Alert className="mt-4">
                  <CalendarClockIcon />
                  <AlertTitle>{actionLabel}已截止</AlertTitle>
                  <AlertDescription>截止时间 {reviewEnd}，结论不能再提交或修改。</AlertDescription>
                </Alert>
              ) : null}

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
                        min={MIN_SCORE}
                        max={MAX_SCORE}
                        inputMode="decimal"
                        placeholder={`${MIN_SCORE} – ${MAX_SCORE}`}
                        value={score}
                        disabled={locked}
                        aria-invalid={scoreInvalid}
                        className="h-11 pe-14 font-mono text-lg"
                        onChange={(event) => setScore(event.target.value)}
                      />
                      <span className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm">
                        / 100
                      </span>
                    </div>
                    {scoreInvalid ? (
                      <p className="text-destructive motion-safe:animate-fade-enter text-xs">
                        请输入 {MIN_SCORE}-{MAX_SCORE} 之间的分数
                      </p>
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
                            disabled={locked}
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
                    disabled={locked}
                    aria-invalid={opinionMissing}
                    onChange={(event) => setOpinion(event.target.value)}
                  />
                  {opinionMissing ? (
                    <p className="text-destructive motion-safe:animate-fade-enter text-xs">
                      未通过时需要填写意见
                    </p>
                  ) : null}
                </div>

                {ended ? null : (
                  <div className="hidden sm:block">
                    {submitButton}
                    {comId ? (
                      <p className="text-muted-foreground mt-2 text-center text-xs">
                        提交后自动进入下一个待{actionLabel}的项目
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {ended ? null : <MobileActionBar>{submitButton}</MobileActionBar>}
    </PageContainer>
  )
}

/** 读取查询参数，并以项目 id 为 key 渲染内容：切换到下一个项目时表单状态随之重置 */
function ReviewDetailRoute() {
  const params = useSearchParams()
  const id = Number(params.get("id"))
  const comId = Number(params.get("comId")) || 0
  const page = Number(params.get("page")) || 1
  return <ReviewDetailContent key={id} id={id} comId={comId} page={page} />
}

export default function ReviewDetailPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <ReviewDetailRoute />
    </React.Suspense>
  )
}
