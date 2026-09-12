"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, CheckIcon, Loader2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader, MobileActionBar } from "@/components/common/page-header"
import { Section } from "@/components/common/section"
import { Steps } from "@/components/common/steps"
import { CompetitionForm, type ReviewSetting } from "@/components/competition/competition-form"
import { WhiteListForm } from "@/components/competition/white-list-form"
import { createCompetitionInfo, editWhiteList } from "@/lib/api/admin"
import { template } from "@/lib/constants/form-templates"
import { withQuery } from "@/lib/navigation"
import { useUserStore } from "@/lib/store/user"
import type { CompetitionInfoType } from "@/lib/types/api"

const STEPS = [
  { title: "比赛信息", description: "基本信息、时间与审核设置" },
  { title: "报名白名单", description: "可选，限制可报名的学号" },
]

export default function CreateCompetitionPage() {
  const router = useRouter()
  const profile = useUserStore((state) => state.profile)

  const [currentStep, setCurrentStep] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [cover, setCover] = React.useState<Blob>()
  const [coverPreview, setCoverPreview] = React.useState("")
  const [templateValue, setTemplateValue] = React.useState("0")
  const [reviewerNum, setReviewerNum] = React.useState(2)
  const [reviewSettings, setReviewSettings] = React.useState<ReviewSetting[]>([
    { key: 0, value: "" },
    { key: -1, value: "" },
  ])
  const [competitionId, setCompetitionId] = React.useState(-1)
  const [checked, setChecked] = React.useState(false)
  const [fileList, setFileList] = React.useState<File[]>([])

  const [competitionInfo, setCompetitionInfo] = React.useState<CompetitionInfoType>({
    name: "",
    reg_begin_time: "",
    reg_end_time: "",
    submit_begin_time: "",
    submit_end_time: "",
    review_begin_time: "",
    review_end_time: "",
    table: template[0],
    type: 0,
    min_team_members: 1,
    max_team_members: 1,
    user_code: profile.code,
    is_review: 1,
    introduce: "",
    cover: "",
  })

  const patchInfo = (patch: Partial<CompetitionInfoType>) =>
    setCompetitionInfo((prev) => ({ ...prev, ...patch }))

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

  const setReviewerKey = (index: number, key: number) =>
    setReviewSettings((prev) => prev.map((item, i) => (i === index ? { ...item, key } : item)))

  const setReviewerValue = (index: number, value: string) =>
    setReviewSettings((prev) => prev.map((item, i) => (i === index ? { ...item, value } : item)))

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
    patchInfo({ table: template[Number(value)] as unknown as object })
  }

  /** 发布活动 */
  const postCompetition = async () => {
    if (!competitionInfo.name.trim()) {
      toast.error("请填写比赛名称")
      return
    }
    if (!competitionInfo.introduce.trim()) {
      toast.error("请填写比赛简介")
      return
    }

    const reviewSettingMap = new Map<number, string>([
      [reviewSettings[0].key, reviewSettings[0].value],
    ])
    for (let i = 0; i < reviewerNum; i += 1) {
      if (reviewSettings[i]) reviewSettingMap.set(reviewSettings[i].key, reviewSettings[i].value)
    }

    setSubmitting(true)
    try {
      // 负责人学号在提交时取当前登录用户，避免依赖 effect 同步
      const res = await createCompetitionInfo(
        { ...competitionInfo, user_code: profile.code },
        Object.fromEntries(reviewSettingMap.entries()),
        cover
      )
      if (res.data.success === true) {
        setCompetitionId(res.data.data)
        toast.success("😸 发布成功", { description: "请选择是否需要白名单" })
        setCurrentStep(1)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        toast.error("😭 发布失败", { description: res.data.errMsg ?? "" })
      }
    } catch (error) {
      toast.error("😭 发布失败", { description: String(error) })
    } finally {
      setSubmitting(false)
    }
  }

  /** 设置白名单并结束创建流程 */
  const postWhiteList = async () => {
    if (checked && fileList.length === 0) {
      toast.error("😭 设置失败", { description: "请先上传文件或者选择不设置白名单！" })
      return
    }
    setSubmitting(true)
    try {
      const res = await editWhiteList(competitionId, checked, checked ? fileList[0] : undefined)
      if (res.data.success) {
        toast.success("设置成功！")
        router.push(withQuery("/activity/detail", { id: competitionId }))
      } else {
        toast.error("😭 设置失败", { description: res.data.errMsg ?? "" })
      }
    } catch {
      toast.error("😭 设置失败")
    } finally {
      setSubmitting(false)
    }
  }

  const actions =
    currentStep === 0 ? (
      <>
        <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
          <XIcon className="size-4" />
          取消
        </Button>
        <Button onClick={postCompetition} disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ArrowRightIcon className="size-4" />
          )}
          发布并继续
        </Button>
      </>
    ) : (
      <Button onClick={postWhiteList} disabled={submitting}>
        {submitting ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <CheckIcon className="size-4" />
        )}
        完成创建
      </Button>
    )

  return (
    <PageContainer>
      <PageHeader
        title="创建比赛"
        description="填写比赛基本信息与时间安排，发布后可继续设置报名白名单。"
        actions={actions}
        hideActionsOnMobile
      />

      <Steps steps={STEPS} current={currentStep} className="mt-8" />

      <div className="mt-10">
        {currentStep === 0 ? (
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
            allowKeepTemplate={false}
            reviewSettings={reviewSettings}
            reviewerNum={reviewerNum}
            onAddReviewer={handleAddReviewer}
            onRemoveReviewer={handleRemoveReviewer}
            setReviewerKey={setReviewerKey}
            setReviewerValue={setReviewerValue}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            disabled={submitting}
          />
        ) : (
          <Section
            layout="split"
            title="报名白名单"
            description="比赛已发布成功。可在此设置只允许指定学号报名，之后也能在比赛管理中修改。"
          >
            <WhiteListForm
              checked={checked}
              fileList={fileList}
              onCheckedChange={setChecked}
              onFileChange={setFileList}
              disabled={submitting}
            />
          </Section>
        )}
      </div>

      <div className="mt-10 hidden justify-end gap-2 border-t pt-6 sm:flex">{actions}</div>
      <MobileActionBar>{actions}</MobileActionBar>
    </PageContainer>
  )
}
