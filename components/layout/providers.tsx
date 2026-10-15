"use client"

import * as React from "react"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { APP_STORAGE_KEYS } from "@/lib/storage"
import { useUserStore } from "@/lib/store/user"
import { printConsoleBanner } from "@/lib/console-banner"
import { initMonitoring } from "@/lib/monitoring"

/** 应用启动时把 localStorage 中的登录态注入 zustand */
function StoreHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useUserStore((state) => state.hydrate)

  React.useEffect(() => {
    hydrate()
    printConsoleBanner()
    initMonitoring()
  }, [hydrate])

  /**
   * 跨标签页同步：别的标签页退出登录 / 登录失效时会清掉 Token，
   * 本标签页若不重新水合，会一直以「看起来已登录」的状态发不带 Token 的请求，
   * 每个接口都回 1005（TOKEN不能为空）。`clear()` 触发的 storage 事件 key 为 null。
   */
  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || APP_STORAGE_KEYS.includes(event.key)) hydrate()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [hydrate])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <StoreHydrator>{children}</StoreHydrator>
        <Toaster position="top-center" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}
