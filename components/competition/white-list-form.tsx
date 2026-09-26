"use client"

import { InfoIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FileDropzone } from "@/components/common/file-dropzone"

type WhiteListFormProps = {
  fileList: File[]
  checked: boolean
  onFileChange: (files: File[]) => void
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/** 白名单设置区块，等价于旧版 WhiteListdetail */
export function WhiteListForm({
  fileList,
  checked,
  onFileChange,
  onCheckedChange,
  disabled,
}: WhiteListFormProps) {
  return (
    <div className="space-y-5">
      <Label
        htmlFor="white-list-enabled"
        className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 font-normal"
      >
        <span className="space-y-1">
          <span className="block text-sm font-medium">启用报名白名单</span>
          <span className="text-muted-foreground block text-xs">
            开启后仅名单内的学号可以报名该比赛，不开启则全校开放。
          </span>
        </span>
        <Switch
          id="white-list-enabled"
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onCheckedChange(next === true)}
        />
      </Label>

      {checked ? (
        <div className="space-y-3">
          <FileDropzone
            value={fileList}
            onChange={onFileChange}
            accept=".csv,.xlsx,.xls"
            maxSize={5 * 1024 * 1024}
            maxCount={1}
            title="点击或将文件拖入以上传白名单"
            hint="仅支持上传单个文件，格式为 csv、xlsx、xls"
            disabled={disabled}
          />
          <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            表格第一列填写允许报名的学号，一行一个，无需表头。
          </p>
        </div>
      ) : null}
    </div>
  )
}
