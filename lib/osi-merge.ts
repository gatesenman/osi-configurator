/**
 * AI 调整的局部合并：将 AI 返回的模型与当前模型按名称匹配合并。
 * 未变化的实体保留原对象引用与 id（界面状态、联动、折叠展开不受影响），
 * 只有内容真正变化的实体才被替换，实现"局部写"而非整体重建。
 */

import type { OsiDataset, OsiField, OsiMetric, OsiModel, OsiRelationship } from './osi-types'

export interface MergeSummary {
  datasets: { added: number; modified: number; removed: number }
  fields: { added: number; modified: number; removed: number }
  relationships: { added: number; modified: number; removed: number }
  metrics: { added: number; modified: number; removed: number }
  /** 模型级属性（name/description/ai_context/custom_extensions）是否变化 */
  modelChanged: boolean
  /** 是否有任何变化 */
  hasChanges: boolean
}

const ID_KEYS = new Set(['id', 'fromDatasetId', 'toDatasetId'])

/** 规范化序列化：递归排序对象键并剔除 id 类键，与键插入顺序无关 */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([k, val]) => !ID_KEYS.has(k) && val !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

/** 忽略 id 与键顺序后比较两个实体内容是否一致 */
function sameContent(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b)
}

/** 按名称合并实体数组：同名保留旧 id；内容未变保留原对象引用 */
function mergeList<T extends { id: string; name: string }>(
  current: T[],
  incoming: T[],
  counter: { added: number; modified: number; removed: number },
  mergeItem?: (cur: T, inc: T) => T,
): T[] {
  const curByName = new Map(current.map((c) => [c.name, c]))
  const incNames = new Set(incoming.map((i) => i.name))
  counter.removed += current.filter((c) => !incNames.has(c.name)).length

  return incoming.map((inc) => {
    const cur = curByName.get(inc.name)
    if (!cur) {
      counter.added += 1
      return inc
    }
    const candidate = mergeItem ? mergeItem(cur, inc) : { ...inc, id: cur.id }
    if (sameContent(cur, candidate)) return cur
    counter.modified += 1
    return candidate
  })
}

/**
 * 合并 AI 调整结果到当前模型。
 * 返回合并后的模型与变更摘要；datasets 内的 fields 递归按名称合并。
 */
export function mergeModels(current: OsiModel, incoming: OsiModel): { merged: OsiModel; summary: MergeSummary } {
  const summary: MergeSummary = {
    datasets: { added: 0, modified: 0, removed: 0 },
    fields: { added: 0, modified: 0, removed: 0 },
    relationships: { added: 0, modified: 0, removed: 0 },
    metrics: { added: 0, modified: 0, removed: 0 },
    modelChanged: false,
    hasChanges: false,
  }

  // 数据集：同名保留原 id，fields 递归合并
  const datasets: OsiDataset[] = mergeList(current.datasets, incoming.datasets, summary.datasets, (cur, inc) => ({
    ...inc,
    id: cur.id,
    fields: mergeList<OsiField>(cur.fields, inc.fields, summary.fields),
  }))
  // 新增数据集里的字段计入新增
  for (const inc of incoming.datasets) {
    if (!current.datasets.some((c) => c.name === inc.name)) summary.fields.added += inc.fields.length
  }
  for (const cur of current.datasets) {
    if (!incoming.datasets.some((i) => i.name === cur.name)) summary.fields.removed += cur.fields.length
  }

  // 关系引用的数据集 id 需从 incoming id 重映射到合并后的 id
  const incToMerged = new Map<string, string>()
  for (const inc of incoming.datasets) {
    const merged = datasets.find((d) => d.name === inc.name)
    if (merged) incToMerged.set(inc.id, merged.id)
  }
  const remapRel = (cur: OsiRelationship, inc: OsiRelationship): OsiRelationship => ({
    ...inc,
    id: cur.id,
    fromDatasetId: incToMerged.get(inc.fromDatasetId) ?? inc.fromDatasetId,
    toDatasetId: incToMerged.get(inc.toDatasetId) ?? inc.toDatasetId,
  })
  const relationships = mergeList(current.relationships, incoming.relationships, summary.relationships, remapRel)
  // 新增关系同样需要重映射数据集引用
  const relationshipsRemapped = relationships.map((r) =>
    incToMerged.has(r.fromDatasetId) || incToMerged.has(r.toDatasetId)
      ? {
          ...r,
          fromDatasetId: incToMerged.get(r.fromDatasetId) ?? r.fromDatasetId,
          toDatasetId: incToMerged.get(r.toDatasetId) ?? r.toDatasetId,
        }
      : r,
  )

  const metrics = mergeList<OsiMetric>(current.metrics, incoming.metrics, summary.metrics)

  const merged: OsiModel = {
    name: incoming.name,
    description: incoming.description,
    aiContext: incoming.aiContext,
    datasets,
    relationships: relationshipsRemapped,
    metrics,
    customExtensions: incoming.customExtensions,
  }

  summary.modelChanged = !sameContent(
    {
      name: current.name,
      description: current.description,
      aiContext: current.aiContext,
      customExtensions: current.customExtensions,
    },
    {
      name: merged.name,
      description: merged.description,
      aiContext: merged.aiContext,
      customExtensions: merged.customExtensions,
    },
  )

  const s = summary
  s.hasChanges =
    s.modelChanged ||
    [s.datasets, s.fields, s.relationships, s.metrics].some(
      (c) => c.added > 0 || c.modified > 0 || c.removed > 0,
    )

  return { merged, summary }
}

/** 变更摘要的中文描述片段，如 ["数据集 +1", "字段 ~2 -1"] */
export function summaryParts(summary: MergeSummary): string[] {
  const parts: string[] = []
  const entries: [string, { added: number; modified: number; removed: number }][] = [
    ['数据集', summary.datasets],
    ['字段', summary.fields],
    ['关系', summary.relationships],
    ['指标', summary.metrics],
  ]
  for (const [label, c] of entries) {
    const seg: string[] = []
    if (c.added > 0) seg.push(`+${c.added}`)
    if (c.modified > 0) seg.push(`~${c.modified}`)
    if (c.removed > 0) seg.push(`-${c.removed}`)
    if (seg.length > 0) parts.push(`${label} ${seg.join(' ')}`)
  }
  if (summary.modelChanged) parts.push('模型属性已修改')
  return parts
}
