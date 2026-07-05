'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Columns3, Database, Plus, Trash2 } from 'lucide-react'
import type { DimensionMode, OsiDataset, OsiField, OsiUniqueKey } from '@/lib/osi-types'
import { emptyAiContext, uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, TagInput } from './field'
import {
  AiContextEditor,
  CustomExtensionsEditor,
  DialectExpressionsEditor,
} from './shared-editors'

const DIMENSION_MODES: { value: DimensionMode; label: string; hint: string }[] = [
  { value: 'none', label: '不设置', hint: '不输出 dimension 配置点' },
  { value: 'plain', label: '维度（未指定 is_time）', hint: '输出 dimension: {}' },
  { value: 'time', label: '时间维度', hint: '输出 dimension.is_time: true' },
  { value: 'not_time', label: '非时间维度', hint: '输出 dimension.is_time: false' },
]

function FieldCard({
  field,
  onChange,
  onRemove,
}: {
  field: OsiField
  onChange: (next: OsiField) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const set = <K extends keyof OsiField>(key: K, value: OsiField[K]) =>
    onChange({ ...field, [key]: value })

  // 来自右侧预览的字段级定位：自动展开折叠的字段卡
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onReveal = () => setOpen(true)
    el.addEventListener('osi-reveal', onReveal)
    return () => el.removeEventListener('osi-reveal', onReveal)
  }, [])

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-md border border-border border-l-2 border-l-chart-2/50 bg-background"
      data-sel={`field:${field.id}`}
    >
      <div className={`flex items-center gap-2 px-3 py-2 ${open ? 'bg-muted/40' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <Columns3 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-sm">
            {field.name || <span className="text-muted-foreground italic">未命名字段</span>}
          </span>
          {field.dimensionMode === 'time' ? (
            <Badge variant="secondary" className="text-[10px]">
              时间维度
            </Badge>
          ) : null}
          {field.dimensionMode === 'plain' || field.dimensionMode === 'not_time' ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              维度
            </Badge>
          ) : null}
          {field.dialects.length > 1 ? (
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
              {field.dialects.length} dialects
            </Badge>
          ) : null}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除字段"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="name（必填）" hint="字段在数据集内的唯一标识" sel={`field:${field.id}.name`}>
              <Input
                value={field.name}
                onChange={(e) => set('name', e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder="order_date"
              />
            </Field>
            <Field label="label" hint="分类用标签" sel={`field:${field.id}.label`}>
              <Input
                value={field.label}
                onChange={(e) => set('label', e.target.value)}
                className="h-8 text-sm"
                placeholder="下单日期"
              />
            </Field>
          </div>

          <Field label="expression（必填）" sel={`field:${field.id}.expression`}>
            <DialectExpressionsEditor
              value={field.dialects}
              onChange={(dialects) => set('dialects', dialects)}
              placeholder="CAST(order_ts AS DATE)"
            />
          </Field>

          <Field
            label="dimension"
            hint={DIMENSION_MODES.find((m) => m.value === field.dimensionMode)?.hint}
            sel={`field:${field.id}.dimension`}
          >
            <Select
              value={field.dimensionMode}
              onValueChange={(v) => set('dimensionMode', v as DimensionMode)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-sm">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="description" sel={`field:${field.id}.description`}>
            <Input
              value={field.description}
              onChange={(e) => set('description', e.target.value)}
              className="h-8 text-sm"
              placeholder="订单创建日期"
            />
          </Field>

          <AiContextEditor
            value={field.aiContext}
            onChange={(v) => set('aiContext', v)}
            sel={`field:${field.id}`}
          />
          <CustomExtensionsEditor
            value={field.customExtensions}
            onChange={(v) => set('customExtensions', v)}
            sel={`field:${field.id}`}
          />
        </div>
      ) : null}
    </div>
  )
}

function UniqueKeysEditor({
  value,
  onChange,
}: {
  value: OsiUniqueKey[]
  onChange: (next: OsiUniqueKey[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {value.map((uk, i) => (
        <div key={uk.id} className="flex items-start gap-2">
          <span className="mt-1.5 shrink-0 font-mono text-xs text-muted-foreground">
            #{i + 1}
          </span>
          <div className="flex-1">
            <TagInput
              value={uk.columns}
              onChange={(columns) =>
                onChange(value.map((x) => (x.id === uk.id ? { ...x, columns } : x)))
              }
              placeholder="列名，回车添加（多列为复合键）"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(value.filter((x) => x.id !== uk.id))}
            aria-label="删除唯一键"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-fit gap-1 bg-transparent text-xs"
        onClick={() => onChange([...value, { id: uid(), columns: [] }])}
      >
        <Plus className="size-3" />
        添加唯一键组
      </Button>
    </div>
  )
}

function DatasetCard({
  dataset,
  onChange,
  onRemove,
}: {
  dataset: OsiDataset
  onChange: (next: OsiDataset) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiDataset>(key: K, value: OsiDataset[K]) =>
    onChange({ ...dataset, [key]: value })

  const addField = () =>
    set('fields', [
      ...dataset.fields,
      {
        id: uid(),
        name: '',
        dialects: [{ id: uid(), dialect: 'ANSI_SQL', expression: '' }],
        dimensionMode: 'none',
        label: '',
        description: '',
        aiContext: emptyAiContext(),
        customExtensions: [],
      },
    ])

  return (
    <div
      className="overflow-hidden rounded-lg border border-border border-l-2 border-l-primary/60 bg-card"
      data-sel={`dataset:${dataset.id}`}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm font-medium">
            {dataset.name || <span className="text-muted-foreground italic">未命名数据集</span>}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
            {dataset.fields.length} fields
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除数据集"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="name（必填）" hint="数据集唯一标识" sel={`dataset:${dataset.id}.name`}>
            <Input
              value={dataset.name}
              onChange={(e) => set('name', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="orders"
            />
          </Field>
          <Field
            label="source（必填）"
            hint="物理表 database.schema.table 或查询"
            sel={`dataset:${dataset.id}.source`}
          >
            <Input
              value={dataset.source}
              onChange={(e) => set('source', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="analytics.sales.fct_orders"
            />
          </Field>
        </div>

        <Field
          label="primary_key"
          hint="主键列（多列为复合主键）"
          sel={`dataset:${dataset.id}.primary_key`}
        >
          <TagInput
            value={dataset.primaryKey}
            onChange={(v) => set('primaryKey', v)}
            placeholder="列名，回车添加"
          />
        </Field>

        <Field
          label="unique_keys"
          hint="多组唯一键定义，每组可为单列或复合"
          sel={`dataset:${dataset.id}.unique_keys`}
        >
          <UniqueKeysEditor value={dataset.uniqueKeys} onChange={(v) => set('uniqueKeys', v)} />
        </Field>

        <Field label="description" sel={`dataset:${dataset.id}.description`}>
          <Input
            value={dataset.description}
            onChange={(e) => set('description', e.target.value)}
            className="h-8 text-sm"
            placeholder="订单事实表，一行代表一笔订单"
          />
        </Field>

        <AiContextEditor
          value={dataset.aiContext}
          onChange={(v) => set('aiContext', v)}
          sel={`dataset:${dataset.id}`}
        />
        <CustomExtensionsEditor
          value={dataset.customExtensions}
          onChange={(v) => set('customExtensions', v)}
          sel={`dataset:${dataset.id}`}
        />

        <div
          className="ml-1 flex flex-col gap-2 rounded-md border-l-2 border-border pl-3"
          data-sel={`dataset:${dataset.id}.fields`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              fields（行级字段）
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-primary hover:text-primary"
              onClick={addField}
            >
              <Plus className="size-3.5" />
              添加字段
            </Button>
          </div>
          {dataset.fields.map((f) => (
            <FieldCard
              key={f.id}
              field={f}
              onChange={(next) =>
                set(
                  'fields',
                  dataset.fields.map((x) => (x.id === f.id ? next : x)),
                )
              }
              onRemove={() =>
                set(
                  'fields',
                  dataset.fields.filter((x) => x.id !== f.id),
                )
              }
            />
          ))}
          {dataset.fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              暂无字段，点击「添加字段」开始定义
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function DatasetsPanel({
  datasets,
  onChange,
}: {
  datasets: OsiDataset[]
  onChange: (next: OsiDataset[]) => void
}) {
  const addDataset = () =>
    onChange([
      ...datasets,
      {
        id: uid(),
        name: '',
        source: '',
        primaryKey: [],
        uniqueKeys: [],
        description: '',
        aiContext: emptyAiContext(),
        fields: [],
        customExtensions: [],
      },
    ])

  return (
    <div className="flex flex-col gap-4" data-sel="model.datasets">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">数据集 / Datasets</h2>
          <p className="text-xs text-muted-foreground">
            name · source · primary_key · unique_keys · fields · ai_context · custom_extensions
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={addDataset}>
          <Plus className="size-3.5" />
          添加数据集
        </Button>
      </div>

      {datasets.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          官方 schema 要求至少 1 个数据集（datasets minItems: 1）
        </p>
      ) : null}

      {datasets.map((ds) => (
        <DatasetCard
          key={ds.id}
          dataset={ds}
          onChange={(next) => onChange(datasets.map((x) => (x.id === ds.id ? next : x)))}
          onRemove={() => onChange(datasets.filter((x) => x.id !== ds.id))}
        />
      ))}
    </div>
  )
}
