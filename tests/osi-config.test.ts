import { describe, expect, it } from 'vitest'
import { defaultModel, emptyModel } from '../lib/osi-defaults'
import { emptyAiContext } from '../lib/osi-types'
import { importSpec } from '../lib/osi-import'
import { lintCounts, lintModel } from '../lib/osi-lint'
import { toJson, toYaml } from '../lib/osi-serialize'
import { validateModel } from '../lib/osi-validate'

describe('validateModel', () => {
  it('accepts the bundled sales example', () => {
    const result = validateModel([defaultModel])
    expect(
      result.valid,
      result.errors.map((error) => `${error.path}: ${error.message}`).join('\n'),
    ).toBe(true)
  })

  it('accepts a newly created empty model that satisfies datasets minItems', () => {
    const result = validateModel([emptyModel('blank')])
    expect(result.valid, JSON.stringify(result.errors)).toBe(true)
  })

  it('rejects a model with no datasets', () => {
    const broken = { ...emptyModel(), datasets: [] }
    const result = validateModel([broken])
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((error) => /datasets|至少|minItems/i.test(`${error.path} ${error.message}`)),
    ).toBe(true)
  })
})

describe('importSpec / serialize round trip', () => {
  it('reimports YAML produced from the default model and it still validates', () => {
    const yaml = toYaml([defaultModel])
    const imported = importSpec(yaml)
    expect(imported.ok).toBe(true)
    expect(imported.models).toHaveLength(1)
    expect(imported.models?.[0].name).toBe(defaultModel.name)
    const again = validateModel(imported.models ?? [])
    expect(again.valid, JSON.stringify(again.errors)).toBe(true)
  })

  it('reimports JSON produced from the default model and it still validates', () => {
    const imported = importSpec(toJson([defaultModel]))
    expect(imported.ok).toBe(true)
    expect(validateModel(imported.models ?? []).valid).toBe(true)
  })

  it('rejects text that is not an OSI spec', () => {
    expect(importSpec('not-a-spec: 1').ok).toBe(false)
    expect(importSpec('{}').ok).toBe(false)
    expect(importSpec('').ok).toBe(false)
  })
})

describe('lintModel', () => {
  it('reports no errors for the bundled sales example', () => {
    const counts = lintCounts(lintModel(defaultModel))
    expect(counts.error).toBe(0)
  })

  it('flags a relationship that points at a missing dataset', () => {
    const model = emptyModel()
    model.relationships.push({
      id: 'r1',
      name: 'bad_rel',
      fromDatasetId: 'missing',
      toDatasetId: model.datasets[0].id,
      fromColumns: ['id'],
      toColumns: ['id'],
      aiContext: emptyAiContext(),
      customExtensions: [],
    })
    const issues = lintModel(model)
    expect(issues.some((issue) => issue.rule === 'dangling-relationship' && issue.severity === 'error')).toBe(
      true,
    )
  })
})
