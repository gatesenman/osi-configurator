'use client'

import { useEffect, useRef, useState } from 'react'
import { Database, FileText, Hexagon, Link2, RotateCcw, Sigma } from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import type { SelKey } from '@/lib/osi-serialize'
import { OSI_VERSION } from '@/lib/osi-serialize'
import { defaultModel } from '@/lib/osi-defaults'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModelInfoPanel } from './model-info-panel'
import { DatasetsPanel } from './datasets-panel'
import { MetricsPanel } from './metrics-panel'
import { RelationshipsPanel } from './relationships-panel'
import { SpecPreview } from './spec-preview'

type Section = 'model' | 'datasets' | 'relationships' | 'metrics'

const SECTIONS: { id: Section; label: string; icon: typeof FileText }[] = [
  { id: 'model', label: '模型', icon: FileText },
  { id: 'datasets', label: '数据集', icon: Database },
  { id: 'relationships', label: '关系', icon: Link2 },
  { id: 'metrics', label: '指标', icon: Sigma },
]

/** 选择键前缀 → 配置分区（字段级键形如 dataset:d1.source / model.datasets） */
function sectionForSel(sel: SelKey): Section {
  if (sel.startsWith('model.datasets')) return 'datasets'
  if (sel.startsWith('model.relationships')) return 'relationships'
  if (sel.startsWith('model.metrics')) return 'metrics'
  const prefix = sel.split(':')[0]
  switch (prefix) {
    case 'dataset':
    case 'field':
      return 'datasets'
    case 'metric':
      return 'metrics'
    case 'relationship':
      return 'relationships'
    default:
      return 'model'
  }
}

/**
 * 逐级回退定位：先精确匹配 data-sel，找不到则逐段去掉尾部 `.属性`
 * （如 field:f1.expression.dialects → field:f1.expression → field:f1）
 */
function findSelTarget(root: HTMLElement, sel: SelKey): Element | null {
  let key = sel
  for (;;) {
    const el = root.querySelector(`[data-sel="${CSS.escape(key)}"]`)
    if (el) return el
    const dot = key.lastIndexOf('.')
    if (dot < 0) return null
    key = key.slice(0, dot)
  }
}

export function OsiConfigurator() {
  const [model, setModel] = useState<OsiModel>(defaultModel)
  const [section, setSection] = useState<Section>('model')
  const [selection, setSelection] = useState<SelKey | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const selectionSource = useRef<'form' | 'preview'>('form')

  /** 从右侧预览（YAML/JSON 行或校验错误）选中实体 → 切换分区并定位表单 */
  const handlePreviewSelect = (sel: SelKey | null) => {
    selectionSource.current = 'preview'
    setSelection(sel)
    if (sel) setSection(sectionForSel(sel))
  }

  /** 左侧表单点击实体卡片 → 高亮右侧对应 YAML/JSON 行 */
  const handleFormClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-sel]')
    if (!el) return
    const sel = el.getAttribute('data-sel')
    if (sel) {
      selectionSource.current = 'form'
      setSelection(sel)
    }
  }

  // 选中变化时：高亮左侧表单对应输入项（字段级，逐级回退）；来自预览的选择需滚动定位
  useEffect(() => {
    const root = mainRef.current
    if (!root) return
    const clear = () => {
      for (const el of root.querySelectorAll('.sel-active')) {
        el.classList.remove('sel-active')
      }
    }
    clear()
    if (!selection) return

    const highlight = (el: Element) => {
      clear()
      el.classList.add('sel-active')
      if (selectionSource.current === 'preview') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    const target = findSelTarget(root, selection)
    if (!target) return
    // 通知折叠容器（如字段卡）展开自身
    target.dispatchEvent(new Event('osi-reveal', { bubbles: true }))
    highlight(target)
    // 展开渲染完成后重新精确定位到具体输入项
    const timer = setTimeout(() => {
      const precise = findSelTarget(root, selection)
      if (precise && precise !== target) highlight(precise)
    }, 80)
    return () => clearTimeout(timer)
  }, [selection, section, model])

  const counts: Record<Section, number | null> = {
    model: null,
    datasets: model.datasets.length,
    relationships: model.relationships.length,
    metrics: model.metrics.length,
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Hexagon className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">OSI 配置器</h1>
            <p className="truncate text-xs text-muted-foreground">
              Open Semantic Interchange · 开放语义互操作标准
            </p>
          </div>
          <Badge
            variant="outline"
            className="hidden font-mono text-[10px] text-muted-foreground sm:inline-flex"
          >
            spec v{OSI_VERSION}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-transparent"
          onClick={() => {
            setModel(defaultModel)
            setSelection(null)
          }}
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">重置示例</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 左侧导航 */}
        <nav
          aria-label="配置分区"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card p-2 lg:w-44 lg:flex-col lg:border-b-0 lg:border-r lg:p-3"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                section === id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
              {counts[id] !== null ? (
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {counts[id]}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* 中间配置区 */}
        <main
          ref={mainRef}
          onClickCapture={handleFormClick}
          className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:min-w-0"
        >
          <div className="mx-auto max-w-2xl">
            {section === 'model' ? <ModelInfoPanel model={model} onChange={setModel} /> : null}
            {section === 'datasets' ? (
              <DatasetsPanel
                datasets={model.datasets}
                onChange={(datasets) => setModel({ ...model, datasets })}
              />
            ) : null}
            {section === 'relationships' ? (
              <RelationshipsPanel
                relationships={model.relationships}
                datasets={model.datasets}
                onChange={(relationships) => setModel({ ...model, relationships })}
              />
            ) : null}
            {section === 'metrics' ? (
              <MetricsPanel
                metrics={model.metrics}
                onChange={(metrics) => setModel({ ...model, metrics })}
              />
            ) : null}
          </div>
        </main>

        {/* 右侧规范预览 */}
        <aside className="min-h-64 shrink-0 border-t border-border lg:min-h-0 lg:w-[44%] lg:max-w-2xl lg:border-t-0 lg:border-l">
          <SpecPreview model={model} selection={selection} onSelect={handlePreviewSelect} />
        </aside>
      </div>
    </div>
  )
}
