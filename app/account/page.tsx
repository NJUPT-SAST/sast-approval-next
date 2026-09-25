"use client"

import * as React from "react"
import {
  BuildingIcon,
  GraduationCapIcon,
  IdCardIcon,
  LogOutIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/common/page-header"
import { MobileList, MobileListItem } from "@/components/common/data-list"
import { Section, SectionList } from "@/components/common/section"
import { NAV_ICONS } from "@/components/layout/nav-icons"
import { getUserProfile } from "@/lib/api/user"
import { useLogout } from "@/lib/hooks/use-logout"
import { NAV_BY_ROLE, navItemHint } from "@/lib/navigation"
import { ROLE_LABEL, useUserStore, type UserRole } from "@/lib/store/user"

type InfoItem = {
  key: string
  title: string
  content: string
  icon: React.ComponentType<{ className?: string }>
  mono?: boolean
}

function InfoGrid({ items, loading }: { items: InfoItem[]; loading: boolean }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.key} className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="text-muted-foreground text-xs">{item.title}</dt>
              {loading && !item.content ? (
                <Skeleton className="mt-1.5 h-4 w-32" />
              ) : (
                <dd
                  className={
                    "text-foreground mt-0.5 text-sm font-medium break-words " +
                    (item.mono ? "font-mono" : "")
                  }
                >
                  {item.content || "—"}
                </dd>
              )}
            </div>
          </div>
        )
      })}
    </dl>
  )
}

/** 按当前时段返回问候语 */
function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return "夜深了"
  if (hour < 12) return "早上好"
  if (hour < 14) return "中午好"
  if (hour < 18) return "下午好"
  return "晚上好"
}

export default function AccountPage() {
  const profile = useUserStore((state) => state.profile)
  const setProfile = useUserStore((state) => state.setProfile)
  const role = useUserStore((state) => state.role)
  const inboxPoint = useUserStore((state) => state.inboxPoint)
  const logout = useLogout()
  const [loading, setLoading] = React.useState(true)
  const shortcuts =
    role === "offline"
      ? []
      : NAV_BY_ROLE[role as Exclude<UserRole, "offline">].filter((item) => item.href !== "/account")

  // 静默刷新一次用户信息，保证展示的是最新数据
  React.useEffect(() => {
    let cancelled = false
    getUserProfile()
      .then((res) => {
        if (cancelled || !res.data.success) return
        const data = res.data.data
        setProfile({
          code: data.code ?? "",
          name: data.name ?? "",
          college: data.college ?? "",
          major: data.major ?? "未知",
          contact: data.contact ?? "未知",
        })
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setProfile])

  const personalInfo: InfoItem[] = [
    { key: "name", title: "姓名", content: profile.name, icon: UserRoundIcon },
    { key: "college", title: "学院", content: profile.college, icon: BuildingIcon },
    { key: "major", title: "专业", content: profile.major, icon: GraduationCapIcon },
    { key: "contact", title: "联系方式", content: profile.contact, icon: PhoneIcon, mono: true },
  ]

  const accountInfo: InfoItem[] = [
    { key: "account", title: "账号（学号）", content: profile.code, icon: IdCardIcon, mono: true },
    { key: "role", title: "账号角色", content: ROLE_LABEL[role], icon: ShieldCheckIcon },
  ]

  return (
    <PageContainer size="narrow">
      {/* 个人抬头：柔和的品牌色光晕 + 问候语 */}
      <section className="relative -mx-4 overflow-hidden px-4 pt-2 pb-8 sm:mx-0 sm:rounded-3xl sm:px-8 sm:pt-8 sm:pb-10">
        <div className="account-hero pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <p className="text-muted-foreground text-sm">{greeting()}，欢迎回来</p>
        <div className="mt-4 flex items-center gap-4 sm:gap-6">
          <Avatar className="ring-background size-16 rounded-2xl shadow-lg ring-4 sm:size-24">
            <AvatarImage src="/assets/avatar-logo.png" alt={profile.name} />
            <AvatarFallback className="rounded-2xl text-2xl">
              {profile.name?.slice(0, 1) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            {loading && !profile.name ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-4xl">
                {profile.name || "未命名用户"}
              </h1>
            )}
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-mono">{profile.code || "—"}</span>
              {profile.college ? (
                <>
                  <span className="bg-border hidden h-3 w-px sm:block" />
                  <span className="truncate">{profile.college}</span>
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge>{ROLE_LABEL[role]}</Badge>
              <Badge variant="outline" className="bg-background/60">
                南京邮电大学
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <SectionList className="mt-6 sm:mt-10">
        {shortcuts.length > 0 ? (
          <Section title="常用入口" description="从这里直接开始今天的工作。" layout="split">
            <MobileList>
              {shortcuts.map((item) => {
                const Icon = NAV_ICONS[item.icon] ?? UserRoundIcon
                const unread = item.badge === "inbox" && inboxPoint === "on"
                return (
                  <MobileListItem
                    key={item.href}
                    href={item.href}
                    leading={
                      <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                        <Icon className="size-4" />
                      </span>
                    }
                    title={item.label}
                    meta={navItemHint(role, item.href)}
                    trailing={
                      unread ? (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
                          未读
                        </Badge>
                      ) : null
                    }
                    className="hover:bg-muted/40 transition-colors"
                  />
                )
              })}
            </MobileList>
          </Section>
        ) : null}

        <Section
          title="个人信息"
          description="信息来源于统一身份认证，如有误请联系管理员。"
          layout="split"
        >
          <InfoGrid items={personalInfo} loading={loading} />
        </Section>

        <Section title="账号信息" description="账号与权限相关信息。" layout="split">
          <InfoGrid items={accountInfo} loading={loading} />
        </Section>

        <Section title="会话" description="退出后需要重新输入学号与密码登录。" layout="split">
          <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
            <LogOutIcon className="size-4" />
            退出登录
          </Button>
        </Section>
      </SectionList>
    </PageContainer>
  )
}
