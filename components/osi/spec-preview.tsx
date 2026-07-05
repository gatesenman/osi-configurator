'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  FileCode2,
} from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import type { SelKey, SpecLine } from '@/lib/osi-serialize'
import { OSI_VERSION, toJsonLines, toYamlLines } from '@/lib/osi-serialize'
import { validateModel } from '@/lib/osi-validate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Format = 'yaml' | 'json'

function highlightYamlLine(line: string) {
  if (line.trimStart().startsWith('#')) {
    return <span className="text-syntax-comment">{line}</span>
  }
  const m = line.match(/^(\s*(?:- )?)([\w.-]+)(:)(.*)$/)
  if (m) {
    const [, prefix, k, colon, rest] = m
    return (
      <span>
        {prefix}
        <span className="text-syntax-key">{k}</span>
        {colon}
        {renderYamlValue(rest)}
      </span>
    )
  }
  const listItem = line.match(/^(\s*- )(.*)$/)
  if (listItem) {
    return (
      <span>
        {listItem[1]}
        {renderYamlValue(listItem[2])}
      </span>
    )
  }
  return <span>{line}</span>
}

function renderYamlValue(raw: string) {
  const v = raw.trimStart()
  const pad = raw.slice(0, raw.length - v.length)
  if (v === '') return raw
  if (/^(true|false|null)$/.test(v) || /^-?\d+(\.\d+)?$/.test(v)) {
    return (
      <>
        {pad}
        <span className="text-syntax-number">{v}</span>
      </>
    )
  }
  return (
    <>
      {pad}
      <span className="text-syntax-string">{v}</span>
    </>
  )
}

function highlightJsonLine(line: string) {
  const parts: React.ReactNode[] = []
  const regex = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|(true|false|null)/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index))
    if (match[1] !== undefined) {
      if (match[2] !== undefined) {
        parts.push(
          <span key={`k${i}`} className="text-syntax-key">
            {match[1]}
          </span>,
          match[2],
        )
      } else {
        parts.push(
          <span key={`s${i}`} className="text-syntax-string">
            {match[1]}
          </span>,
        )
      }
    } else if (match[3] !== undefined || match[4] !== undefined) {
      parts.push(
        <span key={`n${i}`} className="text-syntax-number">
          {match[3] ?? match[4]}
        </span>,
      )
    }
    last = match.index + match[0].length
    i++
  }
  if (last < line.length) parts.push(line.slice(last))
  return <span>{parts}</span>
}

