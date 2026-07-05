'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Download, FileCode2 } from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import { toJson, toYaml } from '@/lib/osi-serialize'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Format = 'yaml' | 'json'

function highlightYamlLine(line: string, key: number) {
  if (line.trimStart().startsWith('#')) {
    return (
      <span key={key} className="text-syntax-comment">
        {line}
      </span>
    )
  }
  const m = line.match(/^(\s*(?:- )?)([\w.-]+)(:)(.*)$/)
  if (m) {
    const [, prefix, k, colon, rest] = m
    return (
      <span key={key}>
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
      <span key={key}>
        {listItem[1]}
        {renderYamlValue(listItem[2])}
      </span>
    )
  }
  return <span key={key}>{line}</span>
}

function renderYamlValue(raw: string) {
  const v = raw.trimStart()
  const pad = raw.slice(0, raw.length - v.length)
  if (v === '') return raw
  if (/^(true|false|null)$/.test(v)) {
    return (
      <>
        {pad}
        <span className="text-syntax-number">{v}</span>
      </>
    )
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) {
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

function highlightJsonLine(line: string, key: number) {
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
  return <span key={key}>{parts}</span>
}

export function SpecPreview({ model }: { model: OsiModel }) {
  const [format, setFormat] = useState<Format>('yaml')
  const [copied, setCopied] = useState(false)

  const yaml = useMemo(() => toYaml(model), [model])
  const json = useMemo(() => toJson(model), [model])
  const content = format === 'yaml' ? yaml : json
  const lines = useMemo(() => content.replace(/\n$/, '').split('\n'), [content])

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
    a.download = `${model.info.name || 'osi-model'}.osi.${format === 'yaml' ? 'yaml' : 'json'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-xs text-muted-foreground">
            {model.info.name || 'osi-model'}.osi.{format}
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

      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="p-4 font-mono text-xs leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 shrink-0 select-none pr-3 text-right text-syntax-comment/60">
                  {i + 1}
                </span>
                <span className="whitespace-pre">
                  {format === 'yaml' ? highlightYamlLine(line, i) : highlightJsonLine(line, i)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <span>{lines.length} 行</span>
        <span>{model.datasets.length} datasets</span>
        <span>{model.metrics.length} metrics</span>
        <span>{model.relationships.length} relationships</span>
      </div>
    </div>
  )
}
