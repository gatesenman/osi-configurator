'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Database,
  FileText,
  Filter,
  Hexagon,
  Link2,
  RotateCcw,
  Sigma,
  Sparkles,
} from 'lucide-react'
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
import { FiltersPanel } from './filters-panel'
import { QueriesPanel } from './queries-panel'
import { AiContextPanel } from './ai-context-panel'
import { SpecPreview } from './spec-preview'

type Section =
  | 'info'
  | 'datasets'
  | 'metrics'
  | 'relationships'
  | 'filters'
  | 'queries'
  | 'ai'

const SECTIONS: { id: Section; label: string; icon: typeof FileText }[] = [
  { id: 'info', label: '模型信息', icon: FileText },
  { id: 'datasets', label: '数据集', icon: Database },
  { id: 'metrics', label: '指标', icon: Sigma },
  { id: 'relationships', label: '关系', icon: Link2 },
  { id: 'filters', label: '过滤器', icon: Filter },
  { id: 'queries', label: '验证查询', icon: BadgeCheck },
  { id: 'ai', label: 'AI 上下文', icon: Sparkles },
]

/** 选择键前缀 → 配置分区 */
function sectionForSel(sel: SelKey): Section {
  if (sel === 'info') return 'info'
  if (sel === 'ai') return 'ai'
  const prefix = sel.split(':')[0]
  switch (prefix) {
    case 'dataset':
      return 'datasets'
    case 'metric':
      return 'metrics'
    case 'relationship':
      return 'relationships'
    case 'filter':
      return 'filters'
    case 'query':
      return 'queries'
    case 'glossary':
      return 'ai'
    default:
      return 'info'
  }
}

export function OsiConfigurator() {
  const [model, setModel] = useState<OsiModel>(defaultModel)
  const [section, setSection] = useState<Section>('info')
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

  // 选中变化时：高亮左侧表单对应卡片；来自预览的选择需滚动定位
  useEffect(() => {
    const root = mainRef.current
    if (!root) return
    for (const el of root.querySelectorAll('.sel-active')) {
      el.classList.remove('sel-active')
    }
    if (!selection) return
    const target = root.querySelector(`[data-sel="${CSS.escape(selection)}"]`)
    if (!target) return
    target.classList.add('sel-active')
    if (selectionSource.current === 'preview') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selection, section, model])

  const counts: Record<Section, number | null> = {
    info: null,
    datasets: model.datasets.length,
    metrics: model.metrics.length,
    relationships: model.relationships.length,
    filters: model.filters.length,
    queries: model.verifiedQueries.length,
    ai: model.glossary.length,
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
          <Badge variant="outline" className="hidden font-mono text-[10px] text-muted-foreground sm:inline-flex">
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
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card p-2 lg:w-48 lg:flex-col lg:border-b-0 lg:border-r lg:p-3"
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
            {section === 'info' ? (
              <ModelInfoPanel
                info={model.info}
                onChange={(info) => setModel({ ...model, info })}
              />
            ) : null}
            {section === 'datasets' ? (
              <DatasetsPanel
                datasets={model.datasets}
                onChange={(datasets) => setModel({ ...model, datasets })}
              />
            ) : null}
            {section === 'metrics' ? (
              <MetricsPanel
                metrics={model.metrics}
                datasets={model.datasets}
                onChange={(metrics) => setModel({ ...model, metrics })}
              />
            ) : null}
            {section === 'relationships' ? (
              <RelationshipsPanel
                relationships={model.relationships}
                datasets={model.datasets}
                onChange={(relationships) => setModel({ ...model, relationships })}
              />
            ) : null}
            {section === 'filters' ? (
              <FiltersPanel
                filters={model.filters}
                datasets={model.datasets}
                onChange={(filters) => setModel({ ...model, filters })}
              />
            ) : null}
            {section === 'queries' ? (
              <QueriesPanel
                queries={model.verifiedQueries}
                onChange={(verifiedQueries) => setModel({ ...model, verifiedQueries })}
              />
            ) : null}
            {section === 'ai' ? (
              <AiContextPanel
                glossary={model.glossary}
                customInstructions={model.customInstructions}
                onGlossaryChange={(glossary) => setModel({ ...model, glossary })}
                onInstructionsChange={(customInstructions) =>
                  setModel({ ...model, customInstructions })
                }
              />
            ) : null}
          </div>
        </main>

        {/* 右侧实时预览 */}
        <aside
          aria-label="规范预览"
          className="h-96 shrink-0 border-t border-border lg:h-auto lg:w-[42%] lg:max-w-2xl lg:border-l lg:border-t-0"
        >
          <SpecPreview model={model} selection={selection} onSelect={handlePreviewSelect} />
        </aside>
      </div>
    </div>
  )
}