export function SpecPreview({
  model,
  selection,
  align,
  onSelect,
}: {
  model: OsiModel
  selection: SelKey | null
  /** 选择事件元数据：y = 触发源视口纵坐标（位置对齐用），n = 单调递增（同一选择重复触发也重新滚动） */
  align: { y: number | null; n: number }
  onSelect: (sel: SelKey | null, y?: number) => void
}) {
  const [format, setFormat] = useState<Format>('yaml')
  const [copied, setCopied] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const internalClick = useRef(false)

  const lines: SpecLine[] = useMemo(
    () => (format === 'yaml' ? toYamlLines(model) : toJsonLines(model)),
    [model, format],
  )
  const content = useMemo(() => lines.map((l) => l.text).join('\n').concat('\n'), [lines])
  const validation = useMemo(() => validateModel(model), [model])

  // 外部（左侧表单）选中时，滚动到对应行（精确优先，再按前缀匹配子属性行），
  // 并把该行对齐到触发元素所在的视口纵坐标，实现左右位置对齐
  useEffect(() => {
    if (internalClick.current) {
      internalClick.current = false
      return
    }
    const container = scrollRef.current
    if (!selection || !container) return
    let idx = lines.findIndex((l) => l.sel === selection)
    if (idx < 0) idx = lines.findIndex((l) => l.sel?.startsWith(`${selection}.`))
    if (idx < 0) return
    const el = container.querySelector(`[data-line="${idx}"]`)
    if (!el) return
    const cRect = container.getBoundingClientRect()
    // 触发源纵坐标在本容器可视范围内 → 对齐到同一高度；否则（移动端上下布局）居中
    const y =
      align.y !== null && align.y >= cRect.top && align.y <= cRect.bottom
        ? align.y
        : cRect.top + cRect.height / 2
    const rect = el.getBoundingClientRect()
    container.scrollTo({
      top: container.scrollTop + rect.top + rect.height / 2 - y,
      behavior: 'smooth',
    })
  }, [selection, align, lines])

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const blob = new Blob([content], {
      type: format === 'yaml' ? 'text/yaml' : 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name || 'osi-model'}.osi.${format === 'yaml' ? 'yaml' : 'json'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLineClick = (line: SpecLine, e: React.MouseEvent) => {
    if (!line.sel) return
    internalClick.current = true
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onSelect(line.sel, rect.top + rect.height / 2)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-xs text-muted-foreground">
            {model.name || 'osi-model'}.osi.{format}
          </span>
          <Badge variant="outline" className="text-[10px] text-success border-success/30">
            实时同步
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-1 flex rounded-md border border-border p-0.5" role="tablist" aria-label="输出格式">
            {(['yaml', 'json'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={format === f}
                onClick={() => setFormat(f)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase transition-colors ${
                  format === f
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={copy}
            aria-label="复制"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={download}
            aria-label="下载"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <pre className="p-4 font-mono text-xs leading-relaxed">
          <code>
            {lines.map((line, i) => {
              // 字段级高亮：选中实体时高亮整块，选中具体属性时只高亮对应行
              const active =
                line.sel !== undefined &&
                selection !== null &&
                (line.sel === selection || line.sel.startsWith(`${selection}.`))
              return (
                <div
                  key={i}
                  data-line={i}
                  onClick={(e) => handleLineClick(line, e)}
                  className={`flex rounded-sm ${
                    active ? 'bg-primary/10' : line.sel ? 'hover:bg-accent/60' : ''
                  } ${line.sel ? 'cursor-pointer' : ''}`}
                  title={line.sel ? '点击定位到左侧配置' : undefined}
                >
                  <span
                    className={`w-8 shrink-0 select-none pr-3 text-right ${
                      active ? 'text-primary' : 'text-syntax-comment/60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="whitespace-pre">
                    {format === 'yaml'
                      ? highlightYamlLine(line.text)
                      : highlightJsonLine(line.text)}
                  </span>
                </div>
              )
            })}
          </code>
        </pre>
      </div>

      {/* Schema 校验状态 */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setShowErrors(!showErrors)}
          disabled={validation.valid}
          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs ${
            validation.valid ? 'cursor-default text-success' : 'text-destructive hover:bg-accent/50'
          }`}
          aria-expanded={!validation.valid && showErrors}
        >
          {validation.valid ? (
            <>
              <CircleCheck className="size-3.5 shrink-0" />
              <span>官方 JSON Schema 校验通过</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                osi-schema.json · v{OSI_VERSION}
              </span>
            </>
          ) : (
            <>
              <CircleAlert className="size-3.5 shrink-0" />
              <span>{validation.errors.length} 处 Schema 校验错误</span>
              <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                osi-schema.json · v{OSI_VERSION}
                {showErrors ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
              </span>
            </>
          )}
        </button>
        {!validation.valid && showErrors ? (
          <div className="max-h-40 overflow-y-auto border-t border-border">
            {validation.errors.map((err, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (err.sel) {
                    internalClick.current = false
                    onSelect(err.sel)
                  }
                }}
                className="flex w-full items-start gap-2 px-4 py-1.5 text-left text-xs hover:bg-accent/50"
              >
                <CircleAlert className="mt-0.5 size-3 shrink-0 text-destructive" />
                <span className="min-w-0">
                  <span className="font-mono text-[10px] text-muted-foreground">{err.path}</span>
                  <span className="block text-foreground">{err.message}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <span>{lines.length} 行</span>
        <span>{model.datasets.length} datasets</span>
        <span>{model.datasets.reduce((n, d) => n + d.fields.length, 0)} fields</span>
        <span>{model.relationships.length} relationships</span>
        <span>{model.metrics.length} metrics</span>
      </div>
    </div>
  )
}
