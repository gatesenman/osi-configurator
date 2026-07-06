/**
 * 厂商扩展预设：OSI 的 custom_extensions 允许任意 vendor_name + JSON data，
 * 各厂商的常用配置键不同。预设提供常用键提示与模板，帮助快速配置，
 * 同时保持任意自定义键的完全自由（官方 $defs/Vendor 为任意字符串）。
 */

export interface VendorKeyHint {
  /** 配置键名 */
  key: string
  /** 用途说明 */
  hint: string
  /** 示例值（JSON 字面量字符串，如 '"daily"' / 'true' / '["a"]'） */
  example: string
}

export interface VendorPreset {
  /** vendor_name 值 */
  name: string
  /** 展示说明 */
  description: string
  /** 该厂商的常用配置键 */
  keys: VendorKeyHint[]
}

export const VENDOR_PRESETS: VendorPreset[] = [
  {
    name: 'COMMON',
    description: '跨厂商通用展示与治理属性',
    keys: [
      { key: 'format', hint: '数值/日期展示格式', example: '"#,##0.00"' },
      { key: 'hidden', hint: '是否在 BI 工具中隐藏', example: 'false' },
      { key: 'display_folder', hint: '展示分组目录', example: '"销售/核心指标"' },
      { key: 'certified', hint: '是否经过认证', example: 'true' },
      { key: 'owner', hint: '负责人', example: '"data-team"' },
    ],
  },
  {
    name: 'SNOWFLAKE',
    description: 'Snowflake 语义视图与治理配置',
    keys: [
      { key: 'warehouse', hint: '默认计算仓库', example: '"ANALYTICS_WH"' },
      { key: 'secure', hint: '是否安全视图', example: 'true' },
      { key: 'cluster_by', hint: '聚簇键', example: '["order_date"]' },
      { key: 'tags', hint: '对象标签（治理/脱敏）', example: '{"pii": "false"}' },
      { key: 'comment', hint: '对象备注', example: '"由 OSI 生成"' },
    ],
  },
  {
    name: 'DBT',
    description: 'dbt 模型与语义层配置',
    keys: [
      { key: 'materialized', hint: '物化方式', example: '"table"' },
      { key: 'tags', hint: 'dbt 标签', example: '["core", "daily"]' },
      { key: 'group', hint: '所属模型分组', example: '"finance"' },
      { key: 'meta', hint: '任意元数据', example: '{"owner": "analytics"}' },
      { key: 'access', hint: '访问级别', example: '"protected"' },
    ],
  },
  {
    name: 'DATABRICKS',
    description: 'Databricks Unity Catalog 配置',
    keys: [
      { key: 'catalog', hint: 'Unity Catalog 目录', example: '"main"' },
      { key: 'schema', hint: '目标 schema', example: '"gold"' },
      { key: 'tbl_properties', hint: '表属性', example: '{"delta.appendOnly": "false"}' },
      { key: 'comment', hint: '对象备注', example: '"语义层实体"' },
    ],
  },
  {
    name: 'GOODDATA',
    description: 'GoodData 分析平台配置',
    keys: [
      { key: 'folder', hint: '指标/属性所属目录', example: '"Sales Metrics"' },
      { key: 'format', hint: 'GoodData 展示格式', example: '"#,##0"' },
      { key: 'drill_down', hint: '下钻目标', example: '"attr.orders.city"' },
    ],
  },
  {
    name: 'SALESFORCE',
    description: 'Salesforce 数据云映射配置',
    keys: [
      { key: 'object', hint: '映射的 Salesforce 对象', example: '"Opportunity"' },
      { key: 'field_mapping', hint: '字段映射关系', example: '{"amount": "Amount__c"}' },
      { key: 'data_space', hint: '所属数据空间', example: '"default"' },
    ],
  },
]

/** 按 vendor_name 查找预设（不区分大小写）；未收录的厂商返回 undefined（仍可自由配置） */
export function findVendorPreset(name: string): VendorPreset | undefined {
  const upper = name.trim().toUpperCase()
  return VENDOR_PRESETS.find((p) => p.name === upper)
}

/** 生成该厂商的模板 JSON 字符串（全部常用键 + 示例值） */
export function vendorTemplate(preset: VendorPreset): string {
  const obj: Record<string, unknown> = {}
  for (const k of preset.keys) {
    try {
      obj[k.key] = JSON.parse(k.example)
    } catch {
      obj[k.key] = k.example
    }
  }
  return JSON.stringify(obj, null, 2)
}
