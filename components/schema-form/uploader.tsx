"use client"

import * as React from "react"
import { DownloadIcon, FileIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { notifyRequestError } from "@/lib/api/errors"
import { getLicense } from "@/lib/api/user"
import {
  downloadCertifiedFile,
  formatFileSize,
  getOriginalFileName,
  putFileWithProgress,
} from "@/lib/file"
import { cn } from "@/lib/utils"
import type { WidgetComponent, WidgetProps } from "./types"

/** 单文件大小上限 500MB，与旧版一致 */
const MAX_SIZE = 1024 * 1024 * 500

/**
 * 直传失败的状态码提示：这几个码基本都指向存储侧配置，而不是「网络不好」。
 * 浏览器直传是跨域请求，被 CORS 拦掉时连状态码都拿不到（走 catch 分支）。
 */
function uploadFailureHint(status: number) {
  if (status === 403) return "存储桶拒绝了这次上传：密钥权限或跨域（CORS）配置有问题"
  if (status === 404) return "存储桶不存在或路径不对，请检查后端对象存储配置"
  if (status === 0) return "请求被浏览器或网络代理拦截，请检查存储桶跨域（CORS）配置"
  return `对象存储返回 HTTP ${status}`
}

type UploaderProps = WidgetProps & {
  inputName?: string
  accept?: string | string[]
}

/**
 * 生成绑定到某个比赛的自定义上传控件（schema 中 widget: "customUpload"）。
 * 上传流程与旧版一致：先向后端换取直传凭证，再 PUT 到对象存储。
 */
export function createSchemaUploader(competitionId: number): WidgetComponent {
  function SchemaUploader(props: WidgetProps) {
    const { value, onChange, schema, disabled } = props as UploaderProps
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [uploadingName, setUploadingName] = React.useState<string>()
    const [localName, setLocalName] = React.useState<string>()

    const nodeProps = (schema.props ?? {}) as { inputName?: string; accept?: string | string[] }
    const inputName = nodeProps.inputName ?? schema.title ?? ""
    const accept = Array.isArray(nodeProps.accept) ? nodeProps.accept.join(",") : nodeProps.accept

    const currentUrl = typeof value === "string" && value ? value : undefined
    const displayName = localName ?? (currentUrl ? getOriginalFileName(currentUrl) : undefined)

    const handleFile = async (file?: File | null) => {
      if (!file) return
      if (file.size > MAX_SIZE) {
        toast.error("文件大小超过 500MB 限制", {
          description: `${file.name} 为 ${formatFileSize(file.size)}`,
        })
        return
      }

      setUploading(true)
      setProgress(0)
      setUploadingName(file.name)
      try {
        const licenseRes = await getLicense(file.name, inputName, competitionId)
        const payload = licenseRes.data?.data
        if (!payload?.url) {
          toast.error(`${file.name} 上传失败`, { description: "未能获取上传凭证，请稍后重试" })
          return
        }
        const putRes = await putFileWithProgress(payload.url, file, setProgress)
        if (!putRes.ok) {
          toast.error(`${file.name} 上传失败`, { description: uploadFailureHint(putRes.status) })
          return
        }
        setLocalName(file.name)
        onChange(payload.clearUrl ?? String(payload.url).split("?")[0])
        toast.success(`${file.name} 上传成功`)
      } catch (error) {
        // 直传对象存储是浏览器发往 COS 域名的跨域请求，被 CORS / 代理拦掉时也是「没拿到响应」，
        // 用 storage 上下文提示跨域配置，不要笼统说成网络故障
        notifyRequestError(error, `${file.name} 上传失败`, {
          description: "请稍后重试",
          context: "storage",
        })
      } finally {
        setUploading(false)
        setUploadingName(undefined)
      }
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            {uploading ? `正在上传 ${progress}%` : currentUrl ? "重新上传文件" : "点击上传文件"}
          </Button>
          {accept ? (
            <span className="text-muted-foreground text-xs">允许格式：{accept}</span>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ""
          }}
        />

        {uploading ? (
          <div className="motion-safe:animate-fade-enter space-y-1.5" aria-live="polite">
            <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
              <span className="truncate">{uploadingName}</span>
              <span className="shrink-0 font-mono tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        ) : null}

        {currentUrl ? (
          <div
            className={cn(
              "bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2",
              disabled && "opacity-70"
            )}
          >
            <FileIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm" title={displayName}>
              {displayName || "已上传文件"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="下载文件"
              onClick={() => downloadCertifiedFile(currentUrl)}
            >
              <DownloadIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="移除文件"
              disabled={disabled || uploading}
              onClick={() => {
                setLocalName(undefined)
                onChange(null)
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  SchemaUploader.displayName = "SchemaUploader"
  return SchemaUploader as WidgetComponent
}
