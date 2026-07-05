export type DataType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'

export type AggregationType =
  | 'sum'
  | 'avg'
  | 'count'
  | 'count_distinct'
  | 'min'
  | 'max'
  | 'median'

export type RelationshipType = 'many_to_one' | 'one_to_one' | 'one_to_many'

export type JoinType = 'inner' | 'left_outer' | 'full_outer'

export type TimeGranularity =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted'

export interface OsiDimension {
  id: string
  name: string
  label: string
  expr: string
  dataType: DataType
  description: string
  synonyms: string[]
  sampleValues: string[]
  isTimeDimension: boolean
  granularity?: TimeGranularity
  isPrimaryKey: boolean
  isUnique: boolean
  classification: Classification
}

/** 事实 / 度量列：数据集行级别的可聚合数值字段 */
export interface OsiFact {
  id: string
  name: string
  label: string
  expr: string
  dataType: DataType
  description: string
  synonyms: string[]
}

export interface OsiDataset {
  id: string
  name: string
  label: string
  description: string
  database: string
  schema: string
  table: string
  /** 可选：用 SQL 派生数据集（替代物理表） */
  sql: string
  dimensions: OsiDimension[]
  facts: OsiFact[]
}

export interface OsiMetric {
  id: string
  name: string
  label: string
  datasetId: string
  expr: string
  agg: AggregationType
  /** 可选的 WHERE 过滤条件，限定指标统计口径 */
  filterExpr: string
  format: string
  unit: string
  description: string
  synonyms: string[]
  certified: boolean
}

export interface OsiRelationship {
  id: string
  name: string
  fromDatasetId: string
  fromColumn: string
  toDatasetId: string
  toColumn: string
  type: RelationshipType
  joinType: JoinType
}

/** 命名过滤器：可复用的查询过滤条件 */
export interface OsiFilter {
  id: string
  name: string
  label: string
  datasetId: string
  expr: string
  description: string
  synonyms: string[]
}

/** 验证查询：经人工确认的自然语言问题与对应 SQL */
export interface OsiVerifiedQuery {
  id: string
  name: string
  question: string
  sql: string
  verifiedBy: string
  verifiedAt: string
  useAsOnboarding: boolean
}

/** 业务词汇表条目 */
export interface OsiGlossaryTerm {
  id: string
  term: string
  definition: string
  synonyms: string[]
}

export interface OsiModelInfo {
  name: string
  version: string
  description: string
  owner: string
  domain: string
  defaultTimezone: string
  locale: string
  certified: boolean
  tags: string[]
}

export interface OsiModel {
  info: OsiModelInfo
  datasets: OsiDataset[]
  metrics: OsiMetric[]
  relationships: OsiRelationship[]
  filters: OsiFilter[]
  verifiedQueries: OsiVerifiedQuery[]
  glossary: OsiGlossaryTerm[]
  /** 面向 AI / NL2SQL 引擎的自定义指令 */
  customInstructions: string
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
