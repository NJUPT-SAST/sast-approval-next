"use client"

import * as React from "react"
import {
  CheckCheckIcon,
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  MailIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageContainer, PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/states"
import { INBOX_MESSAGES } from "@/lib/constants/inbox-messages"
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/storage"
import { useUserStore } from "@/lib/store/user"
import { cn } from "@/lib/utils"

type MessageState = { read: boolean; fold: boolean }

const MAX_NUMBER = INBOX_MESSAGES.length

/** 读取持久化的每条消息状态，长度不足时补齐 */
function readChildState(): MessageState[] {
  const fallback = Array.from({ length: MAX_NUMBER }, () => ({ fold: true, read: false }))
  const raw = readStorage(STORAGE_KEYS.everyInboxMessageState)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as MessageState[]
    return fallback.map((item, index) => ({ ...item, ...(parsed[index] ?? {}) }))
  } catch {
    return fallback
  }
}

export default function InboxPage() {
  const setInboxPoint = useUserStore((state) => state.setInboxPoint)
  // AppShell 会在 localStorage 水合完成后才渲染页面，因此这里可以直接惰性读取
  const [states, setStates] = React.useState<MessageState[]>(readChildState)

  /** 写入每条消息状态并同步全局已读数与红点 */
  const persist = React.useCallback(
    (next: MessageState[]) => {
      writeStorage(STORAGE_KEYS.everyInboxMessageState, JSON.stringify(next))

      const haveReadNumber = next.filter((item) => item.read).length
      const allRead = haveReadNumber === MAX_NUMBER
      writeStorage(
        STORAGE_KEYS.allReadState,
        JSON.stringify({ allRead, haveReadNumber, maxNumber: MAX_NUMBER })
      )
      writeStorage(STORAGE_KEYS.allRead, String(allRead))

      const haveFoldNumber = next.filter((item) => item.fold).length
      writeStorage(
        STORAGE_KEYS.allFoldState,
        JSON.stringify({
          allFold: haveFoldNumber === MAX_NUMBER,
          haveFoldNumber,
          maxNumber: MAX_NUMBER,
        })
      )

      const point = allRead ? "off" : "on"
      writeStorage(STORAGE_KEYS.inboxPoint, point)
      setInboxPoint(point)
    },
    [setInboxPoint]
  )

  // 持久化放在 updater 外面：updater 可能在渲染阶段执行，
  // 在里面改 zustand 会触发「渲染时更新其它组件」的警告
  const update = (updater: (prev: MessageState[]) => MessageState[]) => {
    const next = updater(states)
    setStates(next)
    persist(next)
  }

  const setAll = (patch: Partial<MessageState>) =>
    update((prev) => prev.map((item) => ({ ...item, ...patch })))

  const patchOne = (index: number, patch: Partial<MessageState>) =>
    update((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const unreadCount = states.filter((item) => !item.read).length

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="收件箱"
        description={
          unreadCount > 0 ? (
            <>
              共 {MAX_NUMBER} 条消息，
              <span className="text-primary font-medium">{unreadCount}</span> 条未读
            </>
          ) : (
            `共 ${MAX_NUMBER} 条消息，已全部读完`
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll({ read: true })}
              disabled={unreadCount === 0}
            >
              <CheckCheckIcon className="size-4" />
              全部已读
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAll({ fold: false })}>
                  <ChevronsUpDownIcon className="size-4" />
                  全部展开
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAll({ fold: true })}>
                  <ChevronsDownUpIcon className="size-4" />
                  全部收起
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAll({ read: false })}>
                  <MailIcon className="size-4" />
                  全部标为未读
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="mt-6 divide-y">
        {INBOX_MESSAGES.length === 0 ? (
          <EmptyState icon={MailIcon} title="暂无站内信" description="目前没有收到任何消息。" />
        ) : (
          INBOX_MESSAGES.map((message, index) => {
            const state = states[index] ?? { read: false, fold: true }
            const open = !state.fold
            return (
              <Collapsible
                key={message.id}
                open={open}
                onOpenChange={(next) => {
                  // 展开即视为已读
                  patchOne(index, { fold: !next, ...(next ? { read: true } : {}) })
                }}
              >
                <CollapsibleTrigger className="hover:bg-muted/40 -mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-lg px-3 py-4 text-left transition-colors">
                  <span
                    className={cn(
                      "mt-2 size-2 shrink-0 rounded-full transition-colors duration-300",
                      state.read ? "bg-transparent" : "bg-primary"
                    )}
                    aria-label={state.read ? "已读" : "未读"}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        state.read ? "text-foreground/80 font-medium" : "font-semibold"
                      )}
                    >
                      {message.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {message.post} · {message.time}
                    </p>
                    {!open ? (
                      <p className="text-muted-foreground line-clamp-1 text-sm">
                        {message.content}
                      </p>
                    ) : null}
                  </div>
                  <ChevronDownIcon
                    className={cn(
                      "text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="motion-safe:data-[state=closed]:animate-collapsible-up motion-safe:data-[state=open]:animate-collapsible-down overflow-hidden">
                  <div className="space-y-4 pt-1 pb-5 ps-5">
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground -ms-2"
                      onClick={() => patchOne(index, { read: !state.read })}
                    >
                      {state.read ? "标记为未读" : "标记为已读"}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })
        )}
      </div>
    </PageContainer>
  )
}
