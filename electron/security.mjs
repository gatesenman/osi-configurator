/** Allowlist for shell.openExternal: published GitHub pages and local dev servers. */
export function isAllowedExternalUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:') {
      return parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com'
    }
    if (parsed.protocol === 'http:') {
      const host = parsed.hostname
      return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
    }
    return false
  } catch {
    return false
  }
}
