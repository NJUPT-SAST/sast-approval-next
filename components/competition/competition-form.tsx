"use client"

import * as React from "react"
import { MinusIcon, PlusIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Section, SectionList } from "@/components/common/section"
import { CoverUploader } from "@/components/competition/cover-uploader"
import { ReviewerSet } from "@/components/competition/reviewer-set"
import { TimeRangeField } from "@/components/competition/time-range-field"
import { option } from "@/lib/constants/form-templates"
import { useDepartments } from "@/lib/hooks/use-departments"
import { cn } from "@/lib/utils"
import type { CompetitionInfoType } from "@/lib/types/api"

/** 团队比赛人数上限可选值（最多 15 人） */
const TEAM_MEMBER_NUM_ARRAY = Array.from({ length: 14 }, (_, index) => String(index + 2))

export type ReviewSetting = { key: number; value: string }

type CompetitionFormProps = {
  info: CompetitionInfoType
  onInfoChange: (patch: Partial<CompetitionInfoType>) => void
  coverPreview: string
  onCoverChange: (file: File, dataUrl: string) => void
  templateValue: string
  onTemplateChange: (value: string) => void
  /** 是否提供「不修改」选项（编辑已有比赛时） */
  allowKeepTemplate: boolean
  reviewSettings: ReviewSetting[]
  reviewerNum: number
  onAddReviewer: () => void
  onRemoveReviewer: () => void
  setReviewerKey: (index: number, key: number) => void
  setReviewerValue: (index: number, value: string) => void
  setStartTime: (time: string, operation: string) => void
  setEndTime: (time: string, operation: string) => void
  disabled?: boolean
}

function RequiredMark() {
  return <span className="text-destructive me-0.5">*</span>
}

/**
 * 创建 / 编辑比赛共用的表单主体。
 * 字段与旧版 create、edit 页面逐项对应；大屏下采用「左标题、右表单」的分栏布局。
 */
