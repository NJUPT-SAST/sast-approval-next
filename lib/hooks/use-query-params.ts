"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

type QueryPatch = Record<string, string | number | null | undefined>

/** 把查询参数读成正整数，缺省或非法时返回 fallback */
export function readPositiveInt(params: URLSearchParams, key: string, fallback: number) {
  const value = Number(params.get(key))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/**
 * 把列表页的分页、搜索词等状态放进地址栏。
 * 进入详情再返回时能回到原来的页码，刷新页面也不会丢。
 *
 * 写入用原生 history.replaceState（Next 会同步到 useSearchParams），不额外产生历史记录，
 * 也不触发路由跳转。不用 router.replace：静态导出下，带查询参数直接打开一个侧边栏页面
 * （如 /activity?page=2）后，router.replace 到同一路径会命中该页面的预取缓存，
 * 地址被还原成打开时的查询参数，翻页、搜索都失效（Next 16）。
 *
 * 使用的页面必须包在 <Suspense> 里。
 */
export function useQueryParams() {
  const pathname = usePathname()
  const params = useSearchParams()

  const setParams = React.useCallback(
    (patch: QueryPatch) => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key)
        else next.set(key, String(value))
      }
      const query = next.toString()
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname)
    },
    [pathname]
  )

  return { params, setParams }
}
