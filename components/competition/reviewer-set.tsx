"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Department } from "@/lib/types/api"

type ReviewerSetProps = {
  value: { key: number; value: string }
  index: number
  setKey: (index: number, key: number) => void
  setValue: (index: number, value: string) => void
  disabled?: boolean
  /** 学院列表，来自 GET /com/department/list */
  departments: Department[]
  departmentsLoading?: boolean
}

/** 单条「审核者学号 + 负责学院」配置，等价于旧版 ReviewSet */
export function ReviewerSet({
  value,
  index,
  setKey,
  setValue,
  disabled,
  departments,
  departmentsLoading,
}: ReviewerSetProps) {
  // 已保存的学院代号在后端列表里找不到（学院被删除或合并），需要显式暴露，
  // 否则下拉只会渲染成空白，管理员无从得知这条审核关系已经失效。
  const isOrphanKey = value.key > 0 && !departments.some((item) => item.id === value.key)
  const selectDisabled = disabled || departmentsLoading || departments.length === 0

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`reviewer-code-${index}`} className="text-muted-foreground text-xs">
          审核者学号
        </Label>
        <Input
          id={`reviewer-code-${index}`}
          placeholder="审核者学号"
          value={value.value}
          disabled={disabled}
          onChange={(event) => setValue(index, event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`reviewer-college-${index}`} className="text-muted-foreground text-xs">
          负责学院
        </Label>
        <Select
          value={value.key === -1 ? undefined : String(value.key)}
          onValueChange={(next) => setKey(index, Number(next))}
          disabled={selectDisabled}
        >
          <SelectTrigger id={`reviewer-college-${index}`} className="w-full">
            <SelectValue placeholder={departmentsLoading ? "学院加载中……" : "选择学院"} />
          </SelectTrigger>
          <SelectContent>
            {isOrphanKey ? (
              <SelectItem value={String(value.key)} disabled>
                未知学院（代号 {value.key}）
              </SelectItem>
            ) : null}
            {departments.map((department) => (
              <SelectItem key={department.id} value={String(department.id)}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOrphanKey ? (
          <p className="text-destructive text-xs">该学院已不存在，请重新选择。</p>
        ) : null}
      </div>
    </div>
  )
}
