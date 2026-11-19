import type { OsiModel } from './osi-types'
import { EXAMPLE_MODELS } from './osi-examples'
import { toJson, toYaml } from './osi-serialize'
import { validateModel, type OsiValidationResult } from './osi-validate'

export interface OsiPackReport {
  valid: boolean
  models: { name: string; valid: boolean; errors: OsiValidationResult['errors'] }[]
}

export interface OsiPack {
  kind: 'osi-pack'
  version: number
  yaml: string
  json: string
  report: OsiPackReport
}

export function buildValidateReport(models: OsiModel[] = EXAMPLE_MODELS): OsiPackReport {
  const rows = models.map((model) => {
    const result = validateModel([model])
    return { name: model.name, valid: result.valid, errors: result.errors }
  })
  return { valid: rows.every((row) => row.valid), models: rows }
}

export function reportToMarkdown(report: OsiPackReport): string {
  const lines = [
    '# OSI validate report',
    '',
    `Result: ${report.valid ? 'valid' : 'invalid'}`,
    '',
  ]
  for (const row of report.models) {
    lines.push(`- ${row.name}: ${row.valid ? 'valid' : 'invalid'}`)
    for (const err of row.errors) {
      lines.push(`  - ${err.path}: ${err.message}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

export function exportPack(models: OsiModel[] = EXAMPLE_MODELS): OsiPack {
  return {
    kind: 'osi-pack',
    version: 1,
    yaml: toYaml(models),
    json: toJson(models),
    report: buildValidateReport(models),
  }
}
