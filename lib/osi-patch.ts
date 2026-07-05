/**
 * AI 局部调整的补丁操作：AI 只输出操作列表（新增/修改/删除某个节点），
 * 本地逐条应用到当前模型——未提及的节点完全不被触碰（保留原对象引用与 id）。
 * 相比让 AI 重写整份 YAML：输出量小、不会意外改写无关实体、大模型也更难出错。
 */

import { parse as parseYaml } from 'yaml'
import type { OsiDataset, OsiField, OsiMetric, OsiModel, OsiRelationship } from './osi-types'
import { uid } from './osi-types'
import {
  importAiContext,
  importCustomExtensions,
  importDataset,
  importDialects,
  importField,
} from './osi-import'
import type { MergeSummary } from './osi-merge'

export interface PatchResult {
  ok: boolean
  model?: OsiModel
  summary?: MergeSummary
  /** 应用过程中的非致命警告（如删除目标不存在） */
  warnings: string[]
  error?: string
}

function emptySummary(): MergeSummary {
  return {
    datasets: { added: 0, modified: 0, removed: 0 },
    fields: { added: 0, modified: 0, removed: 0 },
    relationships: { added: 0, modified: 0, removed: 0 },
    metrics: { added: 0, modified: 0, removed: 0 },
    modelChanged: false,
    hasChanges: false,
  }
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/**
 * 解析并应用 AI 输出的操作列表（YAML，顶层 operations 数组）。
 * 支持的操作：
 * - set_model { name?, description?, ai_context? } 只覆盖给出的键
 * - upsert_dataset { dataset }  同名替换（字段按名保留 id），否则新增
 * - delete_dataset { name }
 * - upsert_field { dataset, field }  数据集内同名字段替换，否则新增
 * - delete_field { dataset, name }
 * - upsert_metric { metric } / delete_metric { name }
 * - upsert_relationship { relationship } / delete_relationship { name }
 */
export function applyPatch(current: OsiModel, text: string): PatchResult {
  let doc: unknown
  try {
    doc = parseYaml(text)
  } catch (e) {
    return { ok: false, warnings: [], error: `解析失败：${e instanceof Error ? e.message : String(e)}` }
  }
  if (doc === null || typeof doc !== 'object') {
    return { ok: false, warnings: [], error: '输出不是有效的 YAML 对象' }
  }
  const ops = (doc as Record<string, unknown>).operations
  if (!Array.isArray(ops) || ops.length === 0) {
    return { ok: false, warnings: [], error: '缺少 operations 操作列表（AI 未按局部调整格式输出）' }
  }

  const summary = emptySummary()
  const warnings: string[] = []

  // 浅拷贝工作副本：只有被操作触及的数组才会被替换
  let model: OsiModel = { ...current }
  let datasets = [...model.datasets]
  let relationships = [...model.relationships]
  let metrics = [...model.metrics]

  const findDs = (name: string) => datasets.findIndex((d) => d.name === name)

  for (let i = 0; i < ops.length; i++) {
    const raw = ops[i]
    if (raw === null || typeof raw !== 'object') {
      warnings.push(`操作 ${i + 1}：不是有效对象，已跳过`)
      continue
    }
    const op = raw as Record<string, unknown>
    const kind = asStr(op.op)

    switch (kind) {
      case 'set_model': {
        if (op.name !== undefined) model = { ...model, name: asStr(op.name) }
        if (op.description !== undefined) model = { ...model, description: asStr(op.description) }
        if (op.ai_context !== undefined) model = { ...model, aiContext: importAiContext(op.ai_context) }
        if (op.custom_extensions !== undefined) {
          model = { ...model, customExtensions: importCustomExtensions(op.custom_extensions) }
        }
        summary.modelChanged = true
        break
      }

      case 'upsert_dataset': {
        const spec = op.dataset
        if (spec === null || typeof spec !== 'object') {
          warnings.push(`操作 ${i + 1}（upsert_dataset）：缺少 dataset 对象，已跳过`)
          break
        }
        const incoming = importDataset(spec as Record<string, unknown>)
        const idx = findDs(incoming.name)
        if (idx >= 0) {
          const cur = datasets[idx]
          // 保留数据集 id；字段按名保留原 id（界面联动不断）
          const fields = incoming.fields.map((f) => {
            const old = cur.fields.find((x) => x.name === f.name)
            return old ? { ...f, id: old.id } : f
          })
          datasets[idx] = { ...incoming, id: cur.id, fields }
          summary.datasets.modified += 1
        } else {
          datasets.push(incoming)
          summary.datasets.added += 1
          summary.fields.added += incoming.fields.length
        }
        break
      }

      case 'delete_dataset': {
        const name = asStr(op.name)
        const idx = findDs(name)
        if (idx < 0) {
          warnings.push(`操作 ${i + 1}：数据集 "${name}" 不存在，无法删除`)
          break
        }
        const removed = datasets[idx]
        summary.fields.removed += removed.fields.length
        // 级联删除引用该数据集的关系
        const before = relationships.length
        relationships = relationships.filter(
          (r) => r.fromDatasetId !== removed.id && r.toDatasetId !== removed.id,
        )
        summary.relationships.removed += before - relationships.length
        datasets = datasets.filter((_, x) => x !== idx)
        summary.datasets.removed += 1
        break
      }

      case 'upsert_field': {
        const dsName = asStr(op.dataset)
        const spec = op.field
        const idx = findDs(dsName)
        if (idx < 0) {
          warnings.push(`操作 ${i + 1}：数据集 "${dsName}" 不存在，字段操作已跳过`)
          break
        }
        if (spec === null || typeof spec !== 'object') {
          warnings.push(`操作 ${i + 1}（upsert_field）：缺少 field 对象，已跳过`)
          break
        }
        const incoming = importField(spec as Record<string, unknown>)
        const ds = datasets[idx]
        const fIdx = ds.fields.findIndex((f) => f.name === incoming.name)
        const fields = [...ds.fields]
        if (fIdx >= 0) {
          fields[fIdx] = { ...incoming, id: fields[fIdx].id }
          summary.fields.modified += 1
        } else {
          fields.push(incoming)
          summary.fields.added += 1
        }
        datasets[idx] = { ...ds, fields }
        break
      }

      case 'delete_field': {
        const dsName = asStr(op.dataset)
        const name = asStr(op.name)
        const idx = findDs(dsName)
        if (idx < 0) {
          warnings.push(`操作 ${i + 1}：数据集 "${dsName}" 不存在，字段删除已跳过`)
          break
        }
        const ds = datasets[idx]
        if (!ds.fields.some((f) => f.name === name)) {
          warnings.push(`操作 ${i + 1}：字段 "${dsName}.${name}" 不存在，无法删除`)
          break
        }
        datasets[idx] = { ...ds, fields: ds.fields.filter((f) => f.name !== name) }
        summary.fields.removed += 1
        break
      }

      case 'upsert_metric': {
        const spec = op.metric
        if (spec === null || typeof spec !== 'object') {
          warnings.push(`操作 ${i + 1}（upsert_metric）：缺少 metric 对象，已跳过`)
          break
        }
        const o = spec as Record<string, unknown>
        const incoming: OsiMetric = {
          id: uid(),
          name: asStr(o.name),
          dialects: importDialects(o.expression),
          description: asStr(o.description),
          aiContext: importAiContext(o.ai_context),
          customExtensions: importCustomExtensions(o.custom_extensions),
        }
        const mIdx = metrics.findIndex((m) => m.name === incoming.name)
        if (mIdx >= 0) {
          metrics[mIdx] = { ...incoming, id: metrics[mIdx].id }
          summary.metrics.modified += 1
        } else {
          metrics.push(incoming)
          summary.metrics.added += 1
        }
        break
      }

      case 'delete_metric': {
        const name = asStr(op.name)
        if (!metrics.some((m) => m.name === name)) {
          warnings.push(`操作 ${i + 1}：指标 "${name}" 不存在，无法删除`)
          break
        }
        metrics = metrics.filter((m) => m.name !== name)
        summary.metrics.removed += 1
        break
      }

      case 'upsert_relationship': {
        const spec = op.relationship
        if (spec === null || typeof spec !== 'object') {
          warnings.push(`操作 ${i + 1}（upsert_relationship）：缺少 relationship 对象，已跳过`)
          break
        }
        const o = spec as Record<string, unknown>
        const fromName = asStr(o.from)
        const toName = asStr(o.to)
        const fromDs = datasets.find((d) => d.name === fromName)
        const toDs = datasets.find((d) => d.name === toName)
        if (!fromDs || !toDs) {
          warnings.push(
            `操作 ${i + 1}：关系引用的数据集 "${!fromDs ? fromName : toName}" 不存在，已跳过`,
          )
          break
        }
        const incoming: OsiRelationship = {
          id: uid(),
          name: asStr(o.name),
          fromDatasetId: fromDs.id,
          toDatasetId: toDs.id,
          fromColumns: Array.isArray(o.from_columns)
            ? o.from_columns.filter((x): x is string => typeof x === 'string')
            : [],
          toColumns: Array.isArray(o.to_columns)
            ? o.to_columns.filter((x): x is string => typeof x === 'string')
            : [],
          aiContext: importAiContext(o.ai_context),
          customExtensions: importCustomExtensions(o.custom_extensions),
        }
        const rIdx = relationships.findIndex((r) => r.name === incoming.name)
        if (rIdx >= 0) {
          relationships[rIdx] = { ...incoming, id: relationships[rIdx].id }
          summary.relationships.modified += 1
        } else {
          relationships.push(incoming)
          summary.relationships.added += 1
        }
        break
      }

      case 'delete_relationship': {
        const name = asStr(op.name)
        if (!relationships.some((r) => r.name === name)) {
          warnings.push(`操作 ${i + 1}：关系 "${name}" 不存在，无法删除`)
          break
        }
        relationships = relationships.filter((r) => r.name !== name)
        summary.relationships.removed += 1
        break
      }

      default:
        warnings.push(`操作 ${i + 1}：未知操作类型 "${kind || '(空)'}"，已跳过`)
    }
  }

  const s = summary
  s.hasChanges =
    s.modelChanged ||
    [s.datasets, s.fields, s.relationships, s.metrics].some(
      (c) => c.added > 0 || c.modified > 0 || c.removed > 0,
    )

  return {
    ok: true,
    model: { ...model, datasets, relationships, metrics },
    summary,
    warnings,
  }
}
