'use client'

import { ArrowRight, Link2, Plus, Trash2 } from 'lucide-react'
import type { OsiDataset, OsiRelationship } from '@/lib/osi-types'
import { emptyAiContext, uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, TagInput } from './field'
import { AiContextEditor, CustomExtensionsEditor } from './shared-editors'

function RelationshipCard({
  rel,
  datasets,
  onChange,
  onRemove,
}: {
  rel: OsiRelationship
  datasets: OsiDataset[]
  onChange: (next: OsiRelationship) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiRelationship>(key: K, value: OsiRelationship[K]) =>
    onChange({ ...rel, [key]: value })

  const dsName = (id: string) => datasets.find((d) => d.id === id)?.name || '—'

  return (
    <div
      className="overflow-hidden rounded-lg border border-border border-l-2 border-l-primary/60 bg-card"
      data-sel={`relationship:${rel.id}`}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <Link2 className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono font-medium">
            {rel.name || <span className="text-muted-foreground italic">未命名关系</span>}
          </span>
          <span className="hidden items-center gap-1 font-mono text-xs text-muted-foreground sm:flex">
            {dsName(rel.fromDatasetId)}
            <ArrowRight className="size-3" />
            {dsName(rel.toDatasetId)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除关系"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <Field label="name（必填）" hint="关系唯一标识" sel={`relationship:${rel.id}.name`}>
          <Input
            value={rel.name}
            onChange={(e) => set('name', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="orders_to_customers"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">from（必填，多方）</p>
            <Field label="数据集" sel={`relationship:${rel.id}.from`}>
              <Select value={rel.fromDatasetId ?? ''} onValueChange={(v) => set('fromDatasetId', v ?? '')}>
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
            <Field
              label="from_columns（必填）"
              hint="外键列，多列为复合键"
              sel={`relationship:${rel.id}.from_columns`}
            >
              <TagInput
                value={rel.fromColumns}
                onChange={(v) => set('fromColumns', v)}
                placeholder="customer_id，回车添加"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">to（必填，一方）</p>
            <Field label="数据集" sel={`relationship:${rel.id}.to`}>
              <Select value={rel.toDatasetId ?? ''} onValueChange={(v) => set('toDatasetId', v ?? '')}>
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
            <Field
              label="to_columns（必填）"
              hint="主/唯一键列，多列为复合键"
              sel={`relationship:${rel.id}.to_columns`}
            >
              <TagInput
                value={rel.toColumns}
                onChange={(v) => set('toColumns', v)}
                placeholder="customer_id，回车添加"
              />
            </Field>
          </div>
        </div>

        <AiContextEditor
          value={rel.aiContext}
          onChange={(v) => set('aiContext', v)}
          sel={`relationship:${rel.id}`}
        />
        <CustomExtensionsEditor
          value={rel.customExtensions}
          onChange={(v) => set('customExtensions', v)}
          sel={`relationship:${rel.id}`}
        />
      </div>
    </div>
  )
}

export function RelationshipsPanel({
  relationships,
  datasets,
  onChange,
}: {
  relationships: OsiRelationship[]
  datasets: OsiDataset[]
  onChange: (next: OsiRelationship[]) => void
}) {
  const addRel = () =>
    onChange([
      ...relationships,
      {
        id: uid(),
        name: '',
        fromDatasetId: datasets[0]?.id ?? '',
        toDatasetId: datasets[1]?.id ?? datasets[0]?.id ?? '',
        fromColumns: [],
        toColumns: [],
        aiContext: emptyAiContext(),
        customExtensions: [],
      },
    ])

  return (
    <div className="flex flex-col gap-4" data-sel="model.relationships">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">关系 / Relationships</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            name · from / to · from_columns / to_columns（支持复合键） · ai_context ·
            custom_extensions
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={addRel}>
          <Plus className="size-3.5" />
          添加关系
        </Button>
      </div>

      {relationships.map((r) => (
        <RelationshipCard
          key={r.id}
          rel={r}
          datasets={datasets}
          onChange={(next) => onChange(relationships.map((x) => (x.id === r.id ? next : x)))}
          onRemove={() => onChange(relationships.filter((x) => x.id !== r.id))}
        />
      ))}

      {relationships.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Link2 className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            暂无关系（relationships 为官方可选配置点）
          </p>
        </div>
      ) : null}
    </div>
  )
}
