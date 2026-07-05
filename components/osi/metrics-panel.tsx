'use client'

import { Plus, Sigma, Trash2 } from 'lucide-react'
import type { AggregationType, OsiDataset, OsiMetric } from '@/lib/osi-types'
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

const AGGREGATIONS: AggregationType[] = [
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'median',
]

function MetricCard({
  metric,
  datasets,
  onChange,
  onRemove,
}: {
  metric: OsiMetric
  datasets: OsiDataset[]
  onChange: (next: OsiMetric) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiMetric>(key: K, value: OsiMetric[K]) =>
    onChange({ ...metric, [key]: value })

  return (
    <div className="rounded-lg border border-border bg-card" data-sel={`metric:${metric.id}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sigma className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm font-medium">
            {metric.name || <span className="text-muted-foreground italic">未命名指标</span>}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
            {metric.agg}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除指标"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="指标名称" hint="snake_case 命名">
            <Input
              value={metric.name}
              onChange={(e) => set('name', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="total_revenue"
            />
          </Field>
          <Field label="展示名称">
            <Input
              value={metric.label}
              onChange={(e) => set('label', e.target.value)}
              className="h-8 text-sm"
              placeholder="总营收"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="所属数据集">
            <Select value={metric.datasetId} onValueChange={(v) => set('datasetId', v)}>
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
          <Field label="聚合方式">
            <Select value={metric.agg} onValueChange={(v) => set('agg', v as AggregationType)}>
              <SelectTrigger className="h-8 font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGGREGATIONS.map((a) => (
                  <SelectItem key={a} value={a} className="font-mono text-sm">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="数值格式">
            <Input
              value={metric.format}
              onChange={(e) => set('format', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="#,##0.00"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="SQL 表达式 / 字段">
            <Input
              value={metric.expr}
              onChange={(e) => set('expr', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="order_amount"
            />
          </Field>
          <Field label="单位 / Unit">
            <Input
              value={metric.unit}
              onChange={(e) => set('unit', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="CNY"
            />
          </Field>
        </div>

        <Field label="过滤条件 / Filter" hint="可选的 WHERE 条件，限定指标统计口径">
          <Input
            value={metric.filterExpr}
            onChange={(e) => set('filterExpr', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="order_status = 'completed'"
          />
        </Field>

        <Field label="口径描述" hint="明确统计口径，避免歧义">
          <Input
            value={metric.description}
            onChange={(e) => set('description', e.target.value)}
            className="h-8 text-sm"
            placeholder="已完成订单的销售总金额（不含税）"
          />
        </Field>

        <Field label="同义词">
          <TagInput value={metric.synonyms} onChange={(v) => set('synonyms', v)} />
        </Field>

        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5">
          <div>
            <p className="text-sm">认证指标</p>
            <p className="text-xs text-muted-foreground">标记为治理团队认证的官方口径</p>
          </div>
          <Switch
            checked={metric.certified}
            onCheckedChange={(v) => set('certified', v)}
            aria-label="认证指标"
          />
        </div>
      </div>
    </div>
  )
}

export function MetricsPanel({
  metrics,
  datasets,
  onChange,
}: {
  metrics: OsiMetric[]
  datasets: OsiDataset[]
  onChange: (next: OsiMetric[]) => void
}) {
  const addMetric = () =>
    onChange([
      ...metrics,
      {
        id: uid(),
        name: '',
        label: '',
        datasetId: datasets[0]?.id ?? '',
        expr: '',
        agg: 'sum',
        filterExpr: '',
        format: '',
        unit: '',
        description: '',
        synonyms: [],
        certified: false,
      },
    ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">指标 / Metrics</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            定义统一的业务指标口径：聚合方式、表达式、格式与同义词。
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={addMetric}>
          <Plus className="size-3.5" />
          添加指标
        </Button>
      </div>

      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          metric={m}
          datasets={datasets}
          onChange={(next) => onChange(metrics.map((x) => (x.id === next.id ? next : x)))}
          onRemove={() => onChange(metrics.filter((x) => x.id !== m.id))}
        />
      ))}

      {metrics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Sigma className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">还没有指标定义</p>
        </div>
      ) : null}
    </div>
  )
}
