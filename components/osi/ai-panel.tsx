'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Settings2, Sparkles, X } from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import { toYaml } from '@/lib/osi-serialize'
import { importSpec } from '@/lib/osi-import'
import type { AiMode, AiSettings } from '@/lib/osi-ai'
import { AI_PROVIDERS, buildMessages, extractYaml, loadAiSettings, streamChatCompletion } from '@/lib/osi-ai'
import { summaryParts } from '@/lib/osi-merge'
import { applyPatch } from '@/lib/osi-patch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Phase = 'idle' | 'streaming' | 'done' | 'error'

export function AiPanel({
  open,
  model,
  onClose,
  onApply,
  onOpenSettings,
}: {
  open: boolean
  model: OsiModel
  onClose: () => void
  /** isAdjust=true 表示局部调整（调用方应保持当前视图状态） */
  onApply: (m: OsiModel, isAdjust?: boolean) => void
  /** 跳转到系统设置的「模型提供商」分区 */
  onOpenSettings?: () => void
}) {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings)
  const [mode, setMode] = useState<AiMode>('generate')
  const [instruction, setInstruction] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)

  const provider = useMemo(
    () => AI_PROVIDERS.find((p) => p.id === settings.providerId) ?? AI_PROVIDERS[0],
    [settings.providerId],
  )

  // 打开时重新加载设置（系统设置里可能刚改过提供商配置）
  useEffect(() => {
    if (open) setSettings(loadAiSettings())
  }, [open])

  // 流式输出时自动滚到底部
  useEffect(() => {
    const el = outputRef.current
    if (el && phase === 'streaming') el.scrollTop = el.scrollHeight
  }, [output, phase])

  /** 调整模式：预解析操作列表并试算变更摘要（应用前可确认改动范围）。必须在提前返回之前调用，保证 hooks 顺序稳定 */
  const adjustPreview = useMemo(() => {
    if (phase !== 'done' || mode !== 'adjust' || !output) return null
    return applyPatch(model, extractYaml(output))
  }, [phase, mode, output, model])

  if (!open) return null

  /** 提供商是否已配置就绪（本地 Ollama 无需 Key） */
  const configured =
    settings.baseUrl.trim().length > 0 &&
    settings.model.trim().length > 0 &&
    (settings.apiKey.trim().length > 0 || provider.id === 'ollama')

  const canRun = configured && instruction.trim().length > 0 && phase !== 'streaming'

  const run = async () => {
    setPhase('streaming')
    setOutput('')
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const messages = buildMessages(
        mode,
        instruction.trim(),
        mode === 'adjust' ? toYaml([model]) : undefined,
      )
      await streamChatCompletion(settings, messages, (_d, full) => setOutput(full), controller.signal)
      setPhase('done')
    } catch (e) {
      if (controller.signal.aborted) {
        setPhase('idle')
      } else {
        setError(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
    }
  }

  const stop = () => abortRef.current?.abort()

  const apply = () => {
    const yaml = extractYaml(output)
    if (mode === 'adjust') {
      // 局部调整：逐条应用操作到当前模型，未提及节点零触碰
      const patch = applyPatch(model, yaml)
      if (patch.ok && patch.model) {
        onApply(patch.model, true)
        setPhase('idle')
        setOutput('')
        onClose()
      } else {
        setError(`无法应用调整：${patch.error ?? '未知错误'}。可调整描述后重试。`)
        setPhase('error')
      }
      return
    }
    // 生成新模型：整体导入
    const result = importSpec(yaml)
    if (result.ok && result.models && result.models.length > 0) {
      onApply(result.models[0], false)
      setPhase('idle')
      setOutput('')
      onClose()
    } else {
      setError(`生成结果不符合 OSI 规范：${result.error ?? '未知错误'}。可调整描述后重试。`)
      setPhase('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI 生成"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'streaming') onClose()
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">AI 生成</h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {provider.label} · {settings.model || '未选模型'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onClose}
              disabled={phase === 'streaming'}
              aria-label="关闭"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* 未配置提供商 → 引导到系统设置 */}
          {!configured ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                尚未配置模型提供商，请先在系统设置中填写 API Key 等信息。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1.5 bg-transparent text-xs"
                onClick={() => {
                  onClose()
                  onOpenSettings?.()
                }}
              >
                <Settings2 className="size-3.5" />
                去设置
              </Button>
            </div>
          ) : null}

          {/* 模式切换 */}
          <div className="mb-3 flex gap-1 rounded-md border border-border bg-background p-1">
            {(
              [
                { id: 'generate', label: '生成新模型' },
                { id: 'adjust', label: '调整当前模型' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={`flex-1 rounded px-3 py-1.5 text-xs transition-colors ${
                  mode === m.id
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 需求描述 */}
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
            className="text-sm"
            placeholder={
              mode === 'generate'
                ? '描述业务场景，如：电商订单分析，包含订单、商品、用户三个数据集，需要 GMV、客单价、复购率指标…'
                : '描述调整要求，如：给订单数据集增加渠道维度字段，新增退款率指标…'
            }
          />

          {/* 流式输出 / 错误 */}
          {output || phase === 'streaming' ? (
            <pre
              ref={outputRef}
              className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
            >
              {output || '等待模型响应…'}
            </pre>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-xs leading-relaxed text-destructive">
              {error}
            </p>
          ) : null}

          {/* 调整模式：应用前展示操作试算结果（变更摘要 + 警告） */}
          {adjustPreview ? (
            adjustPreview.ok && adjustPreview.summary ? (
              <div className="mt-3 flex flex-col gap-2">
                {adjustPreview.summary.hasChanges ? (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2">
                    <span className="text-xs text-muted-foreground">局部变更：</span>
                    {summaryParts(adjustPreview.summary).map((part) => (
                      <span
                        key={part}
                        className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                      >
                        {part}
                      </span>
                    ))}
                    <span className="w-full text-[11px] leading-relaxed text-muted-foreground">
                      +新增 ~修改 -删除；仅应用操作列表，未提及的节点零触碰
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">操作列表没有产生任何有效变更。</p>
                )}
                {adjustPreview.warnings.length > 0 ? (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                    {adjustPreview.warnings.map((w) => (
                      <p key={w} className="text-[11px] leading-relaxed text-muted-foreground">
                        {w}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-destructive">
                {adjustPreview.error ?? '操作列表无法解析'}
              </p>
            )
          ) : null}
        </div>

        {/* 底部操作 */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
          {phase === 'streaming' ? (
            <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={stop}>
              停止
            </Button>
          ) : null}
          {phase === 'done' && output ? (
            <Button size="sm" className="h-8" onClick={apply}>
              应用到配置器
            </Button>
          ) : null}
          <Button size="sm" className="h-8 gap-1.5" onClick={run} disabled={!canRun}>
            {phase === 'streaming' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {phase === 'done' || phase === 'error' ? '重新生成' : '生成'}
          </Button>
        </div>
      </div>
    </div>
  )
}
