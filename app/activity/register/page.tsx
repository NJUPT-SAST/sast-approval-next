"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarClockIcon, CircleAlertIcon, Loader2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { EmptyState, ErrorState, LoadingState, ResultState } from "@/components/common/states"
import { SchemaForm, useSchemaForm } from "@/components/schema-form"
import { buildRegisterSchema } from "@/lib/constants/register-schema"
import { notifyRequestError } from "@/lib/api/errors"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { getCompetitionInfo, getCompetitionSignInfo, getTeamInfo, signUp } from "@/lib/api/user"
import { withQuery } from "@/lib/navigation"
import { STORAGE_KEYS, readStorage } from "@/lib/storage"
import { useUiStore } from "@/lib/store/ui"
import { isFuture, isPast } from "@/lib/datetime"

type SignConfig = { minParti: number; maxParti: number; isTeam: boolean }

/** 报名时间窗口：未开始 / 已截止时不允许提交 */
type RegWindow = { state: "open" | "upcoming" | "closed"; begin: string; end: string }

function RegisterContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = Number(params.get("id"))
  const form = useSchemaForm()
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const { requestKey, loading, markLoaded, reload } = useLoadState(String(id))
  const [loadFailed, setLoadFailed] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  // 提交失败留在表单页内提示，已填写的内容不丢
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const errorRef = React.useRef<HTMLDivElement>(null)
  const [competitionName, setCompetitionName] = React.useState("")
  const [isEditing, setIsEditing] = React.useState(false)
  const [regWindow, setRegWindow] = React.useState<RegWindow>({
    state: "open",
    begin: "",
    end: "",
  })

  const [config, setConfig] = React.useState<SignConfig>({
    minParti: 1,
    maxParti: 1,
    isTeam: true,
  })
  const [curParti, setCurParti] = React.useState(1)
  const [curTeacher, setCurTeacher] = React.useState(0)

  const schema = React.useMemo(
    () =>
      buildRegisterSchema({
        isTeam: config.isTeam,
        minParti: config.minParti,
        maxParti: config.maxParti,
        partiCount: curParti,
        teacherCount: curTeacher,
      }),
    [config, curParti, curTeacher]
  )

  /** 把队长（当前登录用户）信息写入表单 */
  const fillLeader = React.useCallback(
    (isTeam: boolean) => {
      const leader = {
        name: readStorage(STORAGE_KEYS.name),
        code: readStorage(STORAGE_KEYS.code),
        college: readStorage(STORAGE_KEYS.college),
        major: readStorage(STORAGE_KEYS.major),
        contact: readStorage(STORAGE_KEYS.contact),
      }
      form.setValueByPath(isTeam ? "listOfParti.leader" : "leader", leader)
    },
    [form]
  )

  /** 拉取比赛时间、报名配置与已保存的报名信息 */
  React.useEffect(() => {
    if (!id) return
    let cancelled = false

    const run = async () => {
      try {
        const detail = await getCompetitionInfo(id).catch(() => null)
        if (cancelled) return
        const detailData = detail?.data?.data
        if (detailData) {
          setCompetitionName(detailData.name)
          setPageLabel(detailData.name)
          setRegWindow({
            state: isFuture(detailData.regBegin)
              ? "upcoming"
              : isPast(detailData.regEnd)
                ? "closed"
                : "open",
            begin: detailData.regBegin ?? "",
            end: detailData.regEnd ?? "",
          })
        }

        const signRes = await getCompetitionSignInfo(id)
        if (cancelled) return
        const signData = signRes.data.data
        const isTeam = Boolean(signData?.isTeam)
        const nextConfig: SignConfig = isTeam
          ? {
              isTeam: true,
              minParti: signData.minTeamMembers ?? 1,
              maxParti: signData.maxTeamMembers ?? 15,
            }
          : { isTeam: false, minParti: 1, maxParti: 1 }
        setConfig(nextConfig)
        setCurParti((prev) => Math.max(prev, nextConfig.minParti))
        fillLeader(isTeam)

        const teamRes = await getTeamInfo(id)
        if (cancelled) return
        if (teamRes.data.errCode !== 2003 && teamRes.data.data) {
          const data = teamRes.data.data
          const teamMember = data.teamMember ?? []
          const teacherMember = data.teacherMember ?? []

          setIsEditing(true)
          setCurParti(teamMember.length || nextConfig.minParti)
          setCurTeacher(teacherMember.length)

          form.setValueByPath("input_teamName", data.teamName ?? "")
          form.setValueByPath("listOfParti.select_numOfParti", teamMember.length)
          form.setValueByPath("listOfTeacher.select_numOfTeacher", teacherMember.length)
          for (let i = 1; i <= teamMember.length - 1; i += 1) {
            form.setValueByPath(`listOfParti.parti${i}`, {
              name: teamMember[i]?.name,
              code: teamMember[i]?.code,
              college: teamMember[i]?.college,
              major: teamMember[i]?.major,
              contact: teamMember[i]?.contact,
            })
          }
          for (let i = 1; i <= teacherMember.length; i += 1) {
            form.setValueByPath(`listOfTeacher.teacher${i}`, {
              name: teacherMember[i - 1]?.name,
              code: teacherMember[i - 1]?.code,
            })
          }
          fillLeader(isTeam)
        } else if (teamRes.data.errMsg !== "您还未报名该比赛") {
          toast.error("🙀 已保存的报名信息加载失败", {
            description: teamRes.data.errMsg ?? "可以直接重新填写，或稍后刷新重试",
          })
        }
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

  /** 监听人数滑块变化，动态增删成员表单 */
  const handleValuesChange = (changed: Record<string, unknown>) => {
    const partiValue = changed["listOfParti.select_numOfParti"]
    if (typeof partiValue === "number") setCurParti(partiValue)

    const teacherValue = changed["listOfTeacher.select_numOfTeacher"]
    if (typeof teacherValue === "number") setCurTeacher(teacherValue)
  }

  const showSubmitError = (message: string) => {
    setSubmitError(message)
    window.requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    )
  }

  const onFinish = async (formData: Record<string, unknown>, errors: { name: string }[]) => {
    if (errors.length > 0) {
      toast.error("🤔 表单还有未填写或格式有误的字段", {
        description: "已定位到第一个需要修改的地方",
      })
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const teamName = (formData.input_teamName as string) ?? null
      const listOfParti = (formData.listOfParti ?? {}) as Record<string, unknown>
      const listOfTeacher = (formData.listOfTeacher ?? {}) as Record<string, unknown>

      const teamMember: { name: string; code: string }[] = []
      const teacherMember: { name: string; code: string }[] = []

      const partiCount = Number(listOfParti.select_numOfParti ?? 1)
      for (let i = 1; i <= partiCount - 1; i += 1) {
        const member = listOfParti[`parti${i}`] as { name: string; code: string } | undefined
        if (member) teamMember.push(member)
      }
      const teacherCount = Number(listOfTeacher.select_numOfTeacher ?? 0)
      for (let i = 1; i <= teacherCount; i += 1) {
        const member = listOfTeacher[`teacher${i}`] as { name: string; code: string } | undefined
        if (member) teacherMember.push(member)
      }

      const res = await signUp(id, teamName, teamMember, teacherMember)
      if (res.data.success === true) {
        setSubmitted(true)
        window.scrollTo({ top: 0 })
      } else {
        const code = res.data.errCode ? `（错误代码 ${res.data.errCode}）` : ""
        showSubmitError(`${res.data.errMsg || "报名信息有误，请检查后重新提交"}${code}`)
      }
    } catch (error) {
      notifyRequestError(error, "🙀 提交失败，请稍后重试")
      showSubmitError("网络异常，报名信息没有提交成功。已填写的内容仍然保留，可以直接重新提交。")
    } finally {
      setSubmitting(false)
    }
  }

  if (!id) {
    return (
      <PageContainer>
        <EmptyState title="缺少比赛 ID" description="请从比赛入口重新进入。" />
      </PageContainer>
    )
  }

  if (submitted) {
    return (
      <PageContainer size="narrow">
        <ResultState
          status="success"
          title={isEditing ? "报名信息已更新" : "报名成功"}
          subTitle="记得在材料提交阶段上传你的项目材料，祝你比赛顺利。"
          className="min-h-[60vh]"
          extra={
            <>
              <Button onClick={() => router.push(withQuery("/activity/register-detail", { id }))}>
                查看报名详情
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(withQuery("/activity/detail", { id }))}
              >
                返回比赛详情
              </Button>
            </>
          }
        />
      </PageContainer>
    )
  }

  if (!loading && loadFailed) {
    return (
      <PageContainer size="narrow">
        <ErrorState
          className="min-h-[50vh]"
          description="报名信息没有加载出来，请检查网络后重试。"
          onRetry={reload}
        />
      </PageContainer>
    )
  }

  const windowClosed = regWindow.state !== "open"

  const submitButton = (
    <Button size="lg" onClick={form.submit} disabled={submitting || loading || windowClosed}>
      {submitting ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
      {isEditing ? "保存报名信息" : "提交报名"}
    </Button>
  )

  return (
    <PageContainer size="narrow">
      <PageHeader
        eyebrow={competitionName || undefined}
        title={isEditing ? "修改报名信息" : "比赛报名"}
        description={
          <>
            {config.isTeam ? "填写队伍与成员信息完成报名。" : "确认个人信息完成报名。"}带{" "}
            <span className="text-destructive">*</span> 的为必填项；
            {config.isTeam ? "队长" : "参赛者"}信息取自你的账号，如有误请联系管理员。
          </>
        }
      />

      {!loading && windowClosed ? (
        <Alert className="motion-safe:animate-fade-enter mt-6">
          <CalendarClockIcon />
          <AlertTitle>{regWindow.state === "upcoming" ? "报名还没开始" : "报名已截止"}</AlertTitle>
          <AlertDescription>
            {regWindow.state === "upcoming"
              ? `报名将于 ${regWindow.begin} 开始，届时再来提交。`
              : `报名已于 ${regWindow.end} 截止，报名信息不能再提交或修改。`}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-8">
        {loading ? (
          <LoadingState label="正在加载报名信息……" />
        ) : (
          <>
            <SchemaForm
              form={form}
              schema={schema}
              onFinish={onFinish}
              onValuesChange={handleValuesChange}
              disabled={submitting || windowClosed}
            />
            {submitError ? (
              <div ref={errorRef} className="mt-8 scroll-mt-24">
                <Alert variant="destructive" className="motion-safe:animate-fade-enter">
                  <CircleAlertIcon />
                  <AlertTitle>提交没有成功</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              </div>
            ) : null}
            <div className="mt-8 hidden border-t pt-6 sm:flex sm:justify-end">{submitButton}</div>
          </>
        )}
      </div>

      {!loading ? <MobileActionBar>{submitButton}</MobileActionBar> : null}
    </PageContainer>
  )
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <RegisterContent />
    </React.Suspense>
  )
}
