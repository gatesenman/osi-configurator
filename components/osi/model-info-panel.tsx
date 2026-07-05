'use client'

import type { OsiModelInfo } from '@/lib/osi-types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Field, TagInput } from './field'

export function ModelInfoPanel({
  info,
  onChange,
}: {
  info: OsiModelInfo
  onChange: (next: OsiModelInfo) => void
}) {
  const set = <K extends keyof OsiModelInfo>(key: K, value: OsiModelInfo[K]) =>
    onChange({ ...info, [key]: value })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-medium">语义模型信息</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          定义模型的基础元数据与治理属性，供下游 BI、AI 工具统一消费。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="模型名称" hint="唯一标识，建议使用 snake_case">
          <Input
            value={info.name}
            onChange={(e) => set('name', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="sales_semantic_model"
          />
        </Field>
        <Field label="版本">
          <Input
            value={info.version}
            onChange={(e) => set('version', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="1.0.0"
          />
        </Field>
      </div>

      <Field label="描述">
        <Textarea
          value={info.description}
          onChange={(e) => set('description', e.target.value)}
          className="min-h-20 text-sm leading-relaxed"
          placeholder="描述该语义模型覆盖的业务范围与指标口径…"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="负责人 / Owner">
          <Input
            value={info.owner}
            onChange={(e) => set('owner', e.target.value)}
            className="h-8 text-sm"
            placeholder="team@example.com"
          />
        </Field>
        <Field label="业务域 / Domain">
          <Input
            value={info.domain}
            onChange={(e) => set('domain', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="sales"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="默认时区" hint="时间维度解析的默认时区">
          <Input
            value={info.defaultTimezone}
            onChange={(e) => set('defaultTimezone', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="Asia/Shanghai"
          />
        </Field>
        <Field label="区域 / Locale" hint="展示名称与格式的默认语言区域">
          <Input
            value={info.locale}
            onChange={(e) => set('locale', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder="zh-CN"
          />
        </Field>
      </div>

      <Field label="标签">
        <TagInput
          value={info.tags}
          onChange={(tags) => set('tags', tags)}
          placeholder="输入标签后按回车"
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">认证模型</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            标记为已通过数据治理团队认证的官方口径
          </p>
        </div>
        <Switch
          checked={info.certified}
          onCheckedChange={(v) => set('certified', v)}
          aria-label="认证模型"
        />
      </div>
    </div>
  )
}
