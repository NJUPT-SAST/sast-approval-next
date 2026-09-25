"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CalendarClockIcon,
  FileQuestionIcon,
  ImageOffIcon,
  InfoIcon,
  MegaphoneIcon,
  PlusIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, MobileActionBar } from "@/components/common/page-header"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states"
import { CompetitionNotice } from "@/components/competition/competition-notice"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { getJudgeWorkTotal, getScoreWorkTotal } from "@/lib/api/judge"
import { getCompetitionNoticeList } from "@/lib/api/public"
import { getCompetitionInfo, getTeamInfo } from "@/lib/api/user"
import { withQuery } from "@/lib/navigation"
import { useUiStore } from "@/lib/store/ui"
import { roleStateToNumber, useUserStore } from "@/lib/store/user"
import { isFuture, isPast } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { CompetitionDetailType, CompetitionNoticeItem } from "@/lib/types/api"

const SECTIONS = [
  { id: "description", label: "比赛介绍", icon: InfoIcon },
  { id: "notice", label: "公告", icon: MegaphoneIcon },
  { id: "arrangement", label: "时间安排", icon: CalendarClockIcon },
]

const EMPTY_DETAIL: CompetitionDetailType = {
  introduce: "",
  name: "",
  regBegin: "",
  regEnd: "",
  reviewBegin: "",
  reviewEnd: "",
  status: 0,
  submitBegin: "",
  submitEnd: "",
  cover: "",
}

type Phase = { key: string; label: string; begin?: string; end?: string }

/** 根据当前时间判断阶段状态 */
function phaseState(begin?: string, end?: string): "upcoming" | "active" | "done" | "unknown" {
  if (!begin && !end) return "unknown"
  if (end && isPast(end)) return "done"
  if (begin && isFuture(begin)) return "upcoming"
  return "active"
}

const PHASE_LABEL = {
  upcoming: "未开始",
  active: "进行中",
  done: "已结束",
  unknown: "",
}

