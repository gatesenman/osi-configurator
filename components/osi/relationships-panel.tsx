'use client'

import { ArrowRight, Link2, Plus, Trash2 } from 'lucide-react'
import type { OsiDataset, OsiRelationship, RelationshipType } from '@/lib/osi-types'
import { uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field } from './field'

const REL_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'many_to_one', label: 'many_to_one（多对一）' },
  { value: 'one_to_one', label: 'one_to_one（一对一）' },
  { value: 'one_to_many', label: 'one_to_many（一对多）' },
]

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
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <Link2 className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono font-medium">{dsName(rel.fromDatasetId)}</span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono font-medium">{dsName(rel.toDatasetId)}</span>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="关系名称">
            <Input
              value={rel.name}
              onChange={(e) => set('name', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="orders_to_customers"
            />
          </Field>
          <Field label="关系类型">
            <Select value={rel.type} onValueChange={(v) => set('type', v as RelationshipType)}>
              <SelectTrigger className="h-8 font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="font-mono text-sm">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">From（源）</p>
            <Field label="数据集">
              <Select value={rel.fromDatasetId} onValueChange={(v) => set('fromDatasetId', v)}>
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
            <Field label="关联字段">
              <Input
                value={rel.fromColumn}
                onChange={(e) => set('fromColumn', e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder="customer_id"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">To（目标）</p>
            <Field label="数据集">
              <Select value={rel.toDatasetId} onValueChange={(v) => set('toDatasetId', v)}>
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
            <Field label="关联字段">
              <Input
                value={rel.toColumn}
                onChange={(e) => set('toColumn', e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder="customer_id"
              />
            </Field>
          </div>
        </div>
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
        fromColumn: '',
        toDatasetId: datasets[1]?.id ?? datasets[0]?.id ?? '',
        toColumn: '',
        type: 'many_to_one',
      },
    ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">关系 / Relationships</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            定义数据集之间的连接关系，供查询引擎自动生成 JOIN。
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
          onChange={(next) => onChange(relationships.map((x) => (x.id === next.id ? next : x)))}
          onRemove={() => onChange(relationships.filter((x) => x.id !== r.id))}
        />
      ))}

      {relationships.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Link2 className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">还没有关系定义</p>
        </div>
      ) : null}
    </div>
  )
}
