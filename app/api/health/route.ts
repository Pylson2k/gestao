import { NextResponse } from 'next/server'
import { ensureSanitizedDatabaseUrl, isPostgresUrl } from '@/lib/database-url'
import { logger } from '@/lib/logger'

/** Diagnóstico seguro — não revela segredos nem a URL completa. */
export async function GET() {
  const databaseUrl = ensureSanitizedDatabaseUrl()
  const hasDatabaseUrl = Boolean(databaseUrl)
  const databaseUrlOk = hasDatabaseUrl && isPostgresUrl(databaseUrl)
  const hasSessionSecret = Boolean(
    (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) ||
      (process.env.ADMIN_OPERATIONS_SECRET && process.env.ADMIN_OPERATIONS_SECRET.length >= 16) ||
      databaseUrlOk
  )

  let databaseReachable: boolean | null = null
  if (databaseUrlOk) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      databaseReachable = true
    } catch (e) {
      databaseReachable = false
      logger.warn({
        scope: 'health',
        message: 'Database ping failed',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const ok = databaseUrlOk && hasSessionSecret && databaseReachable !== false

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
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
