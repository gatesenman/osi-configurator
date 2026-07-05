'use client'

import { useState } from 'react'
import { Database, FileText, Hexagon, Link2, RotateCcw, Sigma } from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import { defaultModel } from '@/lib/osi-defaults'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModelInfoPanel } from './model-info-panel'
import { DatasetsPanel } from './datasets-panel'
import { MetricsPanel } from './metrics-panel'
import { RelationshipsPanel } from './relationships-panel'
import { SpecPreview } from './spec-preview'

type Section = 'info' | 'datasets' | 'metrics' | 'relationships'

const SECTIONS: { id: Section; label: string; icon: typeof FileText }[] = [
  { id: 'info', label: '模型信息', icon: FileText },
  { id: 'datasets', label: '数据集', icon: Database },
  { id: 'metrics', label: '指标', icon: Sigma },
  { id: 'relationships', label: '关系', icon: Link2 },
]

export function OsiConfigurator() {
  const [model, setModel] = useState<OsiModel>(defaultModel)
  const [section, setSection] = useState<Section>('info')

  const counts: Record<Section, number | null> = {
    info: null,
    datasets: model.datasets.length,
    metrics: model.metrics.length,
    relationships: model.relationships.length,
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15">
            <Hexagon className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">OSI 配置器</h1>
            <p className="truncate text-xs text-muted-foreground">
              Open Semantic Interchange · 开放语义互操作标准
            </p>
          </div>
          <Badge variant="outline" className="hidden font-mono text-[10px] text-muted-foreground sm:inline-flex">
            spec v0.1
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-transparent"
          onClick={() => setModel(defaultModel)}
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">重置示例</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 左侧导航 */}
        <nav
          aria-label="配置分区"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 lg:w-48 lg:flex-col lg:border-b-0 lg:border-r lg:p-3"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                section === id
                  ? 'bg-accent text-foreground font-medium'
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
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:min-w-0">
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
          </div>
        </main>

        {/* 右侧实时预览 */}
        <aside
          aria-label="规范预览"
          className="h-96 shrink-0 border-t border-border lg:h-auto lg:w-[42%] lg:max-w-2xl lg:border-l lg:border-t-0"
        >
          <SpecPreview model={model} />
        </aside>
      </div>
    </div>
  )
}
