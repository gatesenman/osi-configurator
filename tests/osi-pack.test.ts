import { describe, expect, it } from 'vitest'
import { EXAMPLE_MODELS, inventoryModel } from '../lib/osi-examples'
import { exportPack, reportToMarkdown } from '../lib/osi-pack'
import { importSpec } from '../lib/osi-import'
import { validateModel } from '../lib/osi-validate'

describe('official-aligned example pack', () => {
  it('validates the sales and inventory examples', () => {
    expect(EXAMPLE_MODELS).toHaveLength(2)
    for (const model of EXAMPLE_MODELS) {
      const result = validateModel([model])
      expect(result.valid, `${model.name}: ${JSON.stringify(result.errors)}`).toBe(true)
    }
    expect(inventoryModel.name).toBe('inventory_semantic_model')
  })

  it('exports a YAML/JSON pack that reimports and still validates', () => {
    const pack = exportPack()
    expect(pack.kind).toBe('osi-pack')
    expect(pack.report.valid).toBe(true)
    const fromYaml = importSpec(pack.yaml)
    const fromJson = importSpec(pack.json)
    expect(fromYaml.ok).toBe(true)
    expect(fromJson.ok).toBe(true)
    expect(validateModel(fromYaml.models ?? []).valid).toBe(true)
    expect(validateModel(fromJson.models ?? []).valid).toBe(true)
    const md = reportToMarkdown(pack.report)
    expect(md).toContain('sales_semantic_model')
    expect(md).toContain('inventory_semantic_model')
    expect(md).toContain('valid')
  })
})
