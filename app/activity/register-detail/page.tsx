"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CloudDownloadIcon,
  FileTextIcon,
  GraduationCapIcon,
  PencilIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/common/page-header"
import { Section, SectionList, InfoRow } from "@/components/common/section"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states"
import {
  getCompetitionInfo,
  getCompetitionSignInfo,
  getTeamInfo,
  getWorkInfo,
} from "@/lib/api/user"
import { downloadCertifiedFile } from "@/lib/file"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { withQuery } from "@/lib/navigation"
import { useUiStore } from "@/lib/store/ui"
import { isFuture, isPast } from "@/lib/datetime"
import type { TeamInfo, WorkDataItem } from "@/lib/types/api"

function PersonRow({
  role,
  member,
  codeLabel = "学号",
  highlight,
}: {
  role: string
  member: { name: string; code: string }
  codeLabel?: string
  highlight?: boolean
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={
          "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold " +
          (highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
        }
      >
        {member.name?.slice(0, 1) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.name || "—"}</p>
        <p className="text-muted-foreground truncate font-mono text-xs">
          {codeLabel} {member.code || "—"}
        </p>
      </div>
      <Badge variant={highlight ? "default" : "secondary"} className="shrink-0">
        {role}
      </Badge>
    </li>
  )
}

function RegisterDetailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = Number(params.get("id"))
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const { requestKey, loading: isLoading, markLoaded, reload } = useLoadState(String(id))
  const [loadFailed, setLoadFailed] = React.useState(false)
  const [competitionName, setCompetitionName] = React.useState("")
  const [isTeam, setIsTeam] = React.useState(true)
  const [regClosed, setRegClosed] = React.useState(false)
  const [beforeSubmitTime, setBeforeSubmitTime] = React.useState(false)
  const [afterSubmitTime, setAfterSubmitTime] = React.useState(false)
  const [submitBegin, setSubmitBegin] = React.useState("")
  const [teamInfo, setTeamInfo] = React.useState<TeamInfo>({
    teamName: "",
    teamMember: [],
    teacherMember: [],
  })
  const [workData, setWorkData] = React.useState<WorkDataItem[] | null>(null)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false

    const run = async () => {
      try {
        const detailRes = await getCompetitionInfo(id)
        if (cancelled) return
        const detail = detailRes.data.data
        if (detail) {
          setCompetitionName(detail.name)
          setPageLabel(detail.name)
          setRegClosed(isPast(detail.regEnd))
          setBeforeSubmitTime(isFuture(detail.submitBegin))
          setAfterSubmitTime(isPast(detail.submitEnd))
          setSubmitBegin(detail.submitBegin ?? "")
        }

        const signRes = await getCompetitionSignInfo(id)
        if (cancelled) return
        setIsTeam(Boolean(signRes.data.data?.isTeam))

        const teamRes = await getTeamInfo(id)
        if (cancelled) return
        if (teamRes.data.errMsg === "您还未报名该比赛") {
          // 还没报名就没有详情可看，直接换成报名页，不留历史记录
          router.replace(withQuery("/activity/register", { id }))
          return
        }
        if (teamRes.data.data) {
          setTeamInfo({
            teamName: teamRes.data.data.teamName ?? "",
            teamMember: teamRes.data.data.teamMember ?? [],
            teacherMember: teamRes.data.data.teacherMember ?? [],
          })
        }

        const workRes = await getWorkInfo(id)
        if (cancelled) return
        setWorkData(workRes.data.data ?? null)
        setLoadFailed(false)
      } catch {
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) markLoaded(requestKey)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  if (!id) {
    return (
      <PageContainer>
        <EmptyState title="缺少比赛 ID" description="请从比赛入口重新进入。" />
      </PageContainer>
    )
  }

  if (!isLoading && loadFailed) {
    return (
      <PageContainer size="narrow">
        <ErrorState
          className="min-h-[50vh]"
          description="报名详情没有加载出来，请检查网络后重试。"
          onRetry={reload}
        />
      </PageContainer>
    )
  }

  const goSubmitWork = () => router.push(withQuery("/activity/work-detail", { id }))
  const captain = teamInfo.teamMember[0]
  const members = teamInfo.teamMember.slice(1)
  const hasWork = Boolean(workData && workData.length > 0)

  const submitStatus = beforeSubmitTime
    ? { label: "未到提交时间", variant: "outline" as const }
    : afterSubmitTime
      ? { label: "提交已截止", variant: "destructive" as const }
      : hasWork
        ? { label: "已提交", variant: "default" as const }
        : { label: "待提交", variant: "secondary" as const }

  return (
    <PageContainer size="narrow">
      <PageHeader
        eyebrow={competitionName || undefined}
        title="报名详情"
        description="查看你的报名信息与项目提交情况。"
      />

      <SectionList className="mt-8">
        <Section
          title={isTeam ? "队伍信息" : "报名信息"}
          icon={UsersIcon}
          description={regClosed ? "报名已截止，报名信息不能再修改。" : undefined}
          actions={
            regClosed ? null : (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => router.push(withQuery("/activity/register", { id }))}
              >
                <PencilIcon className="size-3.5" />
                修改
              </Button>
            )
          }
        >
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            <dl className="divide-y">
              <InfoRow label="比赛类型">
                <Badge variant="secondary">{isTeam ? "团队赛" : "个人赛"}</Badge>
              </InfoRow>
              {isTeam ? <InfoRow label="队伍名称">{teamInfo.teamName || "—"}</InfoRow> : null}
              <InfoRow label="参赛人数">{teamInfo.teamMember.length} 人</InfoRow>
              {teamInfo.teacherMember?.length ? (
                <InfoRow label="指导老师">{teamInfo.teacherMember.length} 人</InfoRow>
              ) : null}
            </dl>
          )}
        </Section>

        <Section title="参赛人员" icon={UserRoundIcon}>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {captain ? (
                <PersonRow role={isTeam ? "队长" : "参赛者"} member={captain} highlight />
              ) : null}
              {members.map((item, index) => (
                <PersonRow key={`${item.code}-${index}`} role={`队员 ${index + 1}`} member={item} />
              ))}
              {teamInfo.teacherMember?.map((item, index) => (
                <PersonRow
                  key={`teacher-${item.code}-${index}`}
                  role={`指导老师 ${index + 1}`}
                  member={item}
                  codeLabel="工号"
                />
              ))}
            </ul>
          )}
        </Section>

        <Section
          title={
            <span className="flex items-center gap-2">
              项目提交
              {!isLoading ? (
                <Badge variant={submitStatus.variant}>{submitStatus.label}</Badge>
              ) : null}
            </span>
          }
          icon={FileTextIcon}
          description={
            beforeSubmitTime
              ? "还没到项目提交时间，请留意比赛详情页中的时间安排。"
              : afterSubmitTime
                ? "项目提交已截止，无法再修改。"
                : "在提交截止前可以随时修改项目材料。"
          }
          actions={
            !beforeSubmitTime ? (
              <Button
                size="sm"
                variant={hasWork ? "outline" : "default"}
                disabled={isLoading || afterSubmitTime}
                onClick={goSubmitWork}
              >
                <PencilIcon className="size-3.5" />
                {hasWork ? "修改" : "去提交"}
              </Button>
            ) : null
          }
        >
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : !hasWork || beforeSubmitTime ? (
            <EmptyState
              icon={beforeSubmitTime ? GraduationCapIcon : FileTextIcon}
              title={
                beforeSubmitTime
                  ? "还没到项目提交时间"
                  : afterSubmitTime
                    ? "没有提交项目"
                    : "还没提交过项目"
              }
              description={
                beforeSubmitTime
                  ? submitBegin
                    ? `项目提交将于 ${submitBegin} 开始。`
                    : "请留意比赛详情页中的时间安排。"
                  : afterSubmitTime
                    ? "项目提交时间已结束。"
                    : "提交截止前记得上传项目材料，否则无法正常参赛。"
              }
              action={
                !beforeSubmitTime && !afterSubmitTime ? (
                  <Button onClick={goSubmitWork}>
                    <PencilIcon className="size-4" />
                    去提交项目
                  </Button>
                ) : null
              }
              className="min-h-36 rounded-xl border border-dashed"
            />
          ) : (
            <dl className="motion-safe:animate-fade-enter divide-y">
              {workData!.map((item, index) => (
                <InfoRow key={`${item.input}-${index}`} label={item.input}>
                  {item.isFile ? (
                    <button
                      type="button"
                      className="text-primary inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                      onClick={() => downloadCertifiedFile(item.content)}
                    >
                      <CloudDownloadIcon className="size-4" />
                      下载文件
                    </button>
                  ) : (
                    <span className="whitespace-pre-wrap">{item.content || "—"}</span>
                  )}
                </InfoRow>
              ))}
            </dl>
          )}
        </Section>
      </SectionList>
    </PageContainer>
  )
}

export default function RegisterDetailPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <RegisterDetailContent />
    </React.Suspense>
  )
}
