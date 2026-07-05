'use client'

import type { OsiModel } from '@/lib/osi-types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from './field'
import { AiContextEditor, CustomExtensionsEditor } from './shared-editors'

/**
 * SemanticModel 顶层配置点：name（必填）、description、ai_context、custom_extensions。
 * datasets / relationships / metrics 在各自分区编辑。
 */
export function ModelInfoPanel({
  model,
  onChange,
}: {
  model: OsiModel
  onChange: (next: OsiModel) => void
}) {
  return (
    <div className="flex flex-col gap-6" data-sel="model">
      <div>
        <h2 className="text-sm font-medium">语义模型 / SemanticModel</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          官方顶层配置点：name（必填） · description · ai_context · custom_extensions
        </p>
      </div>

      <Field label="name（必填）" hint="模型唯一标识，建议使用 snake_case" sel="model.name">
        <Input
          value={model.name}
          onChange={(e) => onChange({ ...model, name: e.target.value })}
          className="h-8 font-mono text-sm"
          placeholder="sales_semantic_model"
        />
      </Field>

      <Field label="description" hint="模型覆盖的业务范围与用途" sel="model.description">
        <Textarea
          value={model.description}
          onChange={(e) => onChange({ ...model, description: e.target.value })}
          className="min-h-20 text-sm leading-relaxed"
          placeholder="销售域语义模型：覆盖订单事实与客户维度…"
        />
      </Field>

      <AiContextEditor
        value={model.aiContext}
        onChange={(aiContext) => onChange({ ...model, aiContext })}
        sel="model"
      />
      <CustomExtensionsEditor
        value={model.customExtensions}
        onChange={(customExtensions) => onChange({ ...model, customExtensions })}
        sel="model"
      />
    </div>
  )
}
