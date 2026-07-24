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

/** Aplica sanitização em process.env.DATABASE_URL (side-effect seguro). */
export function ensureSanitizedDatabaseUrl(): string {
  const cleaned = sanitizeDatabaseUrl(process.env.DATABASE_URL)
  if (cleaned) {
    process.env.DATABASE_URL = cleaned
  }
  return cleaned
}
