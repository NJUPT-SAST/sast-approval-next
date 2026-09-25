"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CalendarClockIcon,
  CircleAlertIcon,
  FileQuestionIcon,
  InfoIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { EmptyState, ErrorState, LoadingState, ResultState } from "@/components/common/states"
import { SchemaForm, useSchemaForm } from "@/components/schema-form"
import { createSchemaUploader } from "@/components/schema-form/uploader"
import type { SchemaNode } from "@/components/schema-form/types"
import { notifyRequestError } from "@/lib/api/errors"
import { getCompetitionInfo, getWorkInfo, getWorkSchema, uploadWorkSchema } from "@/lib/api/user"
import { withQuery } from "@/lib/navigation"
import { useLoadState } from "@/lib/hooks/use-load-state"
import { useUiStore } from "@/lib/store/ui"
import { isFuture, isPast } from "@/lib/datetime"

/** 超过这个时间还没加载完，就提示用户网络较慢 */
const SLOW_LOADING_MS = 10_000

/** 项目提交时间窗口：未开始 / 已截止时不允许提交 */
type SubmitWindow = { state: "open" | "upcoming" | "closed"; begin: string; end: string }

function WorkDetailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = Number(params.get("id"))
  const form = useSchemaForm()
  const setPageLabel = useUiStore((state) => state.setPageLabel)

  const [schema, setSchema] = React.useState<SchemaNode | null>(null)
  const { requestKey, loading, markLoaded, reload } = useLoadState(String(id))
  const [loadError, setLoadError] = React.useState<"network" | "no-schema" | null>(null)
  const [slowKey, setSlowKey] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  // 提交失败留在表单页内提示，已填写的内容与已上传的文件都不丢
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const errorRef = React.useRef<HTMLDivElement>(null)
  const [competitionName, setCompetitionName] = React.useState("")
  const [hasSaved, setHasSaved] = React.useState(false)
  const [submitWindow, setSubmitWindow] = React.useState<SubmitWindow>({
    state: "open",
    begin: "",
    end: "",
  })

  const widgets = React.useMemo(() => ({ customUpload: createSchemaUploader(id) }), [id])

  // 加载超过 10 秒给出「网络较慢」提示，只对当前这次请求生效
  React.useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => setSlowKey(requestKey), SLOW_LOADING_MS)
    return () => window.clearTimeout(timer)
  }, [loading, requestKey])

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
          setSubmitWindow({
            state: isFuture(detailData.submitBegin)
              ? "upcoming"
              : isPast(detailData.submitEnd)
                ? "closed"
                : "open",
            begin: detailData.submitBegin ?? "",
            end: detailData.submitEnd ?? "",
          })
        }

        const schemaRes = await getWorkSchema(id)
        if (cancelled) return
        const schemaData = schemaRes.data.data
        if (!schemaData || JSON.stringify(schemaData) === "{}") {
          setLoadError("no-schema")
          return
        }
        setSchema(schemaData as SchemaNode)

        const infoRes = await getWorkInfo(id)
        if (cancelled) return
        const workData = infoRes.data.data
        if (Array.isArray(workData)) {
          for (const item of workData as { input: string; content: string; isFile: boolean }[]) {
            form.setValueByPath(item.input, item.content)
          }
          setHasSaved(workData.length > 0)
        } else if (workData && infoRes.data.errMsg !== "您还未上传作品") {
          toast.error("😩 已提交的内容加载失败", { description: infoRes.data.errMsg ?? "" })
        }
        setLoadError(null)
      } catch {
        if (!cancelled) setLoadError("network")
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

  const showSubmitError = (message: string) => {
    setSubmitError(message)
    window.requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    )
  }

  const submitData = async (formData: Record<string, unknown>, errors: { name: string }[]) => {
    if (errors.length > 0) {
      toast.error("🤔 还有必填项没填或文件没上传", {
        description: "已定位到第一个需要修改的地方",
      })
      return
    }

    const submitReadyData = Object.entries(formData).map(([key, value]) => ({
      input: key,
      content: String(value ?? "").split("?")[0],
    }))

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await uploadWorkSchema(id, submitReadyData)
      if (res.data.errCode === null) {
        setSubmitted(true)
        window.scrollTo({ top: 0 })
      } else {
        showSubmitError(
          `${res.data.errMsg || "项目材料没有提交成功"}（错误代码 ${res.data.errCode}）`
        )
      }
    } catch (error) {
      notifyRequestError(error, "😩 提交失败，请稍后重试")
      showSubmitError("网络异常，项目材料没有提交成功。已填写的内容仍然保留，可以直接重新提交。")
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
          title="项目材料提交成功"
          subTitle={
            submitWindow.end
              ? `在 ${submitWindow.end} 之前仍可回来修改。祝你比赛顺利！`
              : "截止前仍可回来修改。祝你比赛顺利！"
          }
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

  if (!loading && loadError === "no-schema") {
    return (
      <PageContainer size="narrow">
        <EmptyState
          icon={FileQuestionIcon}
          title="该比赛还没有项目提交表单"
          description="举办方尚未配置需要提交的材料，请稍后再来或联系比赛负责人。"
          className="min-h-[50vh]"
          action={
            <Button
              variant="outline"
              onClick={() => router.push(withQuery("/activity/detail", { id }))}
            >
              返回比赛详情
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (!loading && loadError === "network") {
    return (
      <PageContainer size="narrow">
        <ErrorState
          className="min-h-[50vh]"
          description="项目表单没有加载出来，请检查网络后重试。"
          onRetry={reload}
        />
      </PageContainer>
    )
  }

  const ready = !loading && Boolean(schema)
  const windowClosed = submitWindow.state !== "open"

  const submitButton = (
    <Button size="lg" onClick={form.submit} disabled={submitting || !ready || windowClosed}>
      {submitting ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
      {hasSaved ? "保存修改" : "提交项目材料"}
    </Button>
  )

  return (
    <PageContainer size="narrow">
      <PageHeader
        eyebrow={competitionName || undefined}
        title="项目提交"
        description={
          submitWindow.state === "closed"
            ? "项目提交已截止，以下为已提交的项目材料。"
            : submitWindow.state === "open" && submitWindow.end
              ? `按照比赛要求填写并上传项目材料，${submitWindow.end} 前可反复修改。`
              : "按照比赛要求填写并上传项目材料，提交后可在截止时间前反复修改。"
        }
      />

      {ready && windowClosed ? (
        <Alert className="motion-safe:animate-fade-enter mt-6">
          <CalendarClockIcon />
          <AlertTitle>
            {submitWindow.state === "upcoming" ? "还没到提交时间" : "项目提交已截止"}
          </AlertTitle>
          <AlertDescription>
            {submitWindow.state === "upcoming"
              ? `项目提交将于 ${submitWindow.begin} 开始，届时再来上传材料。`
              : `项目提交已于 ${submitWindow.end} 截止，材料不能再修改。`}
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-muted-foreground mt-5 flex items-start gap-2 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            带 <span className="text-destructive">*</span>{" "}
            的为必填项。文件选择后会立即上传，上传完成再提交表单。
          </span>
        </p>
      )}

      <div className="mt-8">
        {!ready ? (
          <LoadingState
            label={
              slowKey === requestKey
                ? "网络有点慢，还在努力加载，请耐心等待……"
                : "正在加载项目表单……"
            }
          />
        ) : (
          <>
            <SchemaForm
              form={form}
              schema={schema!}
              widgets={widgets}
              onFinish={submitData}
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

      {ready ? <MobileActionBar>{submitButton}</MobileActionBar> : null}
    </PageContainer>
  )
}

export default function WorkDetailPage() {
  return (
    <React.Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <WorkDetailContent />
    </React.Suspense>
  )
}
