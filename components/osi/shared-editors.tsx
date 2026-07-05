'use client'

import { Plus, Trash2 } from 'lucide-react'
import type {
  Dialect,
  OsiAiContext,
  OsiCustomExtension,
  OsiDialectExpression,
} from '@/lib/osi-types'
import { DIALECTS, VENDOR_EXAMPLES, uid } from '@/lib/osi-types'
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
}: {
  value: OsiAiContext
  onChange: (next: OsiAiContext) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
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
            </>
          )}
        </>
      ) : null}
    </div>
  )
}

/**
 * $defs/CustomExtension[] 编辑器：{ vendor_name, data }
 */
export function CustomExtensionsEditor({
  value,
  onChange,
}: {
  value: OsiCustomExtension[]
  onChange: (next: OsiCustomExtension[]) => void
}) {
  const update = (id: string, patch: Partial<OsiCustomExtension>) =>
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
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

      {value.map((ext) => {
        let jsonError = false
        try {
          JSON.parse(ext.data)
        } catch {
          jsonError = true
        }
        return (
          <div key={ext.id} className="flex flex-col gap-2 rounded-md border border-border p-2.5">
            <div className="flex items-center gap-2">
              <Input
                value={ext.vendorName}
                onChange={(e) => update(ext.id, { vendorName: e.target.value })}
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
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(value.filter((x) => x.id !== ext.id))}
                aria-label="删除扩展"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <Textarea
              value={ext.data}
              onChange={(e) => update(ext.id, { data: e.target.value })}
              className={`min-h-14 font-mono text-xs ${jsonError ? 'border-destructive' : ''}`}
              placeholder='{"key": "value"}'
              aria-label="data（JSON 字符串）"
            />
            {jsonError ? (
              <p className="text-xs text-destructive">data 必须是合法的 JSON 字符串</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
