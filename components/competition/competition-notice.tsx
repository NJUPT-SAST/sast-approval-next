"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDownIcon, PencilIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { withQuery } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const ROLE_LABEL: Record<number, string> = {
  [-1]: "公开",
  0: "选手",
  1: "评委",
  2: "审核人",
}

type NoticeProps = {
  /** 当前查看者角色编号：0 学生 1 评委 2 审批人 3 管理员 */
  viewer: number
  comId: number
  comName: string
  noticeId: number
  title: string
  content: string
  time: string
  role: number | undefined
  /** 默认展开（例如列表里的第一条） */
  defaultOpen?: boolean
}

/** 单条公告，折叠式列表项；多条放在 divide-y 容器里 */
export function CompetitionNotice({
  viewer,
  comId,
  noticeId,
  title,
  content,
  time,
  role,
  defaultOpen = false,
}: NoticeProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group">
      <CollapsibleTrigger className="hover:bg-muted/40 -mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-lg px-3 py-3.5 text-left transition-colors">
        <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground text-sm leading-snug font-semibold">{title}</p>
            {role !== undefined && ROLE_LABEL[role] ? (
              <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px]">
                {ROLE_LABEL[role]}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">校大学生科协 · {time}</p>
          {!open ? <p className="text-muted-foreground line-clamp-1 text-sm">{content}</p> : null}
        </div>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="motion-safe:data-[state=closed]:animate-collapsible-up motion-safe:data-[state=open]:animate-collapsible-down overflow-hidden">
        <div className="space-y-4 pt-1 pb-4 ps-4.5">
          <p className="text-foreground text-balance-pretty text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
          {viewer === 3 ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={withQuery("/activity/notice", { id: comId, noticeId })}>
                <PencilIcon className="size-3.5" />
                编辑公告
              </Link>
            </Button>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
