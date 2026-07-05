'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Monitor, Moon, Plug, Settings, Sun, X } from 'lucide-react'
import type { AiSettings } from '@/lib/osi-ai'
import { AI_PROVIDERS, loadAiSettings, saveAiSettings, testConnection } from '@/lib/osi-ai'
import type { AppSettings } from '@/lib/osi-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Tab = 'general' | 'provider'

export function SettingsDialog({
  open,
  appSettings,
  initialTab = 'general',
  onClose,
  onAppSettingsChange,
}: {
  open: boolean
  appSettings: AppSettings
  /** 打开时定位到的分区（如从 AI 面板跳转到「模型提供商」） */
  initialTab?: Tab
  onClose: () => void
  onAppSettingsChange: (s: AppSettings) => void
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [ai, setAi] = useState<AiSettings>(loadAiSettings)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  // 每次打开重新加载（AI 面板等其他入口可能改过设置），并定位到指定分区
  useEffect(() => {
    if (open) {
      setAi(loadAiSettings())
      setTestResult(null)
      setTab(initialTab)
    }
  }, [open, initialTab])

  if (!open) return null

  const provider = AI_PROVIDERS.find((p) => p.id === ai.providerId) ?? AI_PROVIDERS[0]

  const updateAi = (patch: Partial<AiSettings>) => {
    const next = { ...ai, ...patch }
    setAi(next)
    saveAiSettings(next)
    setTestResult(null)
  }

  const switchProvider = (id: string | null) => {
    const p = AI_PROVIDERS.find((x) => x.id === id)
    if (!p) return
    updateAi({ providerId: p.id, baseUrl: p.baseUrl, model: p.defaultModel })
  }

  const updateApp = (patch: Partial<AppSettings>) => {
    onAppSettingsChange({ ...appSettings, ...patch })
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    const r = await testConnection(ai)
    setTestResult(r)
    setTesting(false)
  }

  const themeOptions = [
    { id: 'system', label: '跟随系统', icon: Monitor },
    { id: 'light', label: '浅色', icon: Sun },
    { id: 'dark', label: '深色', icon: Moon },
  ] as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="系统设置"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">系统设置</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </Button>
        </div>

        {/* 分区切换 */}
        <div className="flex shrink-0 gap-1 border-b border-border px-4 pt-3">
          {(
            [
              { id: 'general', label: '通用' },
              { id: 'provider', label: '模型提供商' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-selected={tab === t.id}
              role="tab"
              className={`rounded-t-md border-b-2 px-3 py-1.5 text-xs transition-colors ${
                tab === t.id
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'general' ? (
            <div className="flex flex-col gap-5">
              {/* 主题 */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium">主题外观</Label>
                <div className="flex gap-1 rounded-md border border-border bg-background p-1">
                  {themeOptions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateApp({ theme: t.id })}
                      aria-pressed={appSettings.theme === t.id}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
                        appSettings.theme === t.id
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <t.icon className="size-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 预览默认格式 */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium">预览默认格式</Label>
                <div className="flex gap-1 rounded-md border border-border bg-background p-1">
                  {(['yaml', 'json'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => updateApp({ previewFormat: f })}
                      aria-pressed={appSettings.previewFormat === f}
                      className={`flex-1 rounded px-3 py-1.5 text-xs uppercase transition-colors ${
                        appSettings.previewFormat === f
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  打开应用时右侧预览面板默认显示的规范格式。
                </p>
              </div>

              {/* 联动行为 */}
              <div className="flex flex-col gap-3">
                <Label className="text-xs font-medium">左右联动</Label>
                {(
                  [
                    {
                      key: 'linkScroll',
                      label: '自动滚动对齐',
                      desc: '选中实体时两侧滚动到相同视口高度；关闭后仅高亮不滚动',
                    },
                    {
                      key: 'autoExpand',
                      label: '自动展开折叠卡片',
                      desc: '点击右侧规范行时自动展开左侧折叠的字段卡并定位',
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">{opt.label}</span>
                      <span className="text-[11px] leading-relaxed text-muted-foreground">
                        {opt.desc}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                      checked={appSettings[opt.key]}
                      onChange={(e) => updateApp({ [opt.key]: e.target.checked })}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">提供商</Label>
                  <Select value={ai.providerId} onValueChange={switchProvider}>
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
                    value={ai.model}
                    list="settings-ai-models"
                    placeholder="如 deepseek-ai/DeepSeek-V3"
                    onChange={(e) => updateAi({ model: e.target.value })}
                  />
                  <datalist id="settings-ai-models">
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
                  value={ai.baseUrl}
                  placeholder="https://api.siliconflow.cn/v1"
                  onChange={(e) => updateAi({ baseUrl: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  API Key{provider.id === 'ollama' ? '（本地 Ollama 可留空）' : ''}
                </Label>
                <Input
                  className="h-8 font-mono text-xs"
                  type="password"
                  value={ai.apiKey}
                  placeholder="sk-..."
                  autoComplete="off"
                  onChange={(e) => updateAi({ apiKey: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">温度（0-2）</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={ai.temperature}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (!Number.isNaN(v)) updateAi({ temperature: Math.min(2, Math.max(0, v)) })
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">规范生成建议低温（0.2）</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">最大输出 tokens</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={0}
                    step={256}
                    value={ai.maxTokens}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (!Number.isNaN(v)) updateAi({ maxTokens: Math.max(0, Math.round(v)) })
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">0 = 使用提供商默认上限</p>
                </div>
              </div>

              {/* 连接测试 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 bg-transparent"
                  onClick={runTest}
                  disabled={testing || !ai.baseUrl.trim()}
                >
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                  测试连接
                </Button>
                {testResult ? (
                  <p
                    role="status"
                    className={`flex items-center gap-1 text-xs ${
                      testResult.ok ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {testResult.ok ? <Check className="size-3.5" /> : null}
                    {testResult.message}
                  </p>
                ) : null}
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                所有设置仅保存在本机（localStorage）。API 请求从本机直连提供商接口，不经过任何中间服务器。「AI
                生成」弹窗与此处共用同一份提供商配置。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
