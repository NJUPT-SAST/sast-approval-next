"use client"

import * as React from "react"
import { AlertCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchemaForm, getIn } from "./use-schema-form"
import type {
  FormError,
  SchemaFormInstance,
  SchemaFormValues,
  SchemaNode,
  WidgetComponent,
} from "./types"

export { useSchemaForm }
export type { SchemaFormInstance, SchemaNode, FormError }

type SchemaFormProps = {
  form: SchemaFormInstance
  schema?: SchemaNode
  onFinish?: (values: SchemaFormValues, errors: FormError[]) => void
  onValuesChange?: (changed: Record<string, unknown>, all: SchemaFormValues) => void
  widgets?: Record<string, WidgetComponent>
  disabled?: boolean
  className?: string
}

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0)

/** 按 order 排序 schema 的 properties */
function orderedEntries(properties: Record<string, SchemaNode>) {
  return Object.entries(properties).sort(([, a], [, b]) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER
    const bo = b.order ?? Number.MAX_SAFE_INTEGER
    return ao - bo
  })
}

/** 深度遍历 schema 做校验 */
function validate(
  node: SchemaNode | undefined,
  values: SchemaFormValues,
  path: string,
  errors: FormError[]
) {
  if (!node) return
  if (node.type === "object" && node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      validate(child, values, path ? `${path}.${key}` : key, errors)
    }
    return
  }
  if (node.hidden) return

  const value = path ? getIn(values, path) : undefined
  const messages: string[] = []

  if (node.required && isEmpty(value)) {
    messages.push(`${node.title ?? "该项"}不能为空`)
  }
  if (!isEmpty(value) && node.rules) {
    for (const rule of node.rules) {
      if (rule.pattern) {
        const regexp = typeof rule.pattern === "string" ? new RegExp(rule.pattern) : rule.pattern
        if (!regexp.test(String(value))) {
          messages.push(rule.message ?? "格式不正确")
        }
      }
    }
  }
  const limit = node.maxLength ?? (node.type === "string" ? node.max : undefined)
  if (typeof limit === "number" && typeof value === "string" && value.length > limit) {
    messages.push(`最多输入 ${limit} 个字符`)
  }

  if (messages.length > 0) errors.push({ name: path, error: messages })
}

/** 收集 schema 中所有 default 值 */
function collectDefaults(
  node: SchemaNode | undefined,
  path: string,
  out: { path: string; value: unknown }[]
) {
  if (!node) return
  if (node.type === "object" && node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      collectDefaults(child, path ? `${path}.${key}` : key, out)
    }
    return
  }
  if (node.default !== undefined && path) out.push({ path, value: node.default })
}

