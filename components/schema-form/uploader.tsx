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
          toast.error(`${file.name} 上传失败`, { description: `HTTP ${putRes.status}` })
          return
        }
        setLocalName(file.name)
        onChange(payload.clearUrl ?? String(payload.url).split("?")[0])
        toast.success(`${file.name} 上传成功`)
      } catch (error) {
        notifyRequestError(error, `${file.name} 上传失败`, { description: "请检查网络后重试" })
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