function Timeline({ phases }: { phases: Phase[] }) {
  return (
    <ol className="relative space-y-6 ps-6 before:bg-border before:absolute before:top-2 before:bottom-2 before:start-[5px] before:w-px">
      {phases.map((phase) => {
        const state = phaseState(phase.begin, phase.end)
        return (
          <li key={phase.key} className="relative">
            <span
              className={cn(
                "ring-background absolute -start-6 top-1 size-[11px] rounded-full ring-4",
                state === "active" && "bg-primary",
                state === "done" && "bg-muted-foreground/60",
                (state === "upcoming" || state === "unknown") && "bg-border"
              )}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-sm font-semibold">{phase.label}</p>
              {state !== "unknown" ? (
                <span
                  className={cn(
                    "text-xs",
                    state === "active" ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {PHASE_LABEL[state]}
                </span>
              ) : null}
            </div>
            <div className="text-muted-foreground mt-1 grid gap-0.5 font-mono text-[13px] sm:grid-cols-[auto_auto_auto] sm:items-center sm:gap-2">
              <span>{phase.begin || "—"}</span>
              <span className="hidden sm:inline">→</span>
              <span>{phase.end || "—"}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

type EntryAction = {
  label: string
  onClick?: () => void
  /** 不可用时的原因，按钮置灰并在旁边说明 */
  reason?: string
}

function ActivityDetailContent() {
  const params = useSearchParams()
  const router = useRouter()
  const id = Number(params.get("id"))
  const role = useUserStore((state) => state.role)
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [detail, setDetail] = React.useState<CompetitionDetailType>(EMPTY_DETAIL)
  const [notices, setNotices] = React.useState<CompetitionNoticeItem[]>([])
  const [loadError, setLoadError] = React.useState<"network" | "missing" | null>(null)
  const detailState = useLoadState(`detail:${id}`)
  const noticeState = useLoadState(`notice:${id}`)
  // 选手看是否已报名，评委 / 审批人员看本赛是否有分配给自己的项目
  const entryState = useLoadState(`entry:${id}:${role}`)
  const isLoading = detailState.loading
  const noticeLoading = noticeState.loading
  const needsEntryCheck = role === "user" || role === "judge" || role === "approver"
  const entryLoading = needsEntryCheck && entryState.loading
  const [entranceAvailable, setEntranceAvailable] = React.useState(false)
  const [isSigned, setIsSigned] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState("description")

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    getCompetitionInfo(id)
      .then((res) => {
        if (cancelled) return
        if (res.data.data) {
          setLoadError(null)
          setDetail(res.data.data)
          setPageLabel(res.data.data.name)
        } else {
          setLoadError("missing")
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("network")
      })
      .finally(() => {
        if (!cancelled) detailState.markLoaded(detailState.requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailState.requestKey])

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    getCompetitionNoticeList(id)
      .then((res) => {
        if (!cancelled) setNotices(res.data.data ?? [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) noticeState.markLoaded(noticeState.requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeState.requestKey])

  React.useEffect(() => {
    if (!id || !needsEntryCheck) return
    let cancelled = false
    const request =
      role === "user"
        ? getTeamInfo(id).then((res) => {
            if (!cancelled) setIsSigned(res.data.errMsg !== "您还未报名该比赛")
          })
        : (role === "approver" ? getScoreWorkTotal(id) : getJudgeWorkTotal(id)).then((res) => {
            if (!cancelled) setEntranceAvailable(res.data.data !== 0)
          })
    request
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) entryState.markLoaded(entryState.requestKey)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryState.requestKey])

  // 滚动高亮当前锚点
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    )
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [isLoading])

  const regState = phaseState(detail.regBegin, detail.regEnd)

  /** 主按钮：按角色与比赛阶段给出下一步，不可用时直接说明原因 */
  const entryAction = (): EntryAction => {
    switch (role) {
      case "admin":
        return {
          label: "管理比赛",
          onClick: () => router.push(withQuery("/activity/manage", { id })),
        }
      case "user":
        if (isSigned) {
          return {
            label: "查看报名详情",
            onClick: () => router.push(withQuery("/activity/register-detail", { id })),
          }
        }
        if (regState === "upcoming") {
          return { label: "报名未开始", reason: `报名将于 ${detail.regBegin} 开始` }
        }
        if (regState === "done") {
          return { label: "报名已截止", reason: `报名已于 ${detail.regEnd} 截止` }
        }
        return {
          label: "立即报名",
          onClick: () => router.push(withQuery("/activity/register", { id })),
        }
      case "judge":
      case "approver": {
        const verb = role === "judge" ? "审核" : "评审"
        if (!entranceAvailable) {
          return { label: `暂无待${verb}项目`, reason: `本比赛还没有分配给你${verb}的项目` }
        }
        return {
          label: `进入${verb}`,
          onClick: () => router.push(withQuery("/review/list", { comId: id, page: 1 })),
        }
      }
      default:
        return { label: "请先登录" }
    }
  }

  if (!id) {
    return (
      <PageContainer>
        <EmptyState title="缺少比赛 ID" description="请从比赛入口重新进入。" />
      </PageContainer>
    )
  }

  if (!isLoading && loadError === "missing") {
    return (
      <PageContainer>
        <EmptyState
          icon={FileQuestionIcon}
          title="比赛不存在"
          description="这个比赛可能已被删除，或链接有误。"
          className="min-h-[50vh]"
          action={
            <Button variant="outline" onClick={() => router.push("/activity")}>
              返回比赛入口
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (!isLoading && loadError === "network") {
    return (
      <PageContainer>
        <ErrorState
          className="min-h-[50vh]"
          description="比赛信息没有加载出来，请检查网络后重试。"
          onRetry={() => {
            detailState.reload()
            noticeState.reload()
            entryState.reload()
          }}
        />
      </PageContainer>
    )
  }

  const phases: Phase[] = [
    { key: "reg", label: "报名", begin: detail.regBegin, end: detail.regEnd },
    { key: "submit", label: "材料提交", begin: detail.submitBegin, end: detail.submitEnd },
    { key: "review", label: "评审", begin: detail.reviewBegin, end: detail.reviewEnd },
  ]
  const action = entryAction()
  const primaryAction =
    isLoading || entryLoading ? (
      <Skeleton className="h-10 w-full sm:w-32" />
    ) : (
      <Button
        size="lg"
        onClick={action.onClick}
        disabled={!action.onClick}
        title={action.reason}
        className="motion-safe:animate-fade-enter"
      >
        {action.label}
      </Button>
    )

  return (
    <PageContainer>
      {/* 封面 */}
      <div className="bg-muted relative -mx-4 aspect-16/9 overflow-hidden sm:mx-0 sm:aspect-3/1 sm:rounded-2xl">
        {isLoading ? (
          <Skeleton className="size-full rounded-none" />
        ) : detail.cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={detail.cover} alt={`${detail.name} 封面`} className="size-full object-cover" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            <ImageOffIcon className="size-10" />
          </div>
        )}
      </div>

      {/* 标题 + 操作 */}
      <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-72 max-w-full" />
            </>
          ) : (
            <>
              {regState !== "unknown" ? (
                <p
                  className={cn(
                    "text-xs font-medium tracking-wide",
                    regState === "active" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  报名{PHASE_LABEL[regState]}
                  {detail.regEnd ? ` · 截止 ${detail.regEnd}` : ""}
                </p>
              ) : null}
              <h1 className="text-balance-pretty text-2xl font-bold tracking-tight sm:text-3xl">
                {detail.name}
              </h1>
              {/* 手机上主按钮在底栏，按钮不可用的原因放在标题下 */}
              {!entryLoading && action.reason && role !== "user" ? (
                <p className="text-muted-foreground text-sm sm:hidden">{action.reason}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
          {primaryAction}
          {!isLoading && !entryLoading && action.reason ? (
            <p className="text-muted-foreground text-xs">{action.reason}</p>
          ) : null}
        </div>
      </div>

      {/* 手机端锚点：横向滚动的分段导航 */}
      <nav className="bg-background/92 sticky top-14 z-20 -mx-4 mt-6 border-b px-4 backdrop-blur-md lg:hidden">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors",
                activeSection === section.id
                  ? "border-primary text-foreground font-medium"
                  : "text-muted-foreground border-transparent"
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-16">
        <div className="min-w-0 space-y-12">
          <section id="description" className="scroll-mt-28 space-y-4 lg:scroll-mt-24">
            <h2 className="text-lg font-semibold tracking-tight">比赛介绍</h2>
            {isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <p className="text-foreground/85 text-balance-pretty text-[15px] leading-7 whitespace-pre-wrap">
                {detail.introduce || "暂无比赛介绍"}
              </p>
            )}
          </section>

          <section id="notice" className="scroll-mt-28 space-y-4 lg:scroll-mt-24">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">
                公告
                {!noticeLoading && notices.length > 0 ? (
                  <span className="text-muted-foreground ms-2 text-sm font-normal tabular-nums">
                    {notices.length}
                  </span>
                ) : null}
              </h2>
              {role === "admin" ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={withQuery("/activity/notice", { id })}>
                    <PlusIcon className="size-4" />
                    发布公告
                  </Link>
                </Button>
              ) : null}
            </div>
            {noticeLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : notices.length === 0 ? (
              <EmptyState
                icon={MegaphoneIcon}
                title="暂时没有公告"
                description="比赛发布方尚未发布任何公告。"
                className="min-h-36"
              />
            ) : (
              <div className="divide-y">
                {notices.map((item, index) => (
                  <CompetitionNotice
                    key={item.id}
                    comName={detail.name}
                    role={item.role}
                    viewer={roleStateToNumber(role)}
                    noticeId={item.id}
                    comId={id}
                    title={item.title}
                    time={item.time}
                    content={item.content}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="arrangement" className="scroll-mt-28 space-y-5 lg:scroll-mt-24">
            <h2 className="text-lg font-semibold tracking-tight">时间安排</h2>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Timeline phases={phases} />
            )}
          </section>
        </div>

        {/* 桌面端锚点导航 */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 border-s ps-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide">本页内容</p>
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "relative block py-1.5 text-sm transition-colors",
                  activeSection === section.id
                    ? "text-foreground font-medium before:bg-primary before:absolute before:-start-[17px] before:top-1 before:bottom-1 before:w-0.5 before:rounded-full"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>
      </div>

      <MobileActionBar>{primaryAction}</MobileActionBar>
    </PageContainer>
  )
}

export default function ActivityDetailPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <ActivityDetailContent />
    </React.Suspense>
  )
}
