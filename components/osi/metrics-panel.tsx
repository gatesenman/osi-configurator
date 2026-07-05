'use client'

import { Plus, Sigma, Trash2 } from 'lucide-react'
import type { OsiMetric } from '@/lib/osi-types'
import { emptyAiContext, uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Field } from './field'
import {
  AiContextEditor,
  CustomExtensionsEditor,
  DialectExpressionsEditor,
} from './shared-editors'

function MetricCard({
  metric,
  onChange,
  onRemove,
}: {
  metric: OsiMetric
  onChange: (next: OsiMetric) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiMetric>(key: K, value: OsiMetric[K]) =>
    onChange({ ...metric, [key]: value })

  return (
    <div
      className="overflow-hidden rounded-lg border border-border border-l-2 border-l-primary/60 bg-card"
      data-sel={`metric:${metric.id}`}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sigma className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm font-medium">
            {metric.name || <span className="text-muted-foreground italic">未命名指标</span>}
          </span>
          {metric.dialects.length > 1 ? (
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
              {metric.dialects.length} dialects
            </Badge>
          ) : null}
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
        <Field label="name（必填）" hint="指标唯一标识" sel={`metric:${metric.id}.name`}>
          <Input
            value={metric.name}
            onChange={(e) => set('name', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="total_sales"
          />
        </Field>

        <Field
          label="expression（必填）"
          hint="完整聚合表达式，如 SUM(order_amount)"
          sel={`metric:${metric.id}.expression`}
        >
          <DialectExpressionsEditor
            value={metric.dialects}
            onChange={(dialects) => set('dialects', dialects)}
            placeholder="SUM(order_amount)"
          />
        </Field>

        <Field
          label="description"
          hint="指标度量内容的业务描述"
          sel={`metric:${metric.id}.description`}
        >
          <Input
            value={metric.description}
            onChange={(e) => set('description', e.target.value)}
            className="h-8 text-sm"
            placeholder="已完成订单的销售总金额"
          />
        </Field>

        <AiContextEditor
          value={metric.aiContext}
          onChange={(v) => set('aiContext', v)}
          sel={`metric:${metric.id}`}
        />
        <CustomExtensionsEditor
          value={metric.customExtensions}
          onChange={(v) => set('customExtensions', v)}
          sel={`metric:${metric.id}`}
        />
      </div>
    </div>
  )
}

export function MetricsPanel({
  metrics,
  onChange,
}: {
  metrics: OsiMetric[]
  onChange: (next: OsiMetric[]) => void
}) {
  const addMetric = () =>
    onChange([
      ...metrics,
      {
        id: uid(),
        name: '',
        dialects: [{ id: uid(), dialect: 'ANSI_SQL', expression: '' }],
        description: '',
        aiContext: emptyAiContext(),
        customExtensions: [],
      },
    ])

  return (
    <div className="flex flex-col gap-4" data-sel="model.metrics">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">指标 / Metrics</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            name · expression（多方言） · description · ai_context · custom_extensions
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
          onChange={(next) => onChange(metrics.map((x) => (x.id === m.id ? next : x)))}
          onRemove={() => onChange(metrics.filter((x) => x.id !== m.id))}
        />
      ))}

      {metrics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Sigma className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            暂无指标（metrics 为官方可选配置点）
          </p>
        </div>
      ) : null}
    </div>
  )
}
