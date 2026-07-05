'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Settings2, Sparkles, X } from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import { toYaml } from '@/lib/osi-serialize'
import { importSpec } from '@/lib/osi-import'
import type { AiMode, AiSettings } from '@/lib/osi-ai'
import {
  AI_PROVIDERS,
  buildMessages,
  extractYaml,
  loadAiSettings,
  saveAiSettings,
  streamChatCompletion,
} from '@/lib/osi-ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Phase = 'idle' | 'streaming' | 'done' | 'error'

export function AiPanel({
  open,
  model,
  onClose,
  onApply,
}: {
  open: boolean
  model: OsiModel
  onClose: () => void
  onApply: (m: OsiModel) => void
}) {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings)
  const [showSettings, setShowSettings] = useState(false)
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

  // 无 API Key 时首次打开自动展开设置
  useEffect(() => {
    if (open && !settings.apiKey && provider.id !== 'ollama') setShowSettings(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 流式输出时自动滚到底部
  useEffect(() => {
    const el = outputRef.current
    if (el && phase === 'streaming') el.scrollTop = el.scrollHeight
  }, [output, phase])

  if (!open) return null

  const updateSettings = (patch: Partial<AiSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveAiSettings(next)
  }

  const switchProvider = (id: string | null) => {
    const p = AI_PROVIDERS.find((x) => x.id === id)
    if (!p) return
    updateSettings({ providerId: p.id, baseUrl: p.baseUrl, model: p.defaultModel })
  }

  const canRun =
    instruction.trim().length > 0 &&
    settings.baseUrl.trim().length > 0 &&
    settings.model.trim().length > 0 &&
    (settings.apiKey.trim().length > 0 || provider.id === 'ollama') &&
    phase !== 'streaming'

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
        mode === 'adjust' ? toYaml(model) : undefined,
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
    const result = importSpec(yaml)
    if (result.ok && result.model) {
      onApply(result.model)
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
      aria-label="AI 生成 OSI 规范"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'streaming') onClose()
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">AI 生成 OSI 规范</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setShowSettings((v) => !v)}
            >
              <Settings2 className="size-3.5" />
              {provider.label.split(' ')[0]} · {settings.model || '未选模型'}
            </Button>
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
          {/* 提供商设置 */}
          {showSettings ? (
            <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-background p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">模型提供商</Label>
                  <Select value={settings.providerId} onValueChange={switchProvider}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue>{provider.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">模型 ID</Label>
                  <Input
                    className="h-8 font-mono text-xs"
                    value={settings.model}
                    list="osi-ai-models"
                    placeholder="如 deepseek-ai/DeepSeek-V3"
                    onChange={(e) => updateSettings({ model: e.target.value })}
                  />
                  <datalist id="osi-ai-models">
                    {provider.models.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">API 地址（OpenAI 兼容）</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={settings.baseUrl}
                  placeholder="https://api.siliconflow.cn/v1"
                  onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  API Key{provider.id === 'ollama' ? '（本地 Ollama 可留空）' : ''}
                </Label>
                <Input
                  className="h-8 font-mono text-xs"
                  type="password"
                  value={settings.apiKey}
                  placeholder="sk-..."
                  autoComplete="off"
                  onChange={(e) => updateSettings({ apiKey: e.target.value })}
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Key 仅保存在本机浏览器（localStorage），请求直连提供商，不经过任何中间服务器。
                </p>
              </div>
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
