/**
 * Normaliza DATABASE_URL colada no painel da Vercel
 * (aspas, prefixo "DATABASE_URL=", espaços).
 */
export function sanitizeDatabaseUrl(raw: string | undefined | null): string {
  if (raw == null) return ''
  let url = String(raw).trim()
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim()
  }
  if (/^DATABASE_URL\s*=\s*/i.test(url)) {
    url = url.replace(/^DATABASE_URL\s*=\s*/i, '').trim()
    if (
      (url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'"))
    ) {
      url = url.slice(1, -1).trim()
    }
  }
  return url
}

export function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//i.test(url)
}

/** Detecta placeholders comuns de .env.example que nunca conectam de verdade. */
export function isPlaceholderDatabaseUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.includes('://usuario:') || lower.includes('://user:password@')) return true
  if (lower.includes(':senha@') || lower.includes(':password@localhost')) return true
  if (lower.includes('localhost') && lower.includes('sinai_engenharia')) return true
  if (lower.includes('ep-xxxx') || lower.includes('seu-host')) return true
  return false
}

/** Aplica sanitização em process.env.DATABASE_URL (side-effect seguro). */
export function ensureSanitizedDatabaseUrl(): string {
  const cleaned = sanitizeDatabaseUrl(process.env.DATABASE_URL)
  if (cleaned) {
    process.env.DATABASE_URL = cleaned
  }
  return cleaned
}

export function describeDatabaseUrlProblem(url: string): string | null {
  if (!url) return 'DATABASE_URL ausente'
  if (!isPostgresUrl(url)) return 'DATABASE_URL nao comeca com postgresql://'
  if (isPlaceholderDatabaseUrl(url)) {
    return 'DATABASE_URL ainda e de exemplo (usuario/senha). Cole a URI REAL do Neon (botao Connect).'
  }
  return null
}
