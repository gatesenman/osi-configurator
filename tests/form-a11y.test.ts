import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from '../electron/security.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('external URL allowlist', () => {
  it('allows https GitHub URLs and loopback http', () => {
    expect(isAllowedExternalUrl('https://github.com/gatesenman/osi-configurator')).toBe(true)
    expect(isAllowedExternalUrl('https://www.github.com/gatesenman/osi-configurator')).toBe(true)
    expect(isAllowedExternalUrl('http://127.0.0.1:3000')).toBe(true)
    expect(isAllowedExternalUrl('http://localhost:3000/')).toBe(true)
  })

  it('rejects unexpected schemes and hosts', () => {
    expect(isAllowedExternalUrl('https://evil.example/phishing')).toBe(false)
    expect(isAllowedExternalUrl('http://example.com')).toBe(false)
    expect(isAllowedExternalUrl('https://github.com.evil.example')).toBe(false)
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})

describe('configurator keyboard and contrast', () => {
  it('darkens muted label text past the old 0.5 lightness token', () => {
    const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/--muted-foreground:\s*oklch\(0\.42 0 0\)/)
    expect(css).not.toMatch(/--muted-foreground:\s*oklch\(0\.5 0 0\)/)
  })

  it('puts graph nodes and edges in the tab order and activates them from the keyboard', () => {
    const source = fs.readFileSync(path.join(root, 'components/osi/graph-view.tsx'), 'utf8')
    expect(source).toMatch(/tabIndex=\{0\}/)
    expect(source).toMatch(/onKeyDown=\{\(event\) => handleKey\(sel, event\)\}/)
    expect(source).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/)
  })
})
