'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Database, KeyRound, Plus, Trash2 } from 'lucide-react'
import type { DataType, OsiDataset, OsiDimension, TimeGranularity } from '@/lib/osi-types'
import { uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, TagInput } from './field'

const DATA_TYPES: DataType[] = ['string', 'integer', 'decimal', 'boolean', 'date', 'timestamp']
const GRANULARITIES: TimeGranularity[] = ['day', 'week', 'month', 'quarter', 'year']

function newDimension(): OsiDimension {
  return {
    id: uid(),
    name: '',
    expr: '',
    dataType: 'string',
    description: '',
    synonyms: [],
    isTimeDimension: false,
    isPrimaryKey: false,
  }
}

export function newDataset(): OsiDataset {
  return {
    id: uid(),
    name: '',
    description: '',
    database: '',
    schema: '',
    table: '',
    dimensions: [newDimension()],
  }
}

function DimensionEditor({
  dim,
  onChange,
  onRemove,
}: {
  dim: OsiDimension
  onChange: (next: OsiDimension) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const set = <K extends keyof OsiDimension>(key: K, value: OsiDimension[K]) =>
    onChange({ ...dim, [key]: value })

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-2 text-left min-w-0"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-mono text-sm">
            {dim.name || <span className="text-muted-foreground italic">未命名维度</span>}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
            {dim.dataType}
          </Badge>
          {dim.isTimeDimension ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Clock className="size-3" />
              时间
            </Badge>
          ) : null}
          {dim.isPrimaryKey ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <KeyRound className="size-3" />
              主键
            </Badge>
          ) : null}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除维度"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-border px-3 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="维度名称">
              <Input
                value={dim.name}
                onChange={(e) => set('name', e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder="region"
              />
            </Field>
            <Field label="SQL 表达式 / 字段">
              <Input
                value={dim.expr}
                onChange={(e) => set('expr', e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder="sales_region"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="数据类型">
              <Select value={dim.dataType} onValueChange={(v) => set('dataType', v as DataType)}>
                <SelectTrigger className="h-8 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="font-mono text-sm">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="描述">
              <Input
                value={dim.description}
                onChange={(e) => set('description', e.target.value)}
                className="h-8 text-sm"
                placeholder="业务含义说明"
              />
            </Field>
          </div>

          <Field label="同义词" hint="供自然语言查询 / AI 语义理解使用">
            <TagInput value={dim.synonyms} onChange={(v) => set('synonyms', v)} />
          </Field>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={dim.isTimeDimension}
                onCheckedChange={(v) => set('isTimeDimension', v)}
                aria-label="时间维度"
              />
              时间维度
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={dim.isPrimaryKey}
                onCheckedChange={(v) => set('isPrimaryKey', v)}
                aria-label="主键"
              />
              主键
            </label>
            {dim.isTimeDimension ? (
              <Select
                value={dim.granularity ?? 'day'}
                onValueChange={(v) => set('granularity', v as TimeGranularity)}
              >
                <SelectTrigger className="h-8 w-32 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITIES.map((g) => (
                    <SelectItem key={g} value={g} className="font-mono text-sm">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>
      ) : null}
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

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm font-medium">
            {dataset.name || <span className="text-muted-foreground italic">未命名数据集</span>}
          </span>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {dataset.dimensions.length} 个维度
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

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="数据集名称">
            <Input
              value={dataset.name}
              onChange={(e) => set('name', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="orders"
            />
          </Field>
          <Field label="描述">
            <Input
              value={dataset.description}
              onChange={(e) => set('description', e.target.value)}
              className="h-8 text-sm"
              placeholder="订单事实表"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Database">
            <Input
              value={dataset.database}
              onChange={(e) => set('database', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="analytics"
            />
          </Field>
          <Field label="Schema">
            <Input
              value={dataset.schema}
              onChange={(e) => set('schema', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="dwd"
            />
          </Field>
          <Field label="Table">
            <Input
              value={dataset.table}
              onChange={(e) => set('table', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="fact_orders"
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">维度定义</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-primary hover:text-primary"
              onClick={() => set('dimensions', [...dataset.dimensions, newDimension()])}
            >
              <Plus className="size-3.5" />
              添加维度
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {dataset.dimensions.map((dim) => (
              <DimensionEditor
                key={dim.id}
                dim={dim}
                onChange={(next) =>
                  set(
                    'dimensions',
                    dataset.dimensions.map((d) => (d.id === next.id ? next : d)),
                  )
                }
                onRemove={() =>
                  set(
                    'dimensions',
                    dataset.dimensions.filter((d) => d.id !== dim.id),
                  )
                }
              />
            ))}
            {dataset.dimensions.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                暂无维度，点击「添加维度」开始定义
              </p>
            ) : null}
          </div>
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">数据集 / Datasets</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            映射物理表并定义维度（含时间维度与主键），构成语义模型的数据基础。
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 shrink-0"
          onClick={() => onChange([...datasets, newDataset()])}
        >
          <Plus className="size-3.5" />
          添加数据集
        </Button>
      </div>

      {datasets.map((ds) => (
        <DatasetCard
          key={ds.id}
          dataset={ds}
          onChange={(next) => onChange(datasets.map((d) => (d.id === next.id ? next : d)))}
          onRemove={() => onChange(datasets.filter((d) => d.id !== ds.id))}
        />
      ))}

      {datasets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Database className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">还没有数据集</p>
        </div>
      ) : null}
    </div>
  )
}
