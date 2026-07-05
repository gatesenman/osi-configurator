import type { OsiModel } from './osi-types'

/** 将模型转换为符合 OSI 结构的普通对象 */
export function toOsiSpec(model: OsiModel) {
  const datasetName = (id: string) =>
    model.datasets.find((d) => d.id === id)?.name ?? id

  return {
    osi_version: '0.1',
    semantic_model: {
      name: model.info.name || 'untitled_model',
      version: model.info.version || '1.0.0',
      description: model.info.description || undefined,
      owner: model.info.owner || undefined,
      domain: model.info.domain || undefined,
      default_timezone: model.info.defaultTimezone || undefined,
      locale: model.info.locale || undefined,
      certified: model.info.certified,
      tags: model.info.tags.length > 0 ? model.info.tags : undefined,
    },
    datasets: model.datasets.map((ds) => ({
      name: ds.name || 'untitled_dataset',
      label: ds.label || undefined,
      description: ds.description || undefined,
      source: ds.sql
        ? { sql: ds.sql }
        : {
            database: ds.database || undefined,
            schema: ds.schema || undefined,
            table: ds.table || undefined,
          },
      primary_key:
        ds.dimensions.filter((d) => d.isPrimaryKey).length > 0
          ? ds.dimensions.filter((d) => d.isPrimaryKey).map((d) => d.name)
          : undefined,
      dimensions: ds.dimensions
        .filter((d) => !d.isTimeDimension)
        .map((d) => ({
          name: d.name,
          label: d.label || undefined,
          expr: d.expr || d.name,
          data_type: d.dataType,
          description: d.description || undefined,
          synonyms: d.synonyms.length > 0 ? d.synonyms : undefined,
          sample_values: d.sampleValues.length > 0 ? d.sampleValues : undefined,
          unique: d.isUnique || undefined,
          classification: d.classification !== 'public' ? d.classification : undefined,
        })),
      time_dimensions: ds.dimensions
        .filter((d) => d.isTimeDimension)
        .map((d) => ({
          name: d.name,
          label: d.label || undefined,
          expr: d.expr || d.name,
          data_type: d.dataType,
          granularity: d.granularity ?? 'day',
          description: d.description || undefined,
          synonyms: d.synonyms.length > 0 ? d.synonyms : undefined,
          classification: d.classification !== 'public' ? d.classification : undefined,
        })),
      facts:
        ds.facts.length > 0
          ? ds.facts.map((f) => ({
              name: f.name,
              label: f.label || undefined,
              expr: f.expr || f.name,
              data_type: f.dataType,
              description: f.description || undefined,
              synonyms: f.synonyms.length > 0 ? f.synonyms : undefined,
            }))
          : undefined,
    })),
    metrics: model.metrics.map((m) => ({
      name: m.name || 'untitled_metric',
      label: m.label || undefined,
      dataset: datasetName(m.datasetId),
      expr: m.expr || undefined,
      aggregation: m.agg,
      filter: m.filterExpr || undefined,
      format: m.format || undefined,
      unit: m.unit || undefined,
      description: m.description || undefined,
      synonyms: m.synonyms.length > 0 ? m.synonyms : undefined,
      certified: m.certified || undefined,
    })),
    relationships: model.relationships.map((r) => ({
      name: r.name || 'untitled_relationship',
      type: r.type,
      join_type: r.joinType,
      from: { dataset: datasetName(r.fromDatasetId), column: r.fromColumn },
      to: { dataset: datasetName(r.toDatasetId), column: r.toColumn },
    })),
    filters:
      model.filters.length > 0
        ? model.filters.map((f) => ({
            name: f.name || 'untitled_filter',
            label: f.label || undefined,
            dataset: datasetName(f.datasetId),
            expr: f.expr || undefined,
            description: f.description || undefined,
            synonyms: f.synonyms.length > 0 ? f.synonyms : undefined,
          }))
        : undefined,
    verified_queries:
      model.verifiedQueries.length > 0
        ? model.verifiedQueries.map((q) => ({
            name: q.name || 'untitled_query',
            question: q.question || undefined,
            sql: q.sql || undefined,
            verified_by: q.verifiedBy || undefined,
            verified_at: q.verifiedAt || undefined,
            use_as_onboarding_question: q.useAsOnboarding || undefined,
          }))
        : undefined,
    glossary:
      model.glossary.length > 0
        ? model.glossary.map((g) => ({
            term: g.term,
            definition: g.definition || undefined,
            synonyms: g.synonyms.length > 0 ? g.synonyms : undefined,
          }))
        : undefined,
    custom_instructions: model.customInstructions || undefined,
  }
}

function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(clean).filter((v) => v !== undefined)
    return arr
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const c = clean(v)
      if (c !== undefined) out[k] = c
    }
    return out
  }
  return value === undefined ? undefined : value
}

export function toJson(model: OsiModel): string {
  return JSON.stringify(clean(toOsiSpec(model)), null, 2)
}

const NEEDS_QUOTE = /[:#{}[\],&*?|<>=!%@`"']|^\s|\s$|^$/

function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number')
    return String(value)
  const s = String(value)
  if (s.includes('\n')) {
    // 多行字符串由 yamlify 处理，这里兜底为 JSON 引号
    return JSON.stringify(s)
  }
  if (NEEDS_QUOTE.test(s) || /^(true|false|null|yes|no|~)$/i.test(s)) {
    return JSON.stringify(s)
  }
  return s
}

function yamlify(value: unknown, indent: number): string {
  const pad = '  '.repeat(indent)
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const inner = yamlify(item, indent + 1)
          // 将第一行合并到 "- " 后
          const lines = inner.split('\n')
          const first = lines[0].trimStart()
          const rest = lines.slice(1)
          return [`${pad}- ${first}`, ...rest].join('\n')
        }
        return `${pad}- ${yamlScalar(item)}`
      })
      .join('\n')
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return `${pad}{}`
    return entries
      .map(([k, v]) => {
        if (typeof v === 'string' && v.includes('\n')) {
          // 多行字符串使用块标量
          const block = v
            .split('\n')
            .map((line) => `${pad}  ${line}`)
            .join('\n')
          return `${pad}${k}: |-\n${block}`
        }
        if (v !== null && typeof v === 'object') {
          if (Array.isArray(v) && v.length === 0) return `${pad}${k}: []`
          return `${pad}${k}:\n${yamlify(v, indent + 1)}`
        }
        return `${pad}${k}: ${yamlScalar(v)}`
      })
      .join('\n')
  }
  return `${pad}${yamlScalar(value)}`
}

export function toYaml(model: OsiModel): string {
  const spec = clean(toOsiSpec(model))
  return `# Open Semantic Interchange (OSI) Specification\n# Generated by OSI Configurator\n${yamlify(spec, 0)}\n`
}
