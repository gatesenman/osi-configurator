import type { OsiModel } from './osi-types'
import { emptyAiContext, uid } from './osi-types'

/** 新建空白语义模型（含一个空数据集，满足 datasets minItems: 1） */
export function emptyModel(name = 'new_semantic_model'): OsiModel {
  return {
    name,
    description: '',
    aiContext: emptyAiContext(),
    datasets: [
      {
        id: uid(),
        name: 'dataset_1',
        source: '',
        primaryKey: [],
        uniqueKeys: [],
        description: '',
        aiContext: emptyAiContext(),
        fields: [],
        customExtensions: [],
      },
    ],
    relationships: [],
    metrics: [],
    customExtensions: [],
  }
}

/**
 * 示例语义模型：销售域（订单 + 客户）。
 * 覆盖官方 schema 的全部配置点：多方言表达式、复合唯一键、
 * 字符串/结构化两种 ai_context、dimension 三态、custom_extensions。
 */
export const defaultModel: OsiModel = {
  name: 'sales_semantic_model',
  description: '销售域语义模型：覆盖订单事实与客户维度，供 BI 与 AI 分析工具消费',
  aiContext: {
    enabled: true,
    extra: '',
    mode: 'structured',
    text: '',
    instructions: '回答销售相关问题时优先使用本模型定义的指标口径，金额均为人民币。',
    synonyms: ['销售模型', 'sales model'],
    examples: ['上个月的总销售额是多少？', '按地区拆分的客户数'],
  },
  customExtensions: [
    {
      id: 'ce_model_1',
      vendorName: 'COMMON',
      data: '{"owner": "data-platform-team", "domain": "sales", "certified": true}',
    },
  ],
  datasets: [
    {
      id: 'ds_orders',
      name: 'orders',
      source: 'analytics.sales.fct_orders',
      primaryKey: ['order_id'],
      uniqueKeys: [{ id: 'uk_orders_1', columns: ['order_number', 'order_source'] }],
      description: '订单事实表，一行代表一笔订单',
      aiContext: {
        enabled: true,
    extra: '',
        mode: 'text',
        text: '订单数据自 2020 年起完整，此前数据仅供参考。',
        instructions: '',
        synonyms: [],
        examples: [],
      },
      customExtensions: [
        {
          id: 'ce_ds_1',
          vendorName: 'DBT',
          data: '{"model": "fct_orders", "materialization": "incremental"}',
        },
      ],
      fields: [
        {
          id: 'f_order_id',
          name: 'order_id',
          dialects: [{ id: 'de_1', dialect: 'ANSI_SQL', expression: 'order_id' }],
          dimensionMode: 'plain',
          label: '订单 ID',
          description: '订单唯一标识',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
        {
          id: 'f_order_date',
          name: 'order_date',
          dialects: [
            { id: 'de_2', dialect: 'ANSI_SQL', expression: 'CAST(order_ts AS DATE)' },
            { id: 'de_3', dialect: 'SNOWFLAKE', expression: 'TO_DATE(order_ts)' },
          ],
          dimensionMode: 'time',
          label: '下单日期',
          description: '订单创建日期，时间维度',
          aiContext: {
            enabled: true,
    extra: '',
            mode: 'structured',
            text: '',
            instructions: '默认按此字段做时间过滤与趋势分析',
            synonyms: ['下单时间', '订单日期'],
            examples: [],
          },
          customExtensions: [],
        },
        {
          id: 'f_customer_id',
          name: 'customer_id',
          dialects: [{ id: 'de_4', dialect: 'ANSI_SQL', expression: 'customer_id' }],
          dimensionMode: 'plain',
          label: '客户 ID',
          description: '下单客户外键',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
        {
          id: 'f_order_amount',
          name: 'order_amount',
          dialects: [{ id: 'de_5', dialect: 'ANSI_SQL', expression: 'order_amount' }],
          dimensionMode: 'none',
          label: '订单金额',
          description: '订单总金额（元，不含税）',
          aiContext: {
            enabled: true,
    extra: '',
            mode: 'structured',
            text: '',
            instructions: '',
            synonyms: ['金额', '销售额'],
            examples: [],
          },
          customExtensions: [],
        },
        {
          id: 'f_order_status',
          name: 'order_status',
          dialects: [{ id: 'de_6', dialect: 'ANSI_SQL', expression: 'order_status' }],
          dimensionMode: 'not_time',
          label: '订单状态',
          description: '取值：pending / completed / cancelled',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
      ],
    },
    {
      id: 'ds_customers',
      name: 'customers',
      source: 'analytics.sales.dim_customers',
      primaryKey: ['customer_id'],
      uniqueKeys: [{ id: 'uk_cust_1', columns: ['email'] }],
      description: '客户维度表，一行代表一个客户',
      aiContext: emptyAiContext(),
      customExtensions: [],
      fields: [
        {
          id: 'f_cust_id',
          name: 'customer_id',
          dialects: [{ id: 'de_7', dialect: 'ANSI_SQL', expression: 'customer_id' }],
          dimensionMode: 'plain',
          label: '客户 ID',
          description: '客户唯一标识',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
        {
          id: 'f_cust_region',
          name: 'region',
          dialects: [{ id: 'de_8', dialect: 'ANSI_SQL', expression: 'region' }],
          dimensionMode: 'plain',
          label: '地区',
          description: '客户所在大区：华东 / 华北 / 华南 / 西部',
          aiContext: {
            enabled: true,
    extra: '',
            mode: 'structured',
            text: '',
            instructions: '',
            synonyms: ['区域', '大区'],
            examples: ['各地区的销售额对比'],
          },
          customExtensions: [],
        },
      ],
    },
  ],
  relationships: [
    {
      id: 'rel_orders_customers',
      name: 'orders_to_customers',
      fromDatasetId: 'ds_orders',
      toDatasetId: 'ds_customers',
      fromColumns: ['customer_id'],
      toColumns: ['customer_id'],
      aiContext: {
        enabled: true,
    extra: '',
        mode: 'text',
        text: '每笔订单归属唯一客户（多对一）',
        instructions: '',
        synonyms: [],
        examples: [],
      },
      customExtensions: [],
    },
  ],
  metrics: [
    {
      id: 'm_total_sales',
      name: 'total_sales',
      dialects: [
        {
          id: 'de_m1',
          dialect: 'ANSI_SQL',
          expression: "SUM(CASE WHEN order_status = 'completed' THEN order_amount ELSE 0 END)",
        },
        {
          id: 'de_m2',
          dialect: 'DATABRICKS',
          expression: "SUM(IF(order_status = 'completed', order_amount, 0))",
        },
      ],
      description: '总销售额：已完成订单的金额合计（元）',
      aiContext: {
        enabled: true,
    extra: '',
        mode: 'structured',
        text: '',
        instructions: '这是认证指标，销售额问题一律使用本指标',
        synonyms: ['销售额', 'GMV', '营收'],
        examples: ['今年的总销售额', '各地区销售额排名'],
      },
      customExtensions: [
        {
          id: 'ce_m_1',
          vendorName: 'SNOWFLAKE',
          data: '{"verified_query_enabled": true}',
        },
      ],
    },
    {
      id: 'm_order_count',
      name: 'order_count',
      dialects: [
        { id: 'de_m3', dialect: 'ANSI_SQL', expression: 'COUNT(DISTINCT order_id)' },
      ],
      description: '订单量：去重订单数',
      aiContext: emptyAiContext(),
      customExtensions: [],
    },
  ],
}
