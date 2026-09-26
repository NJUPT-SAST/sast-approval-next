"use client"

/**
 * 把出错的表单控件滚到视野中央并聚焦。
 * 系统开启「减少动态效果」时不做平滑滚动。
 */
export function focusField(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  element.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
  element.focus({ preventScroll: true })
}
