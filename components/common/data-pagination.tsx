"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DataPaginationProps = {
  current: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
  pageSizeOptions?: number[]
  showSizeChanger?: boolean
  /** 翻页后是否滚回页面顶部，默认开启 */
  scrollOnChange?: boolean
  className?: string
}

/** 计算需要展示的页码，超长时用省略号收拢 */
function buildPages(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const pages: (number | "…")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  if (start > 2) pages.push("…")
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push("…")
  pages.push(totalPages)
  return pages
}

export function DataPagination({
  current,
  pageSize,
  total,
  onChange,
  pageSizeOptions,
  showSizeChanger = false,
  scrollOnChange = true,
  className,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  if (total <= 0) return null

  const change = (page: number, size: number) => {
    onChange(page, size)
    if (scrollOnChange) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4",
        className
      )}
    >
      <p className="text-muted-foreground order-2 text-xs sm:order-1">
        共 <span className="text-foreground font-medium tabular-nums">{total}</span> 条
        <span className="hidden sm:inline">
          {" "}
          · 第 <span className="text-foreground font-medium tabular-nums">{current}</span> /{" "}
          {totalPages} 页
        </span>
      </p>

      <div className="order-1 flex items-center gap-1.5 sm:order-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="上一页"
          disabled={current <= 1}
          onClick={() => change(current - 1, pageSize)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        {/* 手机上只保留前后翻页，页码按钮太多会撑出屏幕 */}
        <span className="text-muted-foreground min-w-16 text-center text-sm tabular-nums sm:hidden">
          <span className="text-foreground font-medium">{current}</span> / {totalPages}
        </span>
        {buildPages(current, totalPages).map((page, index) =>
          page === "…" ? (
            <span
              key={`ellipsis-${index}`}
              className="text-muted-foreground hidden w-8 text-center text-sm sm:inline"
            >
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === current ? "default" : "outline"}
              size="icon-sm"
              aria-label={`第 ${page} 页`}
              aria-current={page === current ? "page" : undefined}
              className="hidden tabular-nums sm:inline-flex"
              onClick={() => page !== current && change(page, pageSize)}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="下一页"
          disabled={current >= totalPages}
          onClick={() => change(current + 1, pageSize)}
        >
          <ChevronRightIcon className="size-4" />
        </Button>

        {showSizeChanger && pageSizeOptions ? (
          <Select value={String(pageSize)} onValueChange={(value) => change(1, Number(value))}>
            <SelectTrigger size="sm" className="ms-1 w-26">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} 条/页
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  )
}
