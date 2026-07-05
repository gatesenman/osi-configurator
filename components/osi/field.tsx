'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function Field({
  label,
  hint,
  sel,
  children,
}: {
  label: string
  hint?: string
  /** 选择键：与右侧规范预览的对应行双向高亮联动 */
  sel?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md" data-sel={sel}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground/70 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  )
}

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1 font-mono text-xs">
              {tag}
              <button
                type="button"
                aria-label={`删除 ${tag}`}
                className="rounded-sm p-0.5 hover:bg-accent hover:text-foreground text-muted-foreground"
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        value={draft}
        placeholder={placeholder ?? '输入后按回车添加'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
        className="h-8 text-sm"
      />
    </div>
  )
}
