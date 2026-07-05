import Ajv2020 from 'ajv/dist/2020'
import type { ErrorObject } from 'ajv'
import osiSchema from './osi-schema.json'
import type { OsiModel } from './osi-types'
import type { SelKey } from './osi-serialize'
import { buildSpec } from './osi-serialize'

export interface OsiValidationError {
  /** JSON 指针路径，如 /semantic_model/0/datasets/1/name */
  path: string
  message: string
  /** 对应左侧表单实体的选择键，用于点击错误跳转 */
  sel?: SelKey
}

export interface OsiValidationResult {
  valid: boolean
  errors: OsiValidationError[]
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validateFn = ajv.compile(osiSchema)

/** 将 Ajv 的 instancePath 映射为选择键 */
function selForPath(path: string, model: OsiModel): SelKey | undefined {
  const seg = path.split('/').filter(Boolean)
  // /semantic_model/0/...
  if (seg[0] !== 'semantic_model') return 'model'
  const rest = seg.slice(2)
  if (rest.length === 0) return 'model'

  const idx = (s: string | undefined) => (s !== undefined ? Number.parseInt(s, 10) : Number.NaN)

  switch (rest[0]) {
    case 'datasets': {
      const ds = model.datasets[idx(rest[1])]
      if (!ds) return undefined
      if (rest[2] === 'fields') {
        const f = ds.fields[idx(rest[3])]
        if (f) return `field:${f.id}`
      }
      return `dataset:${ds.id}`
    }
    case 'metrics':
      return model.metrics[idx(rest[1])] ? `metric:${model.metrics[idx(rest[1])].id}` : undefined
    case 'relationships':
      return model.relationships[idx(rest[1])]
        ? `relationship:${model.relationships[idx(rest[1])].id}`
        : undefined
    default:
      return 'model'
  }
}

function formatError(err: ErrorObject): string {
  if (err.keyword === 'additionalProperties') {
    const prop = (err.params as { additionalProperty?: string }).additionalProperty
    return `不允许的额外属性 "${prop}"`
  }
  if (err.keyword === 'required') {
    const prop = (err.params as { missingProperty?: string }).missingProperty
    return `缺少必填属性 "${prop}"`
  }
  if (err.keyword === 'const') {
    return `值必须为 ${JSON.stringify((err.params as { allowedValue?: unknown }).allowedValue)}`
  }
  if (err.keyword === 'enum') {
    return `值必须为枚举之一: ${JSON.stringify((err.params as { allowedValues?: unknown[] }).allowedValues)}`
  }
  if (err.keyword === 'minItems') {
    return `数组至少需要 ${(err.params as { limit?: number }).limit} 个元素`
  }
  if (err.keyword === 'type') {
    return `类型必须为 ${(err.params as { type?: string }).type}`
  }
  return err.message ?? '校验失败'
}

/** 使用官方 OSI JSON Schema (v0.2.0.dev0) 校验当前模型 */
export function validateModel(model: OsiModel): OsiValidationResult {
  const spec = buildSpec(model)
  const valid = validateFn(spec)
  if (valid) return { valid: true, errors: [] }

  const raw = validateFn.errors ?? []
  // oneOf 分支会产生大量噪音错误，过滤掉 oneOf 自身，保留具体分支信息
  const filtered = raw.filter((e) => e.keyword !== 'oneOf')
  const seen = new Set<string>()
  const errors: OsiValidationError[] = []
  for (const e of filtered.length > 0 ? filtered : raw) {
    const key = `${e.instancePath}|${e.keyword}|${e.message}`
    if (seen.has(key)) continue
    seen.add(key)
    errors.push({
      path: e.instancePath || '/',
      message: formatError(e),
      sel: selForPath(e.instancePath, model),
    })
  }
  return { valid: false, errors }
}
