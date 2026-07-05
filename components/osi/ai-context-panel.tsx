'use client'

import { BookOpen, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { OsiGlossaryTerm } from '@/lib/osi-types'
import { uid } from '@/lib/osi-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, TagInput } from './field'

function GlossaryCard({
  term,
  onChange,
  onRemove,
}: {
  term: OsiGlossaryTerm
  onChange: (next: OsiGlossaryTerm) => void
  onRemove: () => void
}) {
  const set = <K extends keyof OsiGlossaryTerm>(key: K, value: OsiGlossaryTerm[K]) =>
    onChange({ ...term, [key]: value })

  return (
    <div className="rounded-md border border-border bg-card p-4" data-sel={`glossary:${term.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="术语 / Term">
            <Input
              value={term.term}
              onChange={(e) => set('term', e.target.value)}
              className="h-8 font-mono text-sm"
              placeholder="GMV"
            />
          </Field>
          <Field label="同义词">
            <TagInput value={term.synonyms} onChange={(v) => set('synonyms', v)} />
          </Field>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除术语"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="mt-3">
        <Field label="定义 / Definition">
          <Input
            value={term.definition}
            onChange={(e) => set('definition', e.target.value)}
            className="h-8 text-sm"
            placeholder="商品交易总额，口径等同于 total_revenue"
          />
        </Field>
      </div>
    </div>
  )
}

export function AiContextPanel({
  glossary,
  customInstructions,
  onGlossaryChange,
  onInstructionsChange,
}: {
  glossary: OsiGlossaryTerm[]
  customInstructions: string
  onGlossaryChange: (next: OsiGlossaryTerm[]) => void
  onInstructionsChange: (next: string) => void
}) {
  const addTerm = () =>
    onGlossaryChange([...glossary, { id: uid(), term: '', definition: '', synonyms: [] }])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-medium">AI 上下文 / AI Context</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          为 AI / NL2SQL 引擎提供自定义指令与业务词汇表，统一语义理解。
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg" data-sel="ai">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            自定义指令 / Custom Instructions
          </p>
        </div>
        <Field
          label="指令内容"
          hint="面向 AI 的全局约定：默认口径、格式要求、安全提示等"
        >
          <Textarea
            value={customInstructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            className="min-h-28 text-sm leading-relaxed"
            placeholder="金额类指标默认以人民币展示，保留两位小数…"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">业务词汇表 / Glossary</p>
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={addTerm}>
            <Plus className="size-3.5" />
            添加术语
          </Button>
        </div>

        {glossary.map((t) => (
          <GlossaryCard
            key={t.id}
            term={t}
            onChange={(next) =>
              onGlossaryChange(glossary.map((x) => (x.id === next.id ? next : x)))
            }
            onRemove={() => onGlossaryChange(glossary.filter((x) => x.id !== t.id))}
          />
        ))}

        {glossary.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <BookOpen className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">还没有词汇表条目</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
