"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  LockIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { login } from "@/lib/api/public"
import { getUserProfile } from "@/lib/api/user"
import { notifyRequestError } from "@/lib/api/errors"
import { useValidateCode } from "@/lib/hooks/use-validate-code"
import { canAccess } from "@/lib/navigation"
import { STORAGE_KEYS, writeStorage } from "@/lib/storage"
import { roleNumberToState, useUserStore } from "@/lib/store/user"
import { identifyUser } from "@/lib/monitoring"

type Field = "username" | "password" | "validate"

const HIGHLIGHTS = [
  { icon: SparklesIcon, title: "一站式赛事管理", desc: "创建、报名、提交、评审全流程闭环" },
  { icon: ShieldCheckIcon, title: "分角色权限", desc: "选手 / 审核 / 评委 / 管理员各司其职" },
  { icon: KeyRoundIcon, title: "统一身份认证", desc: "使用学号与密码即可登录系统" },
]

export function LoginView() {
  const router = useRouter()
  const pathname = usePathname()
  const { imageUrl, captchaId, loading: captchaLoading, refresh } = useValidateCode()
  const setRole = useUserStore((state) => state.setRole)
  const setProfile = useUserStore((state) => state.setProfile)

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [validate, setValidate] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({})

  /** 只在事件回调里调用，按 id 找到输入框并聚焦 */
  const focusInput = (field: Field) => document.getElementById(`login-${field}`)?.focus()

  /** 输入时顺手清掉该字段的错误提示 */
  const bindField = (field: Field, setter: (value: string) => void) => ({
    "aria-invalid": Boolean(errors[field]),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value)
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    },
  })

  /** 验证码作废：清空输入、换一张图并把光标放回验证码框 */
  const resetCaptcha = () => {
    setValidate("")
    refresh()
    focusInput("validate")
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Partial<Record<Field, string>> = {}
    if (!username.trim()) nextErrors.username = "请输入学号"
    if (!password) nextErrors.password = "请输入密码"
    if (!validate.trim()) nextErrors.validate = "请输入验证码"
    setErrors(nextErrors)
    const firstInvalid = (["username", "password", "validate"] as const).find(
      (field) => nextErrors[field]
    )
    if (firstInvalid) {
      focusInput(firstInvalid)
      return
    }

    setSubmitting(true)
    try {
      const res = await login(captchaId, validate.trim(), username.trim(), password)
      if (!res.data.success) {
        toast.error("😭 登录失败", { description: res.data.errMsg ?? "请检查账号、密码与验证码" })
        resetCaptcha()
        setSubmitting(false)
        return
      }

      writeStorage(STORAGE_KEYS.token, res.data.data.token)
      const role = roleNumberToState(res.data.data.role)

      // 先拿到个人信息再切换角色：角色一变 AppShell 就会渲染主界面，
      // 反过来做会先闪一下「未命名」的侧边栏
      try {
        const profileRes = await getUserProfile()
        if (profileRes.data.success) {
          const data = profileRes.data.data
          setProfile({
            code: data.code ?? "",
            name: data.name ?? "",
            college: data.college ?? "",
            major: data.major ?? "未知",
            contact: data.contact ?? "未知",
          })
          identifyUser(data.code ?? "", data.name ?? "")
          toast.success("😸 登录成功", {
            description: `${data.code ?? ""} ${data.name ?? ""} 欢迎回来`,
          })
        } else {
          toast.warning("登录成功，但个人信息获取失败", {
            description: profileRes.data.errMsg ?? "",
          })
        }
      } catch {
        toast.warning("登录成功，但个人信息获取失败", { description: "稍后可在「我的账号」中查看" })
      }

      setRole(role)
      // 登录过期后在原页面重新登录，就留在原页面；否则进入「我的账号」
      if (pathname === "/" || !canAccess(role, pathname)) router.replace("/account")
    } catch (error) {
      notifyRequestError(error, "😭 登录失败", { description: "请稍后重试" })
      resetCaptcha()
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background relative flex min-h-svh flex-col lg:flex-row">
      <div className="absolute end-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* 品牌展示区 */}
      <aside className="auth-aurora relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url(/assets/login-bg.webp)" }}
          aria-hidden
        />
        <Image
          src="/assets/light-logo.svg"
          alt="SAST"
          width={220}
          height={72}
          className="h-16 w-auto dark:brightness-0 dark:invert"
          priority
        />
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="text-foreground text-4xl leading-tight font-bold tracking-tight xl:text-5xl">
              通用比赛
              <br />
              管理评审系统
            </h1>
            <p className="text-muted-foreground text-balance-pretty text-base">
              南京邮电大学大学生科学技术协会出品，服务于校内各类学科竞赛的报名、材料提交与评审工作。
            </p>
          </div>
          <ul className="space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <item.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-foreground text-sm font-semibold">{item.title}</p>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-muted-foreground text-xs">
          1992 - 2026 Students&apos; Association for Science and Technology ·{" "}
          <a
            className="hover:text-primary underline underline-offset-4"
            href="https://github.com/NJUPT-SAST"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </p>
      </aside>

      {/* 表单区 */}
      <main className="relative flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="auth-aurora absolute inset-0 opacity-70 lg:hidden" aria-hidden />
        <div className="glass-panel relative z-10 w-full max-w-105 rounded-2xl border p-7 shadow-xl sm:p-9 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-filter-none">
          <div className="mb-8 space-y-2 text-center lg:text-left">
            <Image
              src="/assets/light-logo.svg"
              alt="SAST"
              width={180}
              height={60}
              className="mx-auto mb-6 h-12 w-auto lg:hidden dark:brightness-0 dark:invert"
              priority
            />
            <h2 className="text-2xl font-bold tracking-tight">欢迎回来</h2>
            <p className="text-muted-foreground text-sm">请使用学号与密码登录系统</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-username">学号</Label>
              <div className="relative">
                <UserIcon className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="login-username"
                  className="h-11 ps-9"
                  autoComplete="username"
                  autoFocus
                  placeholder="请输入学号"
                  value={username}
                  {...bindField("username", setUsername)}
                />
              </div>
              {errors.username ? (
                <p className="text-destructive text-xs">{errors.username}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <div className="relative">
                <LockIcon className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="h-11 ps-9 pe-11"
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  {...bindField("password", setPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  aria-pressed={showPassword}
                  className="text-muted-foreground hover:text-foreground absolute end-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="text-destructive text-xs">{errors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-validate">验证码</Label>
              <div className="flex items-stretch gap-3">
                <div className="relative flex-1">
                  <ShieldCheckIcon className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="login-validate"
                    className="h-11 ps-9"
                    placeholder="请输入验证码"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={validate}
                    {...bindField("validate", setValidate)}
                  />
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  title="点击刷新验证码"
                  aria-label="看不清？点击刷新验证码"
                  className="bg-muted hover:border-primary/60 relative h-11 w-36 shrink-0 overflow-hidden rounded-md border transition-colors sm:w-44"
                >
                  {captchaLoading ? (
                    <span className="text-muted-foreground flex h-full items-center justify-center">
                      <Loader2Icon className="size-4 animate-spin" />
                    </span>
                  ) : imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt="验证码"
                      className="h-full w-full bg-white object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground flex h-full items-center justify-center gap-1 text-xs">
                      <RefreshCwIcon className="size-3" />
                      重试
                    </span>
                  )}
                </button>
              </div>
              {errors.validate ? (
                <p className="text-destructive text-xs">{errors.validate}</p>
              ) : null}
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
              {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {submitting ? "登录中…" : "登 录"}
            </Button>
          </form>

          <p className="text-muted-foreground mt-8 text-center text-xs lg:hidden">
            1992 - 2026 SAST ·{" "}
            <a
              className="hover:text-primary underline underline-offset-4"
              href="https://github.com/NJUPT-SAST"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
