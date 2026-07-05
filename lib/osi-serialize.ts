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
  // 任意附加键（官方 additionalProperties: true）：合法 JSON 对象则展开合并
  if (ctx.extra.trim()) {
    try {
      const parsed = JSON.parse(ctx.extra)
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (!(k in obj) || obj[k] === undefined) obj[k] = v
        }
      }
    } catch {
      // 非法 JSON 由校验层提示，这里忽略不输出
    }
  }
  const hasValue = Object.values(obj).some((v) => v !== undefined)
  return hasValue ? obj : undefined
}

/** $defs/CustomExtension[]：{ vendor_name, data } */
function customExtensions(exts: OsiCustomExtension[]): unknown {
  if (exts.length === 0) return undefined
  return exts.map((e) => ({
    vendor_name: e.vendorName,
    data: e.data,
  }))
}

/** $defs/Expression：{ dialects: [{ dialect, expression }] }（minItems: 1） */
function expression(dialects: { dialect: string; expression: string }[]): unknown {
  // 无方言时省略 expression：物理列字段本就可选；指标缺失时由 Schema 校验以 required 提示
  if (dialects.length === 0) return undefined
  return {
    dialects: dialects.map((d) => ({
      dialect: d.dialect,
      expression: d.expression,
    })),
  }
}

/** $defs/Field：dimension 三态（none 不输出 / plain {} / time { is_time }） */
function field(f: OsiField, tagged: boolean): Record<string, unknown> {
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
  const obj = {
    name: f.name,
    expression: expression(f.dialects),
    dimension,
    label: f.label || undefined,
    description: f.description || undefined,
    ai_context: aiContext(f.aiContext),
    custom_extensions: customExtensions(f.customExtensions),
  }
  return tagged ? tag(obj, `field:${f.id}`) : obj
}

/**
 * 将单个编辑器模型转换为 semantic_model 数组的一个元素。
 * tagged=true 时打上选择键标记（仅当前激活模型可交互联动）。
 */
function semanticModelSpec(model: OsiModel, tagged: boolean) {
  const dsName = (id: string) => model.datasets.find((d) => d.id === id)?.name || id
  const maybeTag = <T extends object>(obj: T, sel: SelKey): T => (tagged ? tag(obj, sel) : obj)

  return maybeTag(
    {
      name: model.name,
      description: model.description || undefined,
      ai_context: aiContext(model.aiContext),
      datasets: model.datasets.map((ds) =>
        maybeTag(
          {
            name: ds.name,
            source: ds.source,
            primary_key: ds.primaryKey.length > 0 ? ds.primaryKey : undefined,
            unique_keys:
              ds.uniqueKeys.length > 0
                ? ds.uniqueKeys.map((uk) => uk.columns).filter((c) => c.length > 0)
                : undefined,
            description: ds.description || undefined,
            ai_context: aiContext(ds.aiContext),
            fields: ds.fields.length > 0 ? ds.fields.map((f) => field(f, tagged)) : undefined,
            custom_extensions: customExtensions(ds.customExtensions),
          },
          `dataset:${ds.id}`,
        ),
      ),
      relationships:
        model.relationships.length > 0
          ? model.relationships.map((r) =>
              maybeTag(
                {
                  name: r.name,
                  from: dsName(r.fromDatasetId),
                  to: dsName(r.toDatasetId),
                  from_columns: r.fromColumns,
                  to_columns: r.toColumns,
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
              maybeTag(
                {
                  name: m.name,
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

/**
 * 构建完整规范文档：semantic_model 为多模型数组（官方顶层结构）。
 * activeIdx 指定的模型带选择键标记（双向联动），其余模型仅序列化不联动。
 */
export function buildSpec(models: OsiModel[], activeIdx = 0): Record<string, unknown> {
  const doc = {
    version: OSI_VERSION,
    semantic_model: models.map((m, i) => semanticModelSpec(m, i === activeIdx)),
  }
  return clean(doc) as Record<string, unknown>
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
      // 字段级选择键：子属性自动派生 `<父键>.<属性名>`
      const propSel = own ? `${own}.${k}` : undefined
      if (typeof v === 'string' && v.includes('\n')) {
        out.push({ text: `${pad}${k}: |-`, sel: propSel })
        for (const line of v.split('\n')) {
          out.push({ text: `${pad}  ${line}`, sel: propSel })
        }
      } else if (v !== null && typeof v === 'object') {
        const childSel = getSel(v) ?? propSel
        if (Array.isArray(v) && v.length === 0) {
          out.push({ text: `${pad}${k}: []`, sel: childSel })
          continue
        }
        out.push({ text: `${pad}${k}:`, sel: childSel })
        out.push(...emitYaml(v, indent + 1, childSel))
      } else {
        out.push({ text: `${pad}${k}: ${yamlScalar(v)}`, sel: propSel })
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
      // 字段级选择键：子属性自动派生 `<父键>.<属性名>`
      const propSel = getSel(v) ?? (own ? `${own}.${k}` : undefined)
      out.push(
        ...emitJson(
          v,
          indent + 1,
          propSel,
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

export function toYamlLines(models: OsiModel[], activeIdx = 0): SpecLine[] {
  return [
    { text: '# Open Semantic Interchange (OSI) Specification' },
    { text: `# Schema: osi-schema.json (v${OSI_VERSION})` },
    ...emitYaml(buildSpec(models, activeIdx), 0),
  ]
}

export function toJsonLines(models: OsiModel[], activeIdx = 0): SpecLine[] {
  return emitJson(buildSpec(models, activeIdx), 0, undefined, '', '')
}

export function toYaml(models: OsiModel[], activeIdx = 0): string {
  return toYamlLines(models, activeIdx)
    .map((l) => l.text)
    .join('\n')
    .concat('\n')
}

export function toJson(models: OsiModel[], activeIdx = 0): string {
  return toJsonLines(models, activeIdx)
    .map((l) => l.text)
    .join('\n')
    .concat('\n')
}
