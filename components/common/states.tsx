"use client"

import * as React from "react"
import Link from "next/link"
import {
  CircleAlertIcon,
  CircleCheckBigIcon,
  FileQuestionIcon,
  InboxIcon,
  Loader2Icon,
  RotateCwIcon,
  WifiOffIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export function LoadingState({
  label = "数据加载中……",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex min-h-60 flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Loader2Icon className="text-primary size-8 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Empty className={cn("min-h-60", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="size-6" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

/**
 * 加载失败的占位，带「重新加载」按钮。
 * 请求失败时不要落到 EmptyState，否则用户会误以为「真的没有数据」。
 */
export function ErrorState({
  title = "加载失败",
  description = "数据没有加载出来，可能是网络不稳定，请稍后重试。",
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={WifiOffIcon}
      title={title}
      description={description}
      className={className}
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RotateCwIcon className="size-4" />
            重新加载
          </Button>
        ) : null
      }
    />
  )
}

type ResultStatus = "success" | "error" | "404"

const RESULT_META: Record<
  ResultStatus,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  success: { icon: CircleCheckBigIcon, tone: "text-emerald-500 bg-emerald-500/10" },
  error: { icon: CircleAlertIcon, tone: "text-destructive bg-destructive/10" },
  "404": { icon: FileQuestionIcon, tone: "text-primary bg-primary/10" },
}

export function ResultState({
  status,
  title,
  subTitle,
  extra,
  className,
}: {
  status: ResultStatus
  title: React.ReactNode
  subTitle?: React.ReactNode
  extra?: React.ReactNode
  className?: string
}) {
  const meta = RESULT_META[status]
  const Icon = meta.icon
  return (
    <div
      className={cn(
        "flex min-h-70 flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className
      )}
    >
      <span
        className={cn(
          "motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in-0 flex size-16 items-center justify-center rounded-full duration-300 ease-out",
          meta.tone
        )}
      >
        <Icon className="size-8" />
      </span>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subTitle ? (
          <p className="text-muted-foreground text-balance-pretty mx-auto max-w-md text-sm">
            {subTitle}
          </p>
        ) : null}
      </div>
      {extra ? <div className="flex flex-wrap justify-center gap-3 pt-1">{extra}</div> : null}
    </div>
  )
}

/** 404 页面，等价于旧版 NoMatch */
export function NotFoundView() {
  return (
    <ResultState
      status="404"
      title="404"
      subTitle="抱歉，你访问的页面不存在或当前角色无权访问。"
      extra={
        <Button asChild>
          <Link href="/account">返回主页</Link>
        </Button>
      }
    />
  )
}
