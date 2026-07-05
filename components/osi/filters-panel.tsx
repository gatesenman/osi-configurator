'use client'

import { Filter, Plus, Trash2 } from 'lucide-react'
import type { OsiDataset, OsiFilter } from '@/lib/osi-types'
import { uid } from '@/lib/osi-types'
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

function FilterCard({
  filter,
  datasets,
  onChange,
  onRemove,
}: {
  filter: OsiFilter
  datasets: OsiDataset[]
  onChange: (next: OsiFilter) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiFilter>(key: K, value: OsiFilter[K]) =>
    onChange({ ...filter, [key]: value })

  return (
    <div className="rounded-lg border border-border bg-card" data-sel={`filter:${filter.id}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm font-medium">
            {filter.name || <span className="text-muted-foreground italic">未命名过滤器</span>}
          </span>
          {filter.label ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {filter.label}
            </Badge>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除过滤器"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="过滤器名称" hint="snake_case 命名">
            <Input
              value={filter.name}
              onChange={(e) => set('name', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="completed_orders"
            />
          </Field>
          <Field label="展示名称 / Label">
            <Input
              value={filter.label}
              onChange={(e) => set('label', e.target.value)}
              className="h-8 text-sm"
              placeholder="已完成订单"
            />
          </Field>
          <Field label="所属数据集">
            <Select value={filter.datasetId} onValueChange={(v) => set('datasetId', v)}>
              <SelectTrigger className="h-8 font-mono text-sm">
                <SelectValue placeholder="选择数据集" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id} className="font-mono text-sm">
                    {ds.name || '未命名数据集'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="过滤表达式 / Expr" hint="SQL WHERE 条件片段">
          <Input
            value={filter.expr}
            onChange={(e) => set('expr', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="order_status = 'completed'"
          />
        </Field>

        <Field label="描述">
          <Input
            value={filter.description}
            onChange={(e) => set('description', e.target.value)}
            className="h-8 text-sm"
            placeholder="仅统计状态为已完成的订单"
          />
        </Field>

        <Field label="同义词">
          <TagInput value={filter.synonyms} onChange={(v) => set('synonyms', v)} />
        </Field>
      </div>
    </div>
  )
}

export function FiltersPanel({
  filters,
  datasets,
  onChange,
}: {
  filters: OsiFilter[]
  datasets: OsiDataset[]
  onChange: (next: OsiFilter[]) => void
}) {
  const addFilter = () =>
    onChange([
      ...filters,
      {
        id: uid(),
        name: '',
        label: '',
        datasetId: datasets[0]?.id ?? '',
        expr: '',
        description: '',
        synonyms: [],
      },
    ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">命名过滤器 / Filters</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            定义可复用的查询过滤条件，供 BI 与 AI 查询引擎按名称引用。
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={addFilter}>
          <Plus className="size-3.5" />
          添加过滤器
        </Button>
      </div>

      {filters.map((f) => (
        <FilterCard
          key={f.id}
          filter={f}
          datasets={datasets}
          onChange={(next) => onChange(filters.map((x) => (x.id === next.id ? next : x)))}
          onRemove={() => onChange(filters.filter((x) => x.id !== f.id))}
        />
      ))}

      {filters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Filter className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">还没有命名过滤器</p>
        </div>
      ) : null}
    </div>
  )
}
