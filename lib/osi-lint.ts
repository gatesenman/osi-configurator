import type { OsiModel } from './osi-types'
import type { SelKey } from './osi-serialize'

export type LintSeverity = 'error' | 'warning' | 'info'

export interface LintIssue {
  severity: LintSeverity
  /** 规则标识（英文短名，便于按规则忽略 / 排查） */
  rule: string
  message: string
  /** 关联实体的选择键：点击可定位到左侧表单 */
  sel?: SelKey
}

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/

/** 常见聚合函数：指标表达式缺少聚合时提示 */
const AGG_HINT = /\b(sum|count|avg|min|max|median|percentile|count_distinct|approx)\s*\(/i

function checkName(name: string, kind: string, sel: SelKey, issues: LintIssue[]) {
  if (name && !SNAKE_CASE.test(name)) {
    issues.push({
      severity: 'warning',
      rule: 'naming-convention',
      message: `${kind}「${name}」建议使用 snake_case 命名（小写字母、数字、下划线）`,
      sel,
    })
  }
}

/**
 * 语义级 Lint：官方 JSON Schema 之上的业务级检查。
 * Schema 校验保证结构合法；Lint 保证语义层「好用」——
 * 无重名歧义、关系引用有效、命名统一、描述覆盖充分。
 */
export function lintModel(model: OsiModel): LintIssue[] {
  const issues: LintIssue[] = []

  // ===== 命名规范 =====
  checkName(model.name, '模型', 'model', issues)

  // ===== 数据集 =====
  const dsNames = new Map<string, number>()
  for (const ds of model.datasets) {
    const sel: SelKey = `dataset:${ds.id}`
    dsNames.set(ds.name, (dsNames.get(ds.name) ?? 0) + 1)
    checkName(ds.name, '数据集', sel, issues)

    if (ds.primaryKey.length === 0) {
      issues.push({
        severity: 'warning',
        rule: 'no-primary-key',
        message: `数据集「${ds.name}」未定义 primary_key，会影响关系正确性与去重语义`,
        sel,
      })
    }
    if (!ds.description && !ds.aiContext.enabled) {
      issues.push({
        severity: 'info',
        rule: 'missing-context',
        message: `数据集「${ds.name}」缺少 description 和 ai_context，AI 消费方难以理解其用途`,
        sel,
      })
    }
    if (ds.source && !/^[\w"'\`.-]+\.[\w"'\`.-]+/.test(ds.source)) {
      issues.push({
        severity: 'info',
        rule: 'source-format',
        message: `数据集「${ds.name}」的 source「${ds.source}」建议使用 database.schema.table 全限定名`,
        sel,
      })
    }

    // 字段
    const fieldNames = new Map<string, number>()
    for (const f of ds.fields) {
      const fSel: SelKey = `field:${f.id}`
      fieldNames.set(f.name, (fieldNames.get(f.name) ?? 0) + 1)
      checkName(f.name, '字段', fSel, issues)
      if (f.dialects.length === 0 || f.dialects.every((d) => !d.expression.trim())) {
        issues.push({
          severity: 'error',
          rule: 'empty-expression',
          message: `字段「${ds.name}.${f.name}」的 expression 为空（官方 Schema 要求必填）`,
          sel: fSel,
        })
      }
      const seen = new Set<string>()
      for (const d of f.dialects) {
        if (seen.has(d.dialect)) {
          issues.push({
            severity: 'warning',
            rule: 'duplicate-dialect',
            message: `字段「${ds.name}.${f.name}」存在重复方言 ${d.dialect}，消费方无法确定取哪条`,
            sel: fSel,
          })
        }
        seen.add(d.dialect)
      }
    }
    for (const [name, count] of fieldNames) {
      if (count > 1) {
        issues.push({
          severity: 'error',
          rule: 'duplicate-name',
          message: `数据集「${ds.name}」中有 ${count} 个字段同名「${name}」，语义层引用将产生歧义`,
          sel,
        })
      }
    }

    // 主键列应在字段中声明（物理列可不声明，仅提示）
    const declared = new Set(ds.fields.map((f) => f.name))
    for (const pk of ds.primaryKey) {
      if (pk && !declared.has(pk)) {
        issues.push({
          severity: 'info',
          rule: 'undeclared-column',
          message: `数据集「${ds.name}」的主键列「${pk}」未在 fields 中声明（若为物理列可忽略）`,
          sel,
        })
      }
    }
  }
  for (const [name, count] of dsNames) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        rule: 'duplicate-name',
        message: `有 ${count} 个数据集同名「${name}」，关系的 from/to 引用将无法区分`,
        sel: 'model.datasets',
      })
    }
  }

  // ===== 关系 =====
  const relNames = new Map<string, number>()
  const dsById = new Map(model.datasets.map((d) => [d.id, d]))
  for (const r of model.relationships) {
    const sel: SelKey = `relationship:${r.id}`
    relNames.set(r.name, (relNames.get(r.name) ?? 0) + 1)
    checkName(r.name, '关系', sel, issues)

    const from = dsById.get(r.fromDatasetId)
    const to = dsById.get(r.toDatasetId)
    if (!from || !to) {
      issues.push({
        severity: 'error',
        rule: 'dangling-relationship',
        message: `关系「${r.name}」引用了不存在的数据集`,
        sel,
      })
      continue
    }
    if (r.fromColumns.length !== r.toColumns.length) {
      issues.push({
        severity: 'error',
        rule: 'column-count-mismatch',
        message: `关系「${r.name}」的 from_columns（${r.fromColumns.length} 列）与 to_columns（${r.toColumns.length} 列）数量不一致，无法逐列对应`,
        sel,
      })
    }
    if (r.fromDatasetId === r.toDatasetId) {
      issues.push({
        severity: 'warning',
        rule: 'self-relationship',
        message: `关系「${r.name}」的 from 与 to 是同一数据集（自关联请确认是否符合预期）`,
        sel,
      })
    }
    // to 侧列应命中目标数据集的主键 / 唯一键（一端约束）
    if (to.primaryKey.length > 0 && r.toColumns.length > 0) {
      const pkSet = new Set(to.primaryKey)
      const ukSets = to.uniqueKeys.map((uk) => new Set(uk.columns))
      const hitsPk = r.toColumns.every((c) => pkSet.has(c)) && r.toColumns.length === to.primaryKey.length
      const hitsUk = ukSets.some(
        (s) => r.toColumns.every((c) => s.has(c)) && r.toColumns.length === s.size,
      )
      if (!hitsPk && !hitsUk) {
        issues.push({
          severity: 'warning',
          rule: 'to-columns-not-unique',
          message: `关系「${r.name}」的 to_columns 未命中「${to.name}」的主键或唯一键，一端可能不唯一导致数据膨胀`,
          sel,
        })
      }
    }
    // 引用列在声明字段中不存在（物理列可忽略，仅提示）
    const fromDeclared = new Set(from.fields.map((f) => f.name))
    for (const c of r.fromColumns) {
      if (c && fromDeclared.size > 0 && !fromDeclared.has(c)) {
        issues.push({
          severity: 'info',
          rule: 'undeclared-column',
          message: `关系「${r.name}」的 from 列「${c}」未在「${from.name}」的 fields 中声明`,
          sel,
        })
      }
    }
  }
  for (const [name, count] of relNames) {
    if (count > 1) {
      issues.push({
        severity: 'warning',
        rule: 'duplicate-name',
        message: `有 ${count} 个关系同名「${name}」，建议唯一命名便于排查`,
        sel: 'model.relationships',
      })
    }
  }

  // ===== 指标 =====
  const metricNames = new Map<string, number>()
  for (const m of model.metrics) {
    const sel: SelKey = `metric:${m.id}`
    metricNames.set(m.name, (metricNames.get(m.name) ?? 0) + 1)
    checkName(m.name, '指标', sel, issues)
    if (m.dialects.length === 0 || m.dialects.every((d) => !d.expression.trim())) {
      issues.push({
        severity: 'error',
        rule: 'empty-expression',
        message: `指标「${m.name}」的 expression 为空（官方 Schema 要求必填）`,
        sel,
      })
    } else {
      const ansi = m.dialects.find((d) => d.dialect === 'ANSI_SQL')
      if (ansi && ansi.expression.trim() && !AGG_HINT.test(ansi.expression)) {
        issues.push({
          severity: 'info',
          rule: 'metric-no-aggregation',
          message: `指标「${m.name}」的表达式未检测到聚合函数（SUM/COUNT/AVG...），指标通常应为聚合语义`,
          sel,
        })
      }
    }
    if (!m.description && !m.aiContext.enabled) {
      issues.push({
        severity: 'info',
        rule: 'missing-context',
        message: `指标「${m.name}」缺少 description 和 ai_context，业务口径不明确`,
        sel,
      })
    }
  }
  for (const [name, count] of metricNames) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        rule: 'duplicate-name',
        message: `有 ${count} 个指标同名「${name}」，消费方无法区分`,
        sel: 'model.metrics',
      })
    }
  }

  const order: Record<LintSeverity, number> = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity])
}

/** 按严重度统计 */
export function lintCounts(issues: LintIssue[]) {
  return {
    error: issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  }
}
