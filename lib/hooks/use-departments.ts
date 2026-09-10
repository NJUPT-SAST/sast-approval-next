"use client"

import * as React from "react"
import { getDepartmentList } from "@/lib/api/public"
import { notifyRequestError } from "@/lib/api/errors"
import type { Department } from "@/lib/types/api"

/**
 * 模块级缓存。ReviewerSet 会按审核者条数渲染多份，若各自发请求会产生
 * N 个并发请求；缓存 Promise 而非结果，让并发调用共享同一次请求。
 * 失败时置回 null，使 retry 能真正重新发起。
 */
let cache: Promise<Department[]> | null = null

function fetchDepartments(): Promise<Department[]> {
  cache ??= getDepartmentList()
    .then((res) => {
      const list = (res.data?.data ?? []) as Department[]
      // 后端 department.id 在建表语句里是 varchar，统一归一成数字再交给上层
      return list.map((item) => ({ id: Number(item.id), name: item.name }))
    })
    .catch((error: unknown) => {
      cache = null
      throw error
    })
  return cache
}

/** 仅供测试重置模块级缓存，避免用例之间互相污染 */
export function resetDepartmentCache() {
  cache = null
}

/**
 * 拉取学院列表。
 *
 * 返回的 `id` 即「审核学院代号」，直接用作 review_settings 的 key，
 * 不要用数组下标推导，否则学院增删后会静默错位。
 */
export function useDepartments() {
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [failed, setFailed] = React.useState(false)
  const [nonce, setNonce] = React.useState(0)
  const [loadedNonce, setLoadedNonce] = React.useState(-1)
  const loading = loadedNonce !== nonce

  React.useEffect(() => {
    let cancelled = false
    fetchDepartments()
      .then((list) => {
        if (cancelled) return
        setDepartments(list)
        setFailed(false)
      })
      .catch((error) => {
        if (cancelled) return
        setFailed(true)
        notifyRequestError(error, "学院列表加载失败，请稍后重试")
      })
      .finally(() => {
        if (!cancelled) setLoadedNonce(nonce)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  return {
    departments,
    loading,
    failed,
    retry: () => {
      cache = null
      setNonce((value) => value + 1)
    },
  }
}
