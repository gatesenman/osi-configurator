'use client'

import { useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import type {
  Dialect,
  OsiAiContext,
  OsiCustomExtension,
  OsiDialectExpression,
} from '@/lib/osi-types'
import { DIALECTS, VENDOR_EXAMPLES, uid } from '@/lib/osi-types'
import { findVendorPreset, vendorTemplate } from '@/lib/osi-vendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, TagInput } from './field'

/**
 * $defs/Expression 编辑器：dialects 数组（minItems: 1），
 * 每项为 { dialect, expression }
 */
export function DialectExpressionsEditor({
  value,
  onChange,
  placeholder,
}: {
  value: OsiDialectExpression[]
  onChange: (next: OsiDialectExpression[]) => void
  placeholder?: string
}) {
  const update = (id: string, patch: Partial<OsiDialectExpression>) =>
    onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)))

  return (
    <div className="flex flex-col gap-2">
      {value.map((d) => (
        <div key={d.id} className="flex items-start gap-2">
          <Select
            value={d.dialect}
            onValueChange={(v) => update(d.id, { dialect: v as Dialect })}
          >
            <SelectTrigger className="h-8 w-36 shrink-0 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIALECTS.map((dl) => (
                <SelectItem key={dl} value={dl} className="font-mono text-xs">
                  {dl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={d.expression}
            onChange={(e) => update(d.id, { expression: e.target.value })}
            className="h-8 flex-1 font-mono text-sm"
            placeholder={placeholder ?? 'SQL 表达式'}
            aria-label={`${d.dialect} 表达式`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(value.filter((x) => x.id !== d.id))}
            disabled={value.length <= 1}
            aria-label="删除方言表达式"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-fit gap-1 bg-transparent text-xs"
        onClick={() =>
          onChange([...value, { id: uid(), dialect: 'ANSI_SQL', expression: '' }])
        }
      >
        <Plus className="size-3" />
        添加方言
      </Button>
      <p className="text-xs text-muted-foreground/70">
        expression.dialects（至少 1 项）：同一逻辑在不同方言下的表达式
      </p>
    </div>
  )
}

/**
 * $defs/AIContext 编辑器：oneOf [string, { instructions, synonyms, examples }]
 */
export function AiContextEditor({
  value,
  onChange,
  sel,
}: {
  value: OsiAiContext
  onChange: (next: OsiAiContext) => void
  /** 选择键基础（如 dataset:d1），锚点为 <sel>.ai_context */
  sel?: string
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
      data-sel={sel ? `${sel}.ai_context` : undefined}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">ai_context</p>
          <p className="text-xs text-muted-foreground">面向 AI 工具的附加上下文</p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
          aria-label="启用 ai_context"
        />
      </div>

      {value.enabled ? (
        <>
          <div className="flex rounded-md border border-border p-0.5 w-fit" role="tablist" aria-label="ai_context 形态">
            {(
              [
                { key: 'structured', label: '结构化对象' },
                { key: 'text', label: '纯字符串' },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={value.mode === m.key}
                onClick={() => onChange({ ...value, mode: m.key })}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  value.mode === m.key
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {value.mode === 'text' ? (
            <Field label="字符串内容" hint="官方 oneOf 的字符串形态">
              <Textarea
                value={value.text}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
                className="min-h-16 text-sm"
                placeholder="面向 AI 的说明文字"
              />
            </Field>
          ) : (
            <>
              <Field label="instructions" hint="指导 AI 如何使用该实体">
                <Textarea
                  value={value.instructions}
                  onChange={(e) => onChange({ ...value, instructions: e.target.value })}
                  className="min-h-16 text-sm"
                  placeholder="回答销售问题时优先使用本指标口径"
                />
              </Field>
              <Field label="synonyms" hint="别名与同义词">
                <TagInput
                  value={value.synonyms}
                  onChange={(synonyms) => onChange({ ...value, synonyms })}
                />
              </Field>
              <Field label="examples" hint="示例问题或用例">
                <TagInput
                  value={value.examples}
                  onChange={(examples) => onChange({ ...value, examples })}
                />
              </Field>
              <AiContextExtraEditor value={value} onChange={onChange} />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}

/**
 * AIContext 任意附加键编辑器：官方结构化形态 additionalProperties: true，
 * instructions / synonyms / examples 之外的任意键以 JSON 对象编辑。
 */
function AiContextExtraEditor({
  value,
  onChange,
}: {
  value: OsiAiContext
  onChange: (next: OsiAiContext) => void
}) {
  let extraError: string | null = null
  if (value.extra.trim()) {
    try {
      const parsed = JSON.parse(value.extra)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        extraError = '必须是 JSON 对象（如 {"key": "value"}）'
      } else if (['instructions', 'synonyms', 'examples'].some((k) => k in parsed)) {
        extraError = '请勿包含 instructions / synonyms / examples（已有专属输入项）'
      }
    } catch {
      extraError = '不是合法的 JSON'
    }
  }
  return (
    <Field label="附加键" hint="任意自定义键值对（官方 additionalProperties: true），留空则不输出">
      <Textarea
        value={value.extra}
        onChange={(e) => onChange({ ...value, extra: e.target.value })}
        className={`min-h-14 font-mono text-xs ${extraError ? 'border-destructive' : ''}`}
        placeholder='{"domain": "sales", "sensitivity": "internal"}'
        aria-label="ai_context 附加键（JSON 对象）"
      />
      {extraError ? <p className="text-xs text-destructive">{extraError}</p> : null}
    </Field>
  )
}

/**
 * $defs/CustomExtension[] 编辑器：{ vendor_name, data }
 */
export function CustomExtensionsEditor({
  value,
  onChange,
  sel,
}: {
  value: OsiCustomExtension[]
  onChange: (next: OsiCustomExtension[]) => void
  /** 选择键基础（如 dataset:d1），锚点为 <sel>.custom_extensions */
  sel?: string
}) {
  const update = (id: string, patch: Partial<OsiCustomExtension>) =>
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
      data-sel={sel ? `${sel}.custom_extensions` : undefined}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">custom_extensions</p>
          <p className="text-xs text-muted-foreground">厂商私有扩展（vendor_name + JSON data）</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 bg-transparent text-xs"
          onClick={() => onChange([...value, { id: uid(), vendorName: 'COMMON', data: '{}' }])}
        >
          <Plus className="size-3" />
          添加
        </Button>
      </div>

      {value.map((ext) => (
        <ExtensionEntry
          key={ext.id}
          ext={ext}
          onUpdate={(patch) => update(ext.id, patch)}
          onRemove={() => onChange(value.filter((x) => x.id !== ext.id))}
        />
      ))}
    </div>
  )
}

/** 解析 data 为扁平对象（可进入键值对模式）；嵌套值以 JSON 字面量呈现 */
function parseFlat(data: string): Record<string, string> | null {
  try {
    const obj = JSON.parse(data)
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return null
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      flat[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }
    return flat
  } catch {
    return null
  }
}

/** 将键值对写回 JSON 字符串：值先尝试按 JSON 字面量解析（保留 true/123/[]），否则按字符串 */
function flatToJson(entries: [string, string][]): string {
  const obj: Record<string, unknown> = {}
  for (const [k, v] of entries) {
    if (!k.trim()) continue
    try {
      obj[k] = JSON.parse(v)
    } catch {
      obj[k] = v
    }
  }
  return JSON.stringify(obj, null, 2)
}

/**
 * 单条厂商扩展编辑：厂商感知（预设键提示 + 一键模板），
 * 键值对 / JSON 源码双模式编辑，数据始终存为官方要求的 JSON 字符串。
 */
function ExtensionEntry({
  ext,
  onUpdate,
  onRemove,
}: {
  ext: OsiCustomExtension
  onUpdate: (patch: Partial<OsiCustomExtension>) => void
  onRemove: () => void
}) {
  const [rawMode, setRawMode] = useState(false)
  const preset = findVendorPreset(ext.vendorName)
  const flat = parseFlat(ext.data)
  const kvAvailable = flat !== null
  const useKv = kvAvailable && !rawMode

  let jsonError = false
  try {
    JSON.parse(ext.data)
  } catch {
    jsonError = true
  }

  const entries: [string, string][] = flat ? Object.entries(flat) : []
  const updateEntry = (idx: number, key: string, val: string) => {
    const next = entries.map((e, i): [string, string] => (i === idx ? [key, val] : e))
    onUpdate({ data: flatToJson(next) })
  }
  const usedKeys = new Set(entries.map(([k]) => k))
  const suggestions = preset?.keys.filter((k) => !usedKeys.has(k.key)) ?? []

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
      <div className="flex items-center gap-2">
        <Input
          value={ext.vendorName}
          onChange={(e) => onUpdate({ vendorName: e.target.value })}
          className="h-8 flex-1 font-mono text-sm"
          placeholder="vendor_name"
          list={`vendors-${ext.id}`}
          aria-label="vendor_name"
        />
        <datalist id={`vendors-${ext.id}`}>
          {VENDOR_EXAMPLES.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        {preset ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1 bg-transparent text-xs"
            onClick={() => onUpdate({ data: vendorTemplate(preset) })}
            title={`插入 ${preset.name} 全部常用键模板`}
          >
            <Wand2 className="size-3" />
            模板
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除扩展"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {preset ? <p className="text-xs text-muted-foreground/80">{preset.description}</p> : null}

      <div className="flex rounded-md border border-border p-0.5 w-fit" role="tablist" aria-label="data 编辑模式">
        {(
          [
            { key: false, label: '键值对' },
            { key: true, label: 'JSON 源码' },
          ] as const
        ).map((m) => (
          <button
            key={String(m.key)}
            type="button"
            role="tab"
            aria-selected={useKv === !m.key}
            disabled={!kvAvailable && !m.key}
            onClick={() => setRawMode(m.key)}
            className={`rounded px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              useKv === !m.key
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {useKv ? (
        <div className="flex flex-col gap-1.5">
          {entries.map(([k, v], idx) => {
            const hint = preset?.keys.find((p) => p.key === k)
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={k}
                  onChange={(e) => updateEntry(idx, e.target.value, v)}
                  className="h-7 w-36 shrink-0 font-mono text-xs"
                  placeholder="key"
                  aria-label="配置键"
                  title={hint?.hint}
                />
                <Input
                  value={v}
                  onChange={(e) => updateEntry(idx, k, e.target.value)}
                  className="h-7 flex-1 font-mono text-xs"
                  placeholder={hint?.example ?? 'value'}
                  aria-label={`${k} 的值`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onUpdate({ data: flatToJson(entries.filter((_, i) => i !== idx)) })}
                  aria-label={`删除键 ${k}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )
          })}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 bg-transparent px-2 text-xs"
              onClick={() => {
                let n = 1
                while (usedKeys.has(`key_${n}`)) n++
                onUpdate({ data: flatToJson([...entries, [`key_${n}`, '']]) })
              }}
            >
              <Plus className="size-3" />
              添加键
            </Button>
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onUpdate({ data: flatToJson([...entries, [s.key, s.example]]) })}
                className="rounded border border-dashed border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                title={s.hint}
              >
                + {s.key}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <Textarea
            value={ext.data}
            onChange={(e) => onUpdate({ data: e.target.value })}
            className={`min-h-14 font-mono text-xs ${jsonError ? 'border-destructive' : ''}`}
            placeholder='{"key": "value"}'
            aria-label="data（JSON 字符串）"
          />
          {jsonError ? (
            <p className="text-xs text-destructive">data 必须是合法的 JSON 字符串（修正后可切回键值对模式）</p>
          ) : null}
        </>
      )}
    </div>
  )
}
