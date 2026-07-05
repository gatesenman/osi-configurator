import type { AggregationType, OsiModel } from './osi-types'

/** 官方 OSI 规范版本（与 osi-schema.json 中 version const 一致） */
export const OSI_VERSION = '0.2.0.dev0'

/**
 * 选择键（selection key）：用于左侧表单与右侧规范预览的双向高亮联动。
 * 形如 info / ai / dataset:<id> / metric:<id> / relationship:<id> /
 * filter:<id> / query:<id> / glossary:<id>
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

/** 构造官方 Expression 结构 */
function expression(expr: string) {
  return { dialects: [{ dialect: 'ANSI_SQL', expression: expr }] }
}

/** 若对象所有值均为 undefined 则返回 undefined（用于可选的 ai_context） */
function ctx(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const hasValue = Object.values(obj).some((v) => v !== undefined)
  return hasValue ? obj : undefined
}

const AGG_SQL: Record<AggregationType, (expr: string) => string> = {
  sum: (e) => `SUM(${e})`,
  avg: (e) => `AVG(${e})`,
  count: (e) => `COUNT(${e})`,
  count_distinct: (e) => `COUNT(DISTINCT ${e})`,
  min: (e) => `MIN(${e})`,
  max: (e) => `MAX(${e})`,
  median: (e) => `MEDIAN(${e})`,
}

/**
 * 将编辑器模型转换为符合官方 OSI 0.2.0.dev0 JSON Schema 的规范对象。
 * 官方 schema 严格（additionalProperties: false），扩展元数据一律放入
 * 官方开放扩展的 ai_context（additionalProperties: true）。
 */
export function toOsiSpec(model: OsiModel) {
  const dsName = (id: string) => model.datasets.find((d) => d.id === id)?.name || id

  const semanticModel = tag(
    {
      name: model.info.name || 'untitled_model',
      description: model.info.description || undefined,
      ai_context: tag(
        {
          model_info: tag(
            {
              version: model.info.version || undefined,
              owner: model.info.owner || undefined,
              domain: model.info.domain || undefined,
              default_timezone: model.info.defaultTimezone || undefined,
              locale: model.info.locale || undefined,
              certified: model.info.certified || undefined,
              tags: model.info.tags.length > 0 ? model.info.tags : undefined,
            },
            'info',
          ),
          instructions: model.customInstructions || undefined,
          glossary:
            model.glossary.length > 0
              ? model.glossary.map((g) =>
                  tag(
                    {
                      term: g.term || 'untitled_term',
                      definition: g.definition || undefined,
                      synonyms: g.synonyms.length > 0 ? g.synonyms : undefined,
                    },
                    `glossary:${g.id}`,
                  ),
                )
              : undefined,
          filters:
            model.filters.length > 0
              ? model.filters.map((f) =>
                  tag(
                    {
                      name: f.name || 'untitled_filter',
                      label: f.label || undefined,
                      dataset: dsName(f.datasetId),
                      expression: f.expr || undefined,
                      description: f.description || undefined,
                      synonyms: f.synonyms.length > 0 ? f.synonyms : undefined,
                    },
                    `filter:${f.id}`,
                  ),
                )
              : undefined,
          verified_queries:
            model.verifiedQueries.length > 0
              ? model.verifiedQueries.map((q) =>
                  tag(
                    {
                      name: q.name || 'untitled_query',
                      question: q.question || undefined,
                      sql: q.sql || undefined,
                      verified_by: q.verifiedBy || undefined,
                      verified_at: q.verifiedAt || undefined,
                      use_as_onboarding_question: q.useAsOnboarding || undefined,
                    },
                    `query:${q.id}`,
                  ),
                )
              : undefined,
        },
        'ai',
      ),
      datasets: model.datasets.map((ds) => {
        const pk = ds.dimensions.filter((d) => d.isPrimaryKey).map((d) => d.name)
        const source = ds.sql
          ? ds.sql
          : [ds.database, ds.schema, ds.table].filter(Boolean).join('.')
        return tag(
          {
            name: ds.name || 'untitled_dataset',
            source: source || 'undefined_source',
            primary_key: pk.length > 0 ? pk : undefined,
            description: ds.description || undefined,
            ai_context: ctx({
              label: ds.label || undefined,
            }),
            fields: [
              ...ds.dimensions.map((d) => ({
                name: d.name || 'untitled_field',
                expression: expression(d.expr || d.name || 'NULL'),
                dimension: d.isTimeDimension ? { is_time: true } : {},
                label: d.label || undefined,
                description: d.description || undefined,
                ai_context: ctx({
                  synonyms: d.synonyms.length > 0 ? d.synonyms : undefined,
                  data_type: d.dataType,
                  sample_values: d.sampleValues.length > 0 ? d.sampleValues : undefined,
                  unique: d.isUnique || undefined,
                  classification:
                    d.classification !== 'public' ? d.classification : undefined,
                  granularity: d.isTimeDimension ? (d.granularity ?? 'day') : undefined,
                }),
              })),
              ...ds.facts.map((f) => ({
                name: f.name || 'untitled_field',
                expression: expression(f.expr || f.name || 'NULL'),
                label: f.label || undefined,
                description: f.description || undefined,
                ai_context: ctx({
                  synonyms: f.synonyms.length > 0 ? f.synonyms : undefined,
                  data_type: f.dataType,
                  is_fact: true,
                }),
              })),
            ],
          },
          `dataset:${ds.id}`,
        )
      }),
      relationships:
        model.relationships.length > 0
          ? model.relationships.map((r) =>
              tag(
                {
                  name: r.name || 'untitled_relationship',
                  from: dsName(r.fromDatasetId),
                  to: dsName(r.toDatasetId),
                  from_columns: [r.fromColumn || 'unknown_column'],
                  to_columns: [r.toColumn || 'unknown_column'],
                  ai_context: ctx({
                    type: r.type,
                    join_type: r.joinType,
                  }),
                },
                `relationship:${r.id}`,
              ),
            )
          : undefined,
      metrics:
        model.metrics.length > 0
          ? model.metrics.map((m) => {
              const base = m.expr || m.name || 'NULL'
              return tag(
                {
                  name: m.name || 'untitled_metric',
                  expression: expression(AGG_SQL[m.agg](base)),
                  description: m.description || undefined,
                  ai_context: ctx({
                    label: m.label || undefined,
                    dataset: dsName(m.datasetId),
                    aggregation: m.agg,
                    filter: m.filterExpr || undefined,
                    format: m.format || undefined,
                    unit: m.unit || undefined,
                    synonyms: m.synonyms.length > 0 ? m.synonyms : undefined,
                    certified: m.certified || undefined,
                  }),
                },
                `metric:${m.id}`,
              )
            })
          : undefined,
    },
    'info',
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
