"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  /** 页面级操作区；表单提交操作应放在表单底部，并使用 `MobileActionBar` 适配手机端 */
  actions?: React.ReactNode
  /** 标题上方的小字眉题，例如所属比赛名 */
  eyebrow?: React.ReactNode
  className?: string
}

/** 页面标题区，替代旧版 TopBar 的标题部分 */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-primary truncate text-xs font-medium tracking-wide">{eyebrow}</p>
        ) : null}
        <h1 className="text-balance-pretty text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-balance-pretty text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/**
 * 手机端固定在底部的操作栏；放在页面内容末尾使用，桌面端自动隐藏。
 * 内部按钮会等分宽度，方便拇指操作。
 */
export function MobileActionBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <>
      <div className="h-20 sm:hidden" aria-hidden />
      <div
        className={cn(
          "bg-background/92 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden",
          className
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 [&>*]:h-11 [&>*]:min-w-0 [&>*]:flex-1">
          {children}
        </div>
      </div>
    </>
  )
}

/** 页面统一容器：控制最大宽度与内边距，保证各断点下的可读性 */
export function PageContainer({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode
  className?: string
  size?: "default" | "wide" | "narrow"
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8",
        size === "default" && "max-w-6xl",
        size === "wide" && "max-w-[1440px]",
        size === "narrow" && "max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  )
}
