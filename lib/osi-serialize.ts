import type { OsiAiContext, OsiCustomExtension, OsiField, OsiModel } from './osi-types'

/** 官方 OSI 规范版本（与 osi-schema.json 中 version const 一致） */
export const OSI_VERSION = '0.2.0.dev0'

/**
 * 选择键（selection key）：用于左侧表单与右侧规范预览的双向高亮联动。
 * model / dataset:<id> / field:<id> / metric:<id> / relationship:<id>
 */
export type SelKey = string

/** 内部符号：给规范对象子树打上选择键标记（不会被序列化输出） */
const SEL = Symbol('osi-sel')

function tag<T extends object>(obj: T, sel: SelKey): T {
  ;(obj as Record<symbol, unknown>)[SEL] = sel
  return obj
}

function getSel(value: unknown): SelKey | undefined {
  if (value !== null && typeof value === 'object') {
    return (value as Record<symbol, unknown>)[SEL] as SelKey | undefined
  }
  return undefined
}

/**
 * $defs/AIContext：oneOf [string, { instructions, synonyms, examples }]
 * 未启用或内容为空时返回 undefined（不输出该配置点）
 */
function aiContext(ctx: OsiAiContext): unknown {
  if (!ctx.enabled) return undefined
  if (ctx.mode === 'text') {
    return ctx.text || undefined
  }
  const obj: Record<string, unknown> = {
    instructions: ctx.instructions || undefined,
    synonyms: ctx.synonyms.length > 0 ? ctx.synonyms : undefined,
    examples: ctx.examples.length > 0 ? ctx.examples : undefined,
  }
  const hasValue = Object.values(obj).some((v) => v !== undefined)
  return hasValue ? obj : undefined
}

/** $defs/CustomExtension[]：{ vendor_name, data } */
function customExtensions(exts: OsiCustomExtension[]): unknown {
  if (exts.length === 0) return undefined
  return exts.map((e) => ({
    vendor_name: e.vendorName || 'COMMON',
    data: e.data || '{}',
  }))
}

/** $defs/Expression：{ dialects: [{ dialect, expression }] }（minItems: 1） */
function expression(dialects: { dialect: string; expression: string }[]): unknown {
  return {
    dialects: dialects.map((d) => ({
      dialect: d.dialect,
      expression: d.expression || 'NULL',
    })),
  }
}

/** $defs/Field：dimension 三态（none 不输出 / plain {} / time { is_time }） */
function field(f: OsiField): Record<string, unknown> {
  let dimension: unknown
  switch (f.dimensionMode) {
    case 'plain':
      dimension = {}
      break
    case 'time':
      dimension = { is_time: true }
      break
    case 'not_time':
      dimension = { is_time: false }
      break
    default:
      dimension = undefined
  }
  return tag(
    {
      name: f.name || 'untitled_field',
      expression: expression(f.dialects),
      dimension,
      label: f.label || undefined,
      description: f.description || undefined,
      ai_context: aiContext(f.aiContext),
      custom_extensions: customExtensions(f.customExtensions),
    },
    `field:${f.id}`,
  )
}

/**
 * 将编辑器模型转换为与官方 OSI 0.2.0.dev0 JSON Schema 1:1 对应的规范对象。
 * 仅输出官方 schema 定义的属性，无任何私有扩展。
 */
export function toOsiSpec(model: OsiModel) {
  const dsName = (id: string) => model.datasets.find((d) => d.id === id)?.name || id

  const semanticModel = tag(
    {
      name: model.name || 'untitled_model',
      description: model.description || undefined,
      ai_context: aiContext(model.aiContext),
      datasets: model.datasets.map((ds) =>
        tag(
          {
            name: ds.name || 'untitled_dataset',
            source: ds.source || 'undefined_source',
            primary_key: ds.primaryKey.length > 0 ? ds.primaryKey : undefined,
            unique_keys:
              ds.uniqueKeys.length > 0
                ? ds.uniqueKeys.map((uk) => uk.columns).filter((c) => c.length > 0)
                : undefined,
            description: ds.description || undefined,
            ai_context: aiContext(ds.aiContext),
            fields: ds.fields.length > 0 ? ds.fields.map(field) : undefined,
            custom_extensions: customExtensions(ds.customExtensions),
          },
          `dataset:${ds.id}`,
        ),
      ),
      relationships:
        model.relationships.length > 0
          ? model.relationships.map((r) =>
              tag(
                {
                  name: r.name || 'untitled_relationship',
                  from: dsName(r.fromDatasetId),
                  to: dsName(r.toDatasetId),
                  from_columns: r.fromColumns.length > 0 ? r.fromColumns : ['unknown_column'],
                  to_columns: r.toColumns.length > 0 ? r.toColumns : ['unknown_column'],
                  ai_context: aiContext(r.aiContext),
                  custom_extensions: customExtensions(r.customExtensions),
                },
                `relationship:${r.id}`,
              ),
            )
          : undefined,
      metrics:
        model.metrics.length > 0
          ? model.metrics.map((m) =>
              tag(
                {
                  name: m.name || 'untitled_metric',
                  expression: expression(m.dialects),
                  description: m.description || undefined,
                  ai_context: aiContext(m.aiContext),
                  custom_extensions: customExtensions(m.customExtensions),
                },
                `metric:${m.id}`,
              ),
            )
          : undefined,
      custom_extensions: customExtensions(model.customExtensions),
    },
    'model',
  )

  return {
    version: OSI_VERSION,
    semantic_model: [semanticModel],
  }
}

