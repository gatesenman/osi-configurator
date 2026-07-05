'use client'

import { BadgeCheck, Plus, Trash2 } from 'lucide-react'
import type { OsiVerifiedQuery } from '@/lib/osi-types'
import { uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Field } from './field'

function QueryCard({
  query,
  onChange,
  onRemove,
}: {
  query: OsiVerifiedQuery
  onChange: (next: OsiVerifiedQuery) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiVerifiedQuery>(key: K, value: OsiVerifiedQuery[K]) =>
    onChange({ ...query, [key]: value })

  return (
    <div className="rounded-lg border border-border bg-card" data-sel={`query:${query.id}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <BadgeCheck className="size-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm font-medium">
            {query.name || <span className="text-muted-foreground italic">未命名查询</span>}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除验证查询"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <Field label="查询名称" hint="snake_case 命名">
          <Input
            value={query.name}
            onChange={(e) => set('name', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="revenue_by_region"
          />
        </Field>

        <Field label="自然语言问题" hint="用户可能提出的业务问题">
          <Input
            value={query.question}
            onChange={(e) => set('question', e.target.value)}
            className="h-8 text-sm"
            placeholder="今年各销售大区的营收分别是多少？"
          />
        </Field>

        <Field label="对应 SQL" hint="经人工验证的标准答案 SQL">
          <Textarea
            value={query.sql}
            onChange={(e) => set('sql', e.target.value)}
            className="min-h-28 font-mono text-sm leading-relaxed"
            placeholder="SELECT ..."
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="验证人">
            <Input
              value={query.verifiedBy}
              onChange={(e) => set('verifiedBy', e.target.value)}
              className="h-8 text-sm"
              placeholder="team@example.com"
            />
          </Field>
          <Field label="验证日期">
            <Input
              type="date"
              value={query.verifiedAt}
              onChange={(e) => set('verifiedAt', e.target.value)}
              className="h-8 font-mono text-sm"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5">
          <div>
            <p className="text-sm">用作引导问题</p>
            <p className="text-xs text-muted-foreground">在 AI 对话入口作为示例问题展示</p>
          </div>
          <Switch
            checked={query.useAsOnboarding}
            onCheckedChange={(v) => set('useAsOnboarding', v)}
            aria-label="用作引导问题"
          />
        </div>
      </div>
    </div>
  )
}

export function QueriesPanel({
  queries,
  onChange,
}: {
  queries: OsiVerifiedQuery[]
  onChange: (next: OsiVerifiedQuery[]) => void
}) {
  const addQuery = () =>
    onChange([
      ...queries,
      {
        id: uid(),
        name: '',
        question: '',
        sql: '',
        verifiedBy: '',
        verifiedAt: '',
        useAsOnboarding: false,
      },
    ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">验证查询 / Verified Queries</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            记录经人工确认的「自然语言问题 → SQL」映射，提升 AI 查询准确率。
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={addQuery}>
          <Plus className="size-3.5" />
          添加查询
        </Button>
      </div>

      {queries.map((q) => (
        <QueryCard
          key={q.id}
          query={q}
          onChange={(next) => onChange(queries.map((x) => (x.id === next.id ? next : x)))}
          onRemove={() => onChange(queries.filter((x) => x.id !== q.id))}
        />
      ))}

      {queries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <BadgeCheck className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">还没有验证查询</p>
        </div>
      ) : null}
    </div>
  )
}
