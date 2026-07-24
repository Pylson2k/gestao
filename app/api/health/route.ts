import { NextResponse } from 'next/server'
import { ensureSanitizedDatabaseUrl, isPostgresUrl, isPlaceholderDatabaseUrl } from '@/lib/database-url'
import { logger } from '@/lib/logger'

/** Diagnóstico seguro — não revela segredos nem a URL completa. */
export async function GET() {
  const databaseUrl = ensureSanitizedDatabaseUrl()
  const hasDatabaseUrl = Boolean(databaseUrl)
  const databaseUrlFormatOk = hasDatabaseUrl && isPostgresUrl(databaseUrl)
  const isPlaceholder = hasDatabaseUrl && isPlaceholderDatabaseUrl(databaseUrl)
  const databaseUrlOk = databaseUrlFormatOk && !isPlaceholder
  const hasSessionSecret = Boolean(
    (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) ||
      (process.env.ADMIN_OPERATIONS_SECRET && process.env.ADMIN_OPERATIONS_SECRET.length >= 16) ||
      databaseUrlOk
  )

  let databaseReachable: boolean | null = null
  let databaseError: string | null = null
  if (isPlaceholder) {
    databaseReachable = false
    databaseError =
      'DATABASE_URL de exemplo detectada (usuario/senha). Substitua pela URI real do Neon.'
  } else if (databaseUrlOk) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      databaseReachable = true
    } catch (e) {
      databaseReachable = false
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('28P01') || msg.includes('password authentication failed')) {
        databaseError =
          'Senha/usuario do banco errados na DATABASE_URL. Abra o Neon → Connect → copie a URI de novo.'
      } else {
        databaseError = msg.slice(0, 160)
      }
      logger.warn({
        scope: 'health',
        message: 'Database ping failed',
        error: msg,
      })
    }
  }

  const ok = databaseUrlOk && hasSessionSecret && databaseReachable === true

  return NextResponse.json(
    {
      ok,
      service: 'sinai-engenharia',
      ts: new Date().toISOString(),
      checks: {
        databaseUrl: databaseUrlOk,
        sessionSecret: hasSessionSecret,
        databaseReachable,
      },
      hint: databaseError,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