/** 递归去除 undefined 值，同时保留选择键标记 */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(clean).filter((v) => v !== undefined)
    const sel = getSel(value)
    if (sel) tag(arr, sel)
    return arr
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const c = clean(v)
      if (c !== undefined) out[k] = c
    }
    const sel = getSel(value)
    if (sel) tag(out, sel)
    return out
  }
  return value
}

/** 构建清理后的规范对象（用于校验与序列化） */
export function buildSpec(model: OsiModel): Record<string, unknown> {
  return clean(toOsiSpec(model)) as Record<string, unknown>
}

/** 带选择键标记的输出行，用于双向高亮 */
export interface SpecLine {
  text: string
  sel?: SelKey
}

const NEEDS_QUOTE = /[:#{}[\],&*?|<>=!%@`"']|^\s|\s$|^$/

function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  const s = String(value)
  if (s.includes('\n')) return JSON.stringify(s)
  if (NEEDS_QUOTE.test(s) || /^(true|false|null|yes|no|~)$/i.test(s)) {
    return JSON.stringify(s)
  }
  return s
}

function emitYaml(value: unknown, indent: number, sel?: SelKey): SpecLine[] {
  const own = getSel(value) ?? sel
  const pad = '  '.repeat(indent)

  if (Array.isArray(value)) {
    if (value.length === 0) return [{ text: `${pad}[]`, sel: own }]
    const out: SpecLine[] = []
    for (const item of value) {
      if (item !== null && typeof item === 'object') {
        const inner = emitYaml(item, indent + 1, own)
        out.push(
          { ...inner[0], text: `${pad}- ${inner[0].text.trimStart()}` },
          ...inner.slice(1),
        )
      } else {
        out.push({ text: `${pad}- ${yamlScalar(item)}`, sel: own })
      }
    }
    return out
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return [{ text: `${pad}{}`, sel: own }]
    const out: SpecLine[] = []
    for (const [k, v] of entries) {
      if (typeof v === 'string' && v.includes('\n')) {
        out.push({ text: `${pad}${k}: |-`, sel: own })
        for (const line of v.split('\n')) {
          out.push({ text: `${pad}  ${line}`, sel: own })
        }
      } else if (v !== null && typeof v === 'object') {
        const childSel = getSel(v) ?? own
        if (Array.isArray(v) && v.length === 0) {
          out.push({ text: `${pad}${k}: []`, sel: childSel })
          continue
        }
        out.push({ text: `${pad}${k}:`, sel: childSel })
        out.push(...emitYaml(v, indent + 1, own))
      } else {
        out.push({ text: `${pad}${k}: ${yamlScalar(v)}`, sel: own })
      }
    }
    return out
  }

  return [{ text: `${pad}${yamlScalar(value)}`, sel: own }]
}

function emitJson(
  value: unknown,
  indent: number,
  sel: SelKey | undefined,
  keyPrefix: string,
  comma: string,
): SpecLine[] {
  const own = getSel(value) ?? sel
  const pad = '  '.repeat(indent)

  if (Array.isArray(value)) {
    if (value.length === 0) return [{ text: `${pad}${keyPrefix}[]${comma}`, sel: own }]
    const out: SpecLine[] = [{ text: `${pad}${keyPrefix}[`, sel: own }]
    value.forEach((item, i) => {
      out.push(...emitJson(item, indent + 1, own, '', i < value.length - 1 ? ',' : ''))
    })
    out.push({ text: `${pad}]${comma}`, sel: own })
    return out
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return [{ text: `${pad}${keyPrefix}{}${comma}`, sel: own }]
    const out: SpecLine[] = [{ text: `${pad}${keyPrefix}{`, sel: own }]
    entries.forEach(([k, v], i) => {
      out.push(
        ...emitJson(
          v,
          indent + 1,
          own,
          `${JSON.stringify(k)}: `,
          i < entries.length - 1 ? ',' : '',
        ),
      )
    })
    out.push({ text: `${pad}}${comma}`, sel: own })
    return out
  }

  return [{ text: `${pad}${keyPrefix}${JSON.stringify(value ?? null)}${comma}`, sel: own }]
}

export function toYamlLines(model: OsiModel): SpecLine[] {
  return [
    { text: '# Open Semantic Interchange (OSI) Specification' },
    { text: `# Schema: osi-schema.json (v${OSI_VERSION})` },
    ...emitYaml(buildSpec(model), 0),
  ]
}

export function toJsonLines(model: OsiModel): SpecLine[] {
  return emitJson(buildSpec(model), 0, undefined, '', '')
}

export function toYaml(model: OsiModel): string {
  return toYamlLines(model)
    .map((l) => l.text)
    .join('\n')
    .concat('\n')
}

export function toJson(model: OsiModel): string {
  return toJsonLines(model)
    .map((l) => l.text)
    .join('\n')
    .concat('\n')
}
