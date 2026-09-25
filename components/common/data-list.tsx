"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 表格外层容器：一层细边框 + 圆角，窄屏横向滚动。
 * 一般配合 `hidden md:block` 使用，手机上换成 MobileList。
 */
export function TableSurface({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-card overflow-hidden rounded-xl border", className)}>
      <div className="table-scroll [&_[data-slot=table-head]]:text-muted-foreground [&_[data-slot=table-head]]:bg-muted/40 [&_[data-slot=table-head]]:h-11 [&_[data-slot=table-head]]:px-4 [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-head]]:font-medium [&_[data-slot=table-cell]]:px-4 [&_[data-slot=table-cell]]:py-3">
        {children}
      </div>
    </div>
  )
}

/** 手机端的列表容器，替代表格 */
export function MobileList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ul className={cn("bg-card divide-y overflow-hidden rounded-xl border", className)}>
      {children}
    </ul>
  )
}

type MobileListItemProps = {
  /** 左侧序号 / 图标 */
  leading?: React.ReactNode
  title: React.ReactNode
  /** 标题下方的辅助信息 */
  meta?: React.ReactNode
  /** 右侧内容，例如 Badge */
  trailing?: React.ReactNode
  /** 底部一行操作按钮 */
  actions?: React.ReactNode
  /**
   * 行尾的独立操作（如「更多」菜单），渲染在整行链接之外，
   * 避免按钮嵌套在 <a> 里，点击菜单也不会触发整行跳转
   */
  menu?: React.ReactNode
  /** 整行可点击跳转 */
  href?: string
  onClick?: () => void
  className?: string
}

export function MobileListItem({
  leading,
  title,
  meta,
  trailing,
  actions,
  menu,
  href,
  onClick,
  className,
}: MobileListItemProps) {
  const interactive = Boolean(href || onClick)
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-foreground text-sm leading-snug font-medium break-words">{title}</div>
        {meta ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {meta}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
      {interactive && !actions && !menu ? (
        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
      ) : null}
    </>
  )

  const rowClass = cn(
    "flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-start",
    interactive && "active:bg-muted/60 transition-colors",
    menu ? "pe-2" : null
  )

  const row = href ? (
    <Link href={href} className={rowClass}>
      {body}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className={cn(rowClass, "w-full")}>
      {body}
    </button>
  ) : (
    <div className={rowClass}>{body}</div>
  )

  return (
    <li className={className}>
      {menu ? (
        <div className="flex items-center">
          {row}
          <div className="shrink-0 pe-3">{menu}</div>
        </div>
      ) : (
        row
      )}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 [&>*]:flex-1">{actions}</div>
      ) : null}
    </li>
  )
}

/** 列表里的序号圆标 */
export function IndexBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg font-mono text-xs tabular-nums">
      {children}
    </span>
  )
}