export function SchemaForm({
  form,
  schema,
  onFinish,
  onValuesChange,
  widgets,
  disabled,
  className,
}: SchemaFormProps) {
  React.useSyncExternalStore(form.subscribe, form.getVersion, () => 0)

  const values = form.getValues()
  const errors = form.getErrors()
  const errorMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of errors) map[item.name] = item.error[0]
    return map
  }, [errors])

  // 应用 schema 中声明的默认值（仅在该路径尚未有值时）
  React.useEffect(() => {
    if (!schema) return
    const defaults: { path: string; value: unknown }[] = []
    collectDefaults(schema, "", defaults)
    for (const item of defaults) {
      if (form.getValueByPath(item.path) === undefined) {
        form.setValueByPath(item.path, item.value)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema])

  const formRef = React.useRef<HTMLFormElement>(null)

  const handleSubmit = React.useCallback(() => {
    const nextErrors: FormError[] = []
    validate(schema, form.getValues(), "", nextErrors)
    form.setErrors(nextErrors)
    if (nextErrors.length > 0) {
      // 等错误提示渲染出来，再把第一个出错的字段滚到视野中并聚焦
      window.requestAnimationFrame(() => {
        const field = formRef.current?.querySelector<HTMLElement>("[data-field-error]")
        if (!field) return
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        field.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
        field
          .querySelector<HTMLElement>("input:not([type=hidden]), textarea, button, [tabindex]")
          ?.focus({ preventScroll: true })
      })
    }
    onFinish?.(form.getValues(), nextErrors)
  }, [form, schema, onFinish])

  React.useEffect(() => {
    form.registerSubmitHandler(handleSubmit)
  }, [form, handleSubmit])

  const setValue = React.useCallback(
    (path: string, value: unknown) => {
      form.setValueByPath(path, value)
      onValuesChange?.({ [path]: value }, form.getValues())
    },
    [form, onValuesChange]
  )

  if (!schema) return null

  return (
    <form
      ref={formRef}
      className={cn("w-full space-y-5", className)}
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
      noValidate
    >
      <SchemaNodeRenderer
        node={schema}
        path=""
        values={values}
        errorMap={errorMap}
        setValue={setValue}
        widgets={widgets}
        disabled={disabled}
        depth={0}
      />
    </form>
  )
}

type RendererProps = {
  node: SchemaNode
  path: string
  values: SchemaFormValues
  errorMap: Record<string, string>
  setValue: (path: string, value: unknown) => void
  widgets?: Record<string, WidgetComponent>
  disabled?: boolean
  depth: number
}

function SchemaNodeRenderer(props: RendererProps) {
  const { node, path, depth } = props

  if (node.hidden) return null

  if (node.type === "object" && node.properties) {
    const children = (
      <div className={cn("space-y-5", depth > 0 && "space-y-4")}>
        {orderedEntries(node.properties).map(([key, child]) => (
          <SchemaNodeRenderer
            {...props}
            key={key}
            node={child}
            path={path ? `${path}.${key}` : key}
            depth={depth + 1}
          />
        ))}
      </div>
    )

    // 根节点或无标题的分组：直接平铺
    if (depth === 0 || !node.title) {
      return depth === 0 ? <div className="space-y-8">{children}</div> : children
    }

    return (
      <fieldset className="border-border/80 space-y-4 border-s-2 ps-4 sm:ps-5">
        <legend className="sr-only">{node.title}</legend>
        <div className="space-y-0.5">
          <p className="text-foreground text-sm font-semibold">{node.title}</p>
          {node.description ? (
            <p className="text-muted-foreground text-xs">{node.description}</p>
          ) : null}
        </div>
        {children}
      </fieldset>
    )
  }

  return <SchemaField {...props} />
}

function SchemaField({ node, path, values, errorMap, setValue, widgets, disabled }: RendererProps) {
  const value = getIn(values, path)
  const error = errorMap[path]
  const controlDisabled = disabled || node.disabled
  const readOnly = node.readOnly
  const nodeProps = (node.props ?? {}) as Record<string, unknown>
  const id = `field-${path.replace(/\./g, "-")}`

  let control: React.ReactNode = null

  if (node.widget && widgets?.[node.widget]) {
    const Widget = widgets[node.widget]
    control = (
      <Widget
        {...nodeProps}
        value={value}
        onChange={(next: unknown) => setValue(path, next)}
        schema={node}
        path={path}
        disabled={controlDisabled}
        readOnly={readOnly}
        error={error}
      />
    )
  } else if (node.widget === "select" || (node.enum && node.widget !== "radio")) {
    const options = node.enum ?? []
    const names = node.enumNames ?? options.map(String)
    control = (
      <Select
        value={value === undefined || value === null ? undefined : String(value)}
        onValueChange={(next) => setValue(path, next)}
        disabled={controlDisabled || readOnly}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue placeholder={node.placeholder ?? "请选择"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem key={String(option)} value={String(option)}>
              {names[index] ?? String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  } else if (node.widget === "radio") {
    const options = node.enum ?? []
    const names = node.enumNames ?? options.map(String)
    control = (
      <RadioGroup
        value={value === undefined || value === null ? undefined : String(value)}
        onValueChange={(next) => setValue(path, next)}
        disabled={controlDisabled || readOnly}
        className="flex flex-wrap gap-x-6 gap-y-2 pt-1"
      >
        {options.map((option, index) => (
          <div key={String(option)} className="flex items-center gap-2">
            <RadioGroupItem value={String(option)} id={`${id}-${index}`} />
            <Label htmlFor={`${id}-${index}`} className="cursor-pointer font-normal">
              {names[index] ?? String(option)}
            </Label>
          </div>
        ))}
      </RadioGroup>
    )
  } else if (node.widget === "slider") {
    const min = node.min ?? 0
    const max = node.max ?? 100
    const current = typeof value === "number" ? value : min
    control = (
      <div className="flex items-center gap-4 pt-2">
        <Slider
          id={id}
          className="flex-1"
          min={min}
          max={max}
          step={1}
          value={[current]}
          disabled={controlDisabled || readOnly}
          onValueChange={([next]) => setValue(path, next)}
        />
        <span className="bg-muted text-foreground min-w-12 rounded-md px-2 py-1 text-center font-mono text-sm tabular-nums">
          {current}
        </span>
      </div>
    )
  } else if (node.type === "boolean") {
    control = (
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id={id}
          checked={Boolean(value)}
          disabled={controlDisabled || readOnly}
          onCheckedChange={(next) => setValue(path, next === true)}
        />
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {node.description ?? node.title}
        </Label>
      </div>
    )
  } else if (node.format === "textarea") {
    const limit = node.maxLength ?? node.max
    control = (
      <div className="space-y-1">
        <Textarea
          id={id}
          rows={5}
          value={(value as string) ?? ""}
          placeholder={node.placeholder}
          disabled={controlDisabled}
          readOnly={readOnly}
          maxLength={typeof limit === "number" ? limit : undefined}
          aria-invalid={Boolean(error)}
          onChange={(event) => setValue(path, event.target.value)}
        />
        {typeof limit === "number" ? (
          <div className="text-muted-foreground text-right text-xs tabular-nums">
            {String((value as string) ?? "").length} / {limit}
          </div>
        ) : null}
      </div>
    )
  } else if (node.type === "number") {
    control = (
      <Input
        id={id}
        type="number"
        min={node.min}
        max={node.max}
        value={value === undefined || value === null ? "" : String(value)}
        placeholder={node.placeholder}
        disabled={controlDisabled}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        onChange={(event) =>
          setValue(path, event.target.value === "" ? undefined : Number(event.target.value))
        }
      />
    )
  } else {
    control = (
      <Input
        id={id}
        value={(value as string) ?? ""}
        placeholder={node.placeholder}
        disabled={controlDisabled}
        readOnly={readOnly}
        maxLength={node.maxLength}
        aria-invalid={Boolean(error)}
        onChange={(event) => setValue(path, event.target.value)}
      />
    )
  }

  return (
    <div className="space-y-2" data-field-error={error ? "" : undefined}>
      {node.title && node.type !== "boolean" ? (
        <Label htmlFor={id} className="text-sm font-medium">
          {node.required ? <span className="text-destructive mr-0.5">*</span> : null}
          {node.title}
        </Label>
      ) : null}
      {node.description && node.type !== "boolean" ? (
        <p className="text-muted-foreground text-xs">{node.description}</p>
      ) : null}
      {control}
      {error ? (
        <p className="text-destructive motion-safe:animate-fade-enter flex items-center gap-1 text-xs">
          <AlertCircleIcon className="size-3" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