export function CompetitionForm({
  info,
  onInfoChange,
  coverPreview,
  onCoverChange,
  templateValue,
  onTemplateChange,
  allowKeepTemplate,
  reviewSettings,
  reviewerNum,
  onAddReviewer,
  onRemoveReviewer,
  setReviewerKey,
  setReviewerValue,
  setStartTime,
  setEndTime,
  disabled,
}: CompetitionFormProps) {
  const introduceLength = info.introduce?.length ?? 0
  const introduceShort = introduceLength > 0 && introduceLength < 100
  // 在此统一拉取，ReviewerSet 会渲染多份，hook 内的模块级缓存保证只发一次请求
  const { departments, loading: departmentsLoading } = useDepartments()

  return (
    <SectionList>
      <Section
        layout="split"
        title="基本信息"
        description="比赛封面、名称、类型与简介，展示在比赛入口中。"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>比赛封面</Label>
            <CoverUploader preview={coverPreview} onChange={onCoverChange} disabled={disabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competition-name">
              <RequiredMark />
              比赛名称
            </Label>
            <div className="relative">
              <Input
                id="competition-name"
                maxLength={15}
                placeholder="清晰简洁，不多于 15 字"
                value={info.name}
                disabled={disabled}
                className="pe-14"
                onChange={(event) => onInfoChange({ name: event.target.value })}
              />
              <span className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs tabular-nums">
                {info.name?.length ?? 0}/15
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>比赛类型</Label>
            <RadioGroup
              value={String(info.type)}
              disabled={disabled}
              className="grid grid-cols-2 gap-3"
              onValueChange={(value) =>
                onInfoChange({
                  type: Number(value),
                  max_team_members: Number(value) === 0 ? 1 : 2,
                })
              }
            >
              {[
                { value: "0", label: "单人赛", hint: "每位选手独立报名" },
                { value: "1", label: "团队赛", hint: "以队伍为单位报名" },
              ].map((item) => (
                <Label
                  key={item.value}
                  htmlFor={`competition-type-${item.value}`}
                  className={cn(
                    "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <RadioGroupItem
                    value={item.value}
                    id={`competition-type-${item.value}`}
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="text-muted-foreground block text-xs">{item.hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>

            {info.type === 1 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <UsersIcon className="text-muted-foreground size-4" />
                <span className="text-sm">每队人数上限</span>
                <Select
                  value={String(info.max_team_members > 1 ? info.max_team_members : 15)}
                  disabled={disabled}
                  onValueChange={(value) => onInfoChange({ max_team_members: Number(value) })}
                >
                  <SelectTrigger size="sm" className="w-28">
                    <SelectValue placeholder="最大人数" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_MEMBER_NUM_ARRAY.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value} 人
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="competition-introduce">
              <RequiredMark />
              比赛简介
            </Label>
            <Textarea
              id="competition-introduce"
              rows={8}
              maxLength={3000}
              placeholder="介绍比赛背景、参赛要求与奖项设置，建议不少于 100 字"
              value={info.introduce}
              disabled={disabled}
              onChange={(event) => onInfoChange({ introduce: event.target.value })}
            />
            <p
              className={cn(
                "flex justify-between text-xs tabular-nums",
                introduceShort ? "text-warning" : "text-muted-foreground"
              )}
            >
              <span>{introduceShort ? "建议不少于 100 字" : "不超过 3000 字"}</span>
              <span>{introduceLength} / 3000</span>
            </p>
          </div>
        </div>
      </Section>

      <Section
        layout="split"
        title="项目提交表单"
        description="决定选手在「项目提交」页面需要填写的字段与上传的材料。"
      >
        <div className="space-y-2">
          <Label htmlFor="competition-template">表单模板</Label>
          <Select value={templateValue} onValueChange={onTemplateChange} disabled={disabled}>
            <SelectTrigger id="competition-template" className="w-full">
              <SelectValue placeholder="请选择表单" />
            </SelectTrigger>
            <SelectContent>
              {option.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
              {allowKeepTemplate ? <SelectItem value="-1">保持现有表单不变</SelectItem> : null}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section layout="split" title="时间安排" description="报名、材料提交与评审各阶段的起止时间。">
        <div className="space-y-6">
          <TimeRangeField
            operation="signUp"
            preStartTime={info.reg_begin_time}
            preEndTime={info.reg_end_time}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            disabled={disabled}
          />
          <TimeRangeField
            operation="submit"
            preStartTime={info.submit_begin_time}
            preEndTime={info.submit_end_time}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            disabled={disabled}
          />
          <TimeRangeField
            operation="review"
            preStartTime={info.review_begin_time}
            preEndTime={info.review_end_time}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            disabled={disabled}
          />
        </div>
      </Section>

      <Section
        layout="split"
        title="审核设置"
        description="设置报名材料的审核者。默认审核者负责兜底，其余审核者可按学院分工。"
      >
        <div className="space-y-5">
          {info.is_review === 1 ? (
            <div className="space-y-2">
              <Label htmlFor="default-reviewer">默认审核者</Label>
              <Input
                id="default-reviewer"
                placeholder="审核者学号"
                value={reviewSettings[0]?.value ?? ""}
                disabled={disabled}
                onChange={(event) => setReviewerValue(0, event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                未匹配到学院审核者的报名将由默认审核者处理。
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
              当前比赛不需要审核。点击下方「添加审核者」可开启审核。
            </p>
          )}

          {info.is_review === 1 && reviewSettings.length > 1 ? (
            <div className="space-y-3">
              <Label>按学院分配的审核者</Label>
              <div className="space-y-3">
                {reviewSettings.map((value, index) =>
                  value.key === 0 ? null : (
                    <ReviewerSet
                      key={`${value.key}-${index}`}
                      value={value}
                      index={index}
                      setKey={setReviewerKey}
                      setValue={setReviewerValue}
                      disabled={disabled}
                      departments={departments}
                      departmentsLoading={departmentsLoading}
                    />
                  )
                )}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onAddReviewer}
            >
              <PlusIcon className="size-4" />
              添加审核者
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || (reviewerNum <= 1 && info.is_review === 0)}
              onClick={onRemoveReviewer}
            >
              <MinusIcon className="size-4" />
              {reviewerNum <= 1 ? "关闭审核" : "移除最后一位"}
            </Button>
          </div>
        </div>
      </Section>
    </SectionList>
  )
}
