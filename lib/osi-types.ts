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

export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface OsiDimension {
  id: string
  name: string
  expr: string
  dataType: DataType
  description: string
  synonyms: string[]
  isTimeDimension: boolean
  granularity?: TimeGranularity
  isPrimaryKey: boolean
}

export interface OsiDataset {
  id: string
  name: string
  description: string
  database: string
  schema: string
  table: string
  dimensions: OsiDimension[]
}

export interface OsiMetric {
  id: string
  name: string
  label: string
  datasetId: string
  expr: string
  agg: AggregationType
  format: string
  description: string
  synonyms: string[]
}

export interface OsiRelationship {
  id: string
  name: string
  fromDatasetId: string
  fromColumn: string
  toDatasetId: string
  toColumn: string
  type: RelationshipType
}

export interface OsiModelInfo {
  name: string
  version: string
  description: string
  owner: string
  domain: string
  certified: boolean
  tags: string[]
}

export interface OsiModel {
  info: OsiModelInfo
  datasets: OsiDataset[]
  metrics: OsiMetric[]
  relationships: OsiRelationship[]
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
