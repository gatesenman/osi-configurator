import { parse as parseYaml } from 'yaml'
import type {
  Dialect,
  DimensionMode,
  OsiAiContext,
  OsiCustomExtension,
  OsiDataset,
  OsiDialectExpression,
  OsiField,
  OsiMetric,
  OsiModel,
  OsiRelationship,
} from './osi-types'
import { DIALECTS, emptyAiContext, uid } from './osi-types'

/**
 * 导入解析：将官方 OSI 规范文件（YAML / JSON）反向映射为编辑器模型。
 * 与 osi-serialize.ts 的输出互为逆操作，支持完整 round-trip。
 */

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** $defs/AIContext：oneOf [string, { instructions, synonyms, examples, ...任意附加键 }] */
export function importAiContext(v: unknown): OsiAiContext {
  if (typeof v === 'string') {
    return { ...emptyAiContext(), enabled: true, mode: 'text', text: v }
  }
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>
    // 官方 additionalProperties: true——收集已知键之外的任意附加键，round-trip 不丢失
    const KNOWN = new Set(['instructions', 'synonyms', 'examples'])
    const extraEntries = Object.entries(o).filter(([k]) => !KNOWN.has(k))
    return {
      enabled: true,
      mode: 'structured',
      text: '',
      instructions: asString(o.instructions),
      synonyms: asStringArray(o.synonyms),
      examples: asStringArray(o.examples),
      extra: extraEntries.length > 0 ? JSON.stringify(Object.fromEntries(extraEntries), null, 2) : '',
    }
  }
  return emptyAiContext()
}

/** $defs/CustomExtension[]：data 可能是对象或字符串，统一存为 JSON 字符串 */
export function importCustomExtensions(v: unknown): OsiCustomExtension[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
    .map((e) => ({
      id: uid(),
      vendorName: asString(e.vendor_name),
      data:
        typeof e.data === 'string' ? e.data : e.data !== undefined ? JSON.stringify(e.data) : '',
    }))
}

/** 非法方言值规范化：常见变体（如 SNOWFLAKE_SQL / DATABRICKS_SQL）映射回官方枚举，未知值回退 ANSI_SQL */
function normalizeDialect(v: string): Dialect {
  const upper = v.toUpperCase()
  if ((DIALECTS as string[]).includes(upper)) return upper as Dialect
  const base = upper.replace(/_?SQL$/, '')
  if ((DIALECTS as string[]).includes(base)) return base as Dialect
  return 'ANSI_SQL'
}

/** $defs/Expression：{ dialects: [{ dialect, expression }] } */
export function importDialects(v: unknown): OsiDialectExpression[] {
  if (v === null || typeof v !== 'object') return []
  const dialects = (v as Record<string, unknown>).dialects
  if (!Array.isArray(dialects)) return []
  return dialects
    .filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
    .map((d) => ({
      id: uid(),
      dialect: normalizeDialect(asString(d.dialect) || 'ANSI_SQL'),
      expression: asString(d.expression),
    }))
}

/** Field.dimension 三态还原 */
function importDimensionMode(v: unknown): DimensionMode {
  if (v === undefined || v === null) return 'none'
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (o.is_time === true) return 'time'
    if (o.is_time === false) return 'not_time'
    return 'plain'
  }
  return 'none'
}

export function importField(v: Record<string, unknown>): OsiField {
  return {
    id: uid(),
    name: asString(v.name),
    dialects: importDialects(v.expression),
    dimensionMode: importDimensionMode(v.dimension),
    label: asString(v.label),
    description: asString(v.description),
    aiContext: importAiContext(v.ai_context),
    customExtensions: importCustomExtensions(v.custom_extensions),
  }
}

export function importDataset(v: Record<string, unknown>): OsiDataset {
  const uniqueKeys = Array.isArray(v.unique_keys)
    ? v.unique_keys
        .map((uk) => asStringArray(uk))
        .filter((c) => c.length > 0)
        .map((columns) => ({ id: uid(), columns }))
    : []
  const fields = Array.isArray(v.fields)
    ? v.fields
        .filter((f): f is Record<string, unknown> => f !== null && typeof f === 'object')
        .map(importField)
    : []
  return {
    id: uid(),
    name: asString(v.name),
    source: asString(v.source),
    primaryKey: asStringArray(v.primary_key),
    uniqueKeys,
    description: asString(v.description),
    aiContext: importAiContext(v.ai_context),
    fields,
    customExtensions: importCustomExtensions(v.custom_extensions),
  }
}

export interface ImportResult {
  ok: boolean
  /** 文件中的全部语义模型（官方 semantic_model 为数组，完整保留） */
  models?: OsiModel[]
  error?: string
}

/** 导入单个 semantic_model 数组元素 */
function importSemanticModel(m: Record<string, unknown>): OsiModel {
  const datasets = Array.isArray(m.datasets)
    ? m.datasets
        .filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
        .map(importDataset)
    : []

  /** relationships 中 from/to 是数据集 name，需映射回编辑器 id */
  const idByName = new Map(datasets.map((d) => [d.name, d.id]))
  const relationships: OsiRelationship[] = Array.isArray(m.relationships)
    ? m.relationships
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => ({
          id: uid(),
          name: asString(r.name),
          fromDatasetId: idByName.get(asString(r.from)) ?? asString(r.from),
          toDatasetId: idByName.get(asString(r.to)) ?? asString(r.to),
          fromColumns: asStringArray(r.from_columns),
          toColumns: asStringArray(r.to_columns),
          aiContext: importAiContext(r.ai_context),
          customExtensions: importCustomExtensions(r.custom_extensions),
        }))
    : []

  const metrics: OsiMetric[] = Array.isArray(m.metrics)
    ? m.metrics
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
        .map((x) => ({
          id: uid(),
          name: asString(x.name),
          dialects: importDialects(x.expression),
          description: asString(x.description),
          aiContext: importAiContext(x.ai_context),
          customExtensions: importCustomExtensions(x.custom_extensions),
        }))
    : []

  return {
    name: asString(m.name),
    description: asString(m.description),
    aiContext: importAiContext(m.ai_context),
    datasets,
    relationships,
    metrics,
    customExtensions: importCustomExtensions(m.custom_extensions),
  }
}

/** 解析 OSI 规范文本（YAML 或 JSON 均可，YAML 是 JSON 的超集），完整保留多语义模型 */
export function importSpec(text: string): ImportResult {
  let doc: unknown
  try {
    doc = parseYaml(text)
  } catch (e) {
    return { ok: false, error: `解析失败：${e instanceof Error ? e.message : String(e)}` }
  }

  if (doc === null || typeof doc !== 'object') {
    return { ok: false, error: '文件内容不是有效的 OSI 规范对象' }
  }

  const root = doc as Record<string, unknown>
  const raw = root.semantic_model
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: '缺少 semantic_model 数组（不是有效的 OSI 规范文件）' }
  }
  const entries = raw.filter(
    (sm): sm is Record<string, unknown> => sm !== null && typeof sm === 'object',
  )
  if (entries.length === 0) {
    return { ok: false, error: 'semantic_model 中没有有效的模型对象' }
  }

  return { ok: true, models: entries.map(importSemanticModel) }
}
