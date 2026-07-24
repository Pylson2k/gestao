/**
 * Aceita apenas http(s) ou data:image/* para logos. Bloqueia javascript: e data:text/html.
 */
export function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2_000_000) return false

  const lower = trimmed.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return false
  if (lower.startsWith('data:')) {
    // svg+xml omitido de propósito (pode embutir script)
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(trimmed)
  }
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
