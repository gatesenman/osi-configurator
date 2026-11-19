import { emptyAiContext } from './osi-types'
import type { OsiModel } from './osi-types'
import { defaultModel } from './osi-defaults'

/** Official-aligned inventory example: products + warehouses. */
export const inventoryModel: OsiModel = {
  name: 'inventory_semantic_model',
  description: '库存域语义模型：商品与仓库，供盘点和补货分析',
  aiContext: {
    enabled: true,
    extra: '',
    mode: 'structured',
    text: '',
    instructions: '回答库存问题时使用本模型的口径，数量单位为件。',
    synonyms: ['库存模型', 'inventory model'],
    examples: ['各仓库的在库数量是多少？'],
  },
  customExtensions: [],
  datasets: [
    {
      id: 'ds_products',
      name: 'products',
      source: 'analytics.inventory.dim_products',
      primaryKey: ['product_id'],
      uniqueKeys: [],
      description: '商品维度表',
      aiContext: emptyAiContext(),
      customExtensions: [],
      fields: [
        {
          id: 'f_product_id',
          name: 'product_id',
          dialects: [{ id: 'inv_de_1', dialect: 'ANSI_SQL', expression: 'product_id' }],
          dimensionMode: 'plain',
          label: '商品 ID',
          description: '商品唯一标识',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
        {
          id: 'f_sku',
          name: 'sku',
          dialects: [{ id: 'inv_de_2', dialect: 'ANSI_SQL', expression: 'sku' }],
          dimensionMode: 'plain',
          label: 'SKU',
          description: '库存单元编码',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
      ],
    },
    {
      id: 'ds_warehouses',
      name: 'warehouses',
      source: 'analytics.inventory.dim_warehouses',
      primaryKey: ['warehouse_id'],
      uniqueKeys: [],
      description: '仓库维度表',
      aiContext: emptyAiContext(),
      customExtensions: [],
      fields: [
        {
          id: 'f_warehouse_id',
          name: 'warehouse_id',
          dialects: [{ id: 'inv_de_3', dialect: 'ANSI_SQL', expression: 'warehouse_id' }],
          dimensionMode: 'plain',
          label: '仓库 ID',
          description: '仓库唯一标识',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
        {
          id: 'f_on_hand',
          name: 'on_hand',
          dialects: [{ id: 'inv_de_4', dialect: 'ANSI_SQL', expression: 'on_hand' }],
          dimensionMode: 'none',
          label: '在库数量',
          description: '当前在库件数',
          aiContext: emptyAiContext(),
          customExtensions: [],
        },
      ],
    },
  ],
  relationships: [],
  metrics: [
    {
      id: 'm_on_hand_total',
      name: 'on_hand_total',
      dialects: [{ id: 'inv_de_m1', dialect: 'ANSI_SQL', expression: 'SUM(on_hand)' }],
      description: '在库总件数',
      aiContext: emptyAiContext(),
      customExtensions: [],
    },
  ],
}

export const EXAMPLE_MODELS: OsiModel[] = [defaultModel, inventoryModel]
