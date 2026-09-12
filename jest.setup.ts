/**
 * Jest setup file
 * This file is executed before each test file
 */

import "@testing-library/jest-dom"
import React from "react"

// --- jsdom 缺失的浏览器 API 兜底（Radix UI 的 Select / Slider 等依赖这些） ---
if (typeof window !== "undefined") {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }

  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }

  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }

  // jsdom 的 Blob 没有实现 text()（也没有 Response 可以兜），用 FileReader 补上。
  // 浏览器与 Tauri WebView2 都原生支持，仅测试环境需要。
  if (typeof Blob !== "undefined" && !Blob.prototype.text) {
    Blob.prototype.text = function (this: Blob) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ""))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(this)
      })
    }
  }
}

type MockNextImageProps = React.ComponentPropsWithoutRef<"img"> & {
  priority?: boolean
  fill?: boolean
}

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: MockNextImageProps) => {
    const normalizedProps = { ...props }
    delete normalizedProps.priority
    delete normalizedProps.fill
    return React.createElement("img", normalizedProps)
  },
}))

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: "/",
      query: {},
      asPath: "/",
    }
  },
  usePathname() {
    return "/"
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
