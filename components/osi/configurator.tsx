'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Database,
  FileText,
  Hexagon,
  Link2,
  Plus,
  RotateCcw,
  Settings,
  Sigma,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import type { SelKey } from '@/lib/osi-serialize'
import { OSI_VERSION } from '@/lib/osi-serialize'
import { importSpec } from '@/lib/osi-import'
import type { AppSettings } from '@/lib/osi-settings'
import { applyTheme, loadAppSettings, saveAppSettings } from '@/lib/osi-settings'
import { defaultModel, emptyModel } from '@/lib/osi-defaults'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModelInfoPanel } from './model-info-panel'
import { DatasetsPanel } from './datasets-panel'
import { MetricsPanel } from './metrics-panel'
import { RelationshipsPanel } from './relationships-panel'
import { SpecPreview } from './spec-preview'
import { AiPanel } from './ai-panel'
import { SettingsDialog } from './settings-dialog'

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
  /** 官方 semantic_model 为数组：支持一个文件包含多个语义模型 */
  const [models, setModels] = useState<OsiModel[]>([defaultModel])
  const [activeIdx, setActiveIdx] = useState(0)
  const model = models[activeIdx]
  /** 更新当前激活的模型 */
  const setModel = (m: OsiModel) => {
    setModels((prev) => prev.map((x, i) => (i === activeIdx ? m : x)))
  }
  const [section, setSection] = useState<Section>('model')
  const [selection, setSelection] = useState<SelKey | null>(null)
  /** 每次选择的事件元数据：y = 触发源在视口中的纵坐标（用于两侧位置对齐），n = 单调递增（同一实体重复点击也重新滚动） */
  const [selEvent, setSelEvent] = useState<{ y: number | null; n: number }>({ y: null, n: 0 })
  const [importError, setImportError] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'provider'>('general')
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings)
  const mainRef = useRef<HTMLElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const selectionSource = useRef<'form' | 'preview'>('form')

  // 应用主题；跟随系统时监听系统偏好变化
  useEffect(() => {
    applyTheme(appSettings.theme)
    if (appSettings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [appSettings.theme])

  const updateAppSettings = (s: AppSettings) => {
    setAppSettings(s)
    saveAppSettings(s)
  }

  /** 从右侧预览（YAML/JSON 行或校验错误）选中实体 → 切换分区并定位表单（对齐到被点行的视口位置） */
  const handlePreviewSelect = (sel: SelKey | null, y?: number) => {
    selectionSource.current = 'preview'
    setSelection(sel)
    setSelEvent((p) => ({ y: y ?? null, n: p.n + 1 }))
    if (sel) setSection(sectionForSel(sel))
  }

  /** 左侧表单交互 → 高亮右侧对应行并对齐到触发元素的视口位置 */
  const selectFromForm = (target: HTMLElement) => {
    const el = target.closest('[data-sel]')
    if (!el) return false
    const sel = el.getAttribute('data-sel')
    if (!sel) return false
    const rect = el.getBoundingClientRect()
    selectionSource.current = 'form'
    setSelection(sel)
    setSelEvent((p) => ({ y: rect.top + Math.min(rect.height, 56) / 2, n: p.n + 1 }))
    return true
  }

  const handleFormClick = (e: React.MouseEvent) => {
    selectFromForm(e.target as HTMLElement)
  }

  /** 输入项获得焦点 → 自动联动（Tab 键盘导航同样生效） */
  const handleFormFocus = (e: React.FocusEvent) => {
    const el = (e.target as HTMLElement).closest('[data-sel]')
    if (el?.getAttribute('data-sel') === selection) return
    selectFromForm(e.target as HTMLElement)
  }

  /** 导入 OSI 规范文件（YAML / JSON）：完整保留文件中的全部语义模型 */
  const handleImportFile = async (file: File) => {
    const text = await file.text()
    const result = importSpec(text)
    if (result.ok && result.models && result.models.length > 0) {
      setModels(result.models)
      setActiveIdx(0)
      setSelection(null)
      setSection('model')
      setImportError(null)
    } else {
      setImportError(result.error ?? '导入失败')
    }
  }

  /** 切换激活模型 */
  const switchModel = (idx: number) => {
    if (idx === activeIdx) return
    setActiveIdx(idx)
    setSelection(null)
    setSection('model')
  }

  /** 新增空白模型并切换过去 */
  const addModel = () => {
    setModels((prev) => [...prev, emptyModel(`semantic_model_${prev.length + 1}`)])
    setActiveIdx(models.length)
    setSelection(null)
    setSection('model')
  }

  /** 删除模型（至少保留一个） */
  const removeModel = (idx: number) => {
    if (models.length <= 1) return
    setModels((prev) => prev.filter((_, i) => i !== idx))
    setActiveIdx((prev) => (idx < prev ? prev - 1 : Math.min(prev, models.length - 2)))
    setSelection(null)
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

    /** 将元素锚点滚动到与触发源相同的视口纵坐标（源坐标不在本容器可视范围内则居中） */
    const alignScroll = (el: Element) => {
      const cRect = root.getBoundingClientRect()
      const y =
        selEvent.y !== null && selEvent.y >= cRect.top && selEvent.y <= cRect.bottom
          ? selEvent.y
          : cRect.top + cRect.height / 2
      const rect = el.getBoundingClientRect()
      const anchor = rect.top + Math.min(rect.height, 56) / 2
      root.scrollTo({ top: root.scrollTop + anchor - y, behavior: 'smooth' })
    }

    const highlight = (el: Element) => {
      clear()
      el.classList.add('sel-active')
      if (selectionSource.current === 'preview' && appSettings.linkScroll) alignScroll(el)
    }

    const target = findSelTarget(root, selection)
    if (!target) return
    // 通知折叠容器（如字段卡）展开自身，事件冒泡覆盖所有祖先
    if (appSettings.autoExpand) {
      target.dispatchEvent(new Event('osi-reveal', { bubbles: true }))
    }
    highlight(target)
    // 展开渲染是异步的：轮询重试，直到找到精确的输入项再重新对齐
    let attempts = 0
    const timer = setInterval(() => {
      attempts++
      const precise = findSelTarget(root, selection)
      if (precise && precise !== target) {
        precise.dispatchEvent(new Event('osi-reveal', { bubbles: true }))
        highlight(precise)
        clearInterval(timer)
      } else if (attempts >= 6) {
        // 展开完成后目标仍是自身（如实体根卡片）：补一次对齐，修正展开导致的位移
        if (precise && selectionSource.current === 'preview' && appSettings.linkScroll) {
          alignScroll(precise)
        }
        clearInterval(timer)
      }
    }, 90)
    return () => clearInterval(timer)
  }, [selection, selEvent, section, model, appSettings.linkScroll, appSettings.autoExpand])

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
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".yaml,.yml,.json,.osi"
            className="sr-only"
            aria-label="选择 OSI 规范文件"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setAiOpen(true)}>
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">AI 生成</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-transparent"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">导入</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-transparent"
            onClick={() => {
              setModels([defaultModel])
              setActiveIdx(0)
              setSelection(null)
            }}
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">重置示例</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 bg-transparent"
            onClick={() => setSettingsOpen(true)}
            aria-label="系统设置"
          >
            <Settings className="size-3.5" />
          </Button>
        </div>
      </header>

      {importError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive md:px-6"
        >
          <span>导入失败：{importError}</span>
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="shrink-0 underline underline-offset-2"
          >
            关闭
          </button>
        </div>
      ) : null}

      {/* 语义模型切换栏：官方 semantic_model 为数组，支持多模型 */}
      <div
        role="tablist"
        aria-label="语义模型"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card px-4 py-1.5 md:px-6"
      >
        {models.map((m, i) => (
          <div
            key={i}
            className={`group flex shrink-0 items-center rounded-md border text-xs transition-colors ${
              i === activeIdx
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              onClick={() => switchModel(i)}
              className="max-w-48 truncate px-2.5 py-1 font-mono"
              title={m.name || `模型 ${i + 1}`}
            >
              {m.name || `模型 ${i + 1}`}
            </button>
            {models.length > 1 ? (
              <button
                type="button"
                onClick={() => removeModel(i)}
                aria-label={`删除模型 ${m.name || i + 1}`}
                className="mr-1 rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
          onClick={addModel}
        >
          <Plus className="size-3" />
          新增模型
        </Button>
        <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-muted-foreground/70 sm:inline">
          semantic_model[{models.length}]
        </span>
      </div>

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
          onFocusCapture={handleFormFocus}
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
          <SpecPreview
            models={models}
            activeIdx={activeIdx}
            selection={selection}
            align={selEvent}
            defaultFormat={appSettings.previewFormat}
            linkScroll={appSettings.linkScroll}
            onSelect={handlePreviewSelect}
          />
        </aside>
      </div>

      <AiPanel
        open={aiOpen}
        model={model}
        onClose={() => setAiOpen(false)}
        onApply={(m) => {
          setModel(m)
          setSelection(null)
          setSection('model')
        }}
        onOpenSettings={() => {
          setSettingsTab('provider')
          setSettingsOpen(true)
        }}
      />

      <SettingsDialog
        open={settingsOpen}
        appSettings={appSettings}
        initialTab={settingsTab}
        onClose={() => {
          setSettingsOpen(false)
          setSettingsTab('general')
        }}
        onAppSettingsChange={updateAppSettings}
      />
    </div>
  )
}
