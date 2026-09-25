"use client"

import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/common/date-time-picker"

const NAME: Record<string, string> = { signUp: "报名", submit: "材料提交", review: "评审" }

type TimeRangeFieldProps = {
  /** signUp | submit | review */
  operation: string
  preStartTime: string
  preEndTime: string
  setStartTime: (time: string, operation: string) => void
  setEndTime: (time: string, operation: string) => void
  disabled?: boolean
  /** 校验未通过的控件 id，命中本组的开始 / 截止时标红 */
  invalidField?: string | null
}

/** 起止时间选择，等价于旧版 TimeRanger */
export function TimeRangeField({
  operation,
  preStartTime,
  preEndTime,
  setStartTime,
  setEndTime,
  disabled,
  invalidField,
}: TimeRangeFieldProps) {
  const label = NAME[operation] ?? operation
  return (
    <div className="space-y-2">
      <Label>{label}阶段</Label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <DateTimePicker
          id={`${operation}-start`}
          value={preStartTime}
          placeholder="开始时间"
          defaultTime="00:00:00"
          invalid={invalidField === `${operation}-start`}
          onChange={(time) => setStartTime(time, operation)}
          disabled={disabled}
        />
        <span className="text-muted-foreground hidden text-center text-sm sm:block">至</span>
        <DateTimePicker
          id={`${operation}-end`}
          value={preEndTime}
          placeholder="截止时间"
          defaultTime="23:59:59"
          invalid={invalidField === `${operation}-end`}
          onChange={(time) => setEndTime(time, operation)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
