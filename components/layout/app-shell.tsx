"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { LoginView } from "@/components/auth/login-view"
import { NotFoundView } from "@/components/common/states"
import { canAccess, isTopLevelPath } from "@/lib/navigation"
import { useLogout } from "@/lib/hooks/use-logout"
import { useUserStore } from "@/lib/store/user"
import { useUiStore } from "@/lib/store/ui"
import { cn } from "@/lib/utils"

/** 水合完成前的骨架，避免 localStorage 读取造成的闪烁 */
function BootSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 shrink-0 border-r p-4 md:block">
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hydrated = useUserStore((state) => state.hydrated)
  const role = useUserStore((state) => state.role)
  const setPageLabel = useUiStore((state) => state.setPageLabel)
  const handleLogout = useLogout()

  // 路由变化时重置面包屑动态标题
  React.useEffect(() => {
    setPageLabel(null)
  }, [pathname, setPageLabel])

  if (!hydrated) return <BootSkeleton />
  if (role === "offline") return <LoginView />

  const allowed = canAccess(role, pathname)
  const hasTabBar = isTopLevelPath(role, pathname)

  return (
    <SidebarProvider>
      <AppSidebar onLogout={handleLogout} />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div
          className={cn(
            "flex min-h-[calc(100svh-3.5rem)] flex-col",
            hasTabBar && "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
          )}
        >
          {/* 以路径为 key，切换页面时淡入一次；系统开启「减少动态效果」时不播放 */}
          <div key={pathname} className="motion-safe:animate-fade-enter flex-1">
            {allowed ? children : <NotFoundView />}
          </div>
          <SiteFooter />
        </div>
        <MobileTabBar />
      </SidebarInset>
    </SidebarProvider>
  )
}
