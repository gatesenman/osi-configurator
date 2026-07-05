/**
 * 编辑器模型：与官方 OSI JSON Schema (v0.2.0.dev0) 1:1 对应。
 * 每个接口的每个属性都映射到 osi-schema.json 中的一个配置点。
 * id 字段仅供编辑器内部使用（React key 与双向高亮），不会输出到规范。
 */

/** $defs/Dialect：官方支持的表达式方言枚举 */
export type Dialect = 'ANSI_SQL' | 'SNOWFLAKE' | 'MDX' | 'TABLEAU' | 'DATABRICKS' | 'MAQL'

export const DIALECTS: Dialect[] = [
  'ANSI_SQL',
  'SNOWFLAKE',
  'MDX',
  'TABLEAU',
  'DATABRICKS',
  'MAQL',
]

/** $defs/Vendor 官方示例值（任意字符串均合法） */
export const VENDOR_EXAMPLES = [
  'COMMON',
  'SNOWFLAKE',
  'SALESFORCE',
  'DBT',
  'DATABRICKS',
  'GOODDATA',
]

/** $defs/DialectExpression：{ dialect, expression } */
export interface OsiDialectExpression {
  id: string
  dialect: Dialect
  expression: string
}

/**
 * $defs/AIContext：oneOf [string, { instructions, synonyms, examples }]
 * enabled=false 时不输出 ai_context；mode 切换字符串 / 结构化两种官方形态
 */
export interface OsiAiContext {
  enabled: boolean
  mode: 'text' | 'structured'
  /** 字符串形态 */
  text: string
  /** 结构化形态：AI 使用说明 */
  instructions: string
  /** 结构化形态：同义词 */
  synonyms: string[]
  /** 结构化形态：示例问题 / 用例 */
  examples: string[]
}

/** $defs/CustomExtension：{ vendor_name, data }（data 为 JSON 字符串） */
export interface OsiCustomExtension {
  id: string
  vendorName: string
  data: string
}

/** Field.dimension.is_time 的三态：不输出 dimension / 输出 {} / 输出 { is_time } */
export type DimensionMode = 'none' | 'plain' | 'time' | 'not_time'

/** $defs/Field：数据集中的行级字段 */
export interface OsiField {
  id: string
  /** required */
  name: string
  /** required：expression.dialects（minItems: 1） */
  dialects: OsiDialectExpression[]
  /** dimension 配置点（含 is_time 布尔） */
  dimensionMode: DimensionMode
  label: string
  description: string
  aiContext: OsiAiContext
  customExtensions: OsiCustomExtension[]
}

/** Dataset.unique_keys 中的一组唯一键（可单列或复合） */
export interface OsiUniqueKey {
  id: string
  columns: string[]
}

/** $defs/Dataset：逻辑数据集 */
export interface OsiDataset {
  id: string
  /** required */
  name: string
  /** required：物理表 database.schema.table 或查询 */
  source: string
  /** primary_key：单列或复合主键 */
  primaryKey: string[]
  /** unique_keys：多组唯一键定义 */
  uniqueKeys: OsiUniqueKey[]
  description: string
  aiContext: OsiAiContext
  fields: OsiField[]
  customExtensions: OsiCustomExtension[]
}

/** $defs/Relationship：数据集间外键关系 */
export interface OsiRelationship {
  id: string
  /** required */
  name: string
  /** required：多方数据集（引用 dataset id，输出时转为 name） */
  fromDatasetId: string
  /** required：一方数据集 */
  toDatasetId: string
  /** required：from 侧外键列（minItems: 1，支持复合） */
  fromColumns: string[]
  /** required：to 侧主/唯一键列（minItems: 1，支持复合） */
  toColumns: string[]
  aiContext: OsiAiContext
  customExtensions: OsiCustomExtension[]
}

/** $defs/Metric：业务度量指标 */
export interface OsiMetric {
  id: string
  /** required */
  name: string
  /** required：expression.dialects（minItems: 1） */
  dialects: OsiDialectExpression[]
  description: string
  aiContext: OsiAiContext
  customExtensions: OsiCustomExtension[]
}

/** $defs/SemanticModel：顶层语义模型容器 */
export interface OsiModel {
  /** required */
  name: string
  description: string
  aiContext: OsiAiContext
  /** required（minItems: 1） */
  datasets: OsiDataset[]
  relationships: OsiRelationship[]
  metrics: OsiMetric[]
  customExtensions: OsiCustomExtension[]
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function emptyAiContext(): OsiAiContext {
  return {
    enabled: false,
    mode: 'structured',
    text: '',
    instructions: '',
    synonyms: [],
    examples: [],
  }
}
