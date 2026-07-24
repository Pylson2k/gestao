import { NextResponse } from 'next/server'
import { getEnvHealth } from '@/lib/env'
import { logger } from '@/lib/logger'

/** Rota leve para monitoramento; não revela nomes de variáveis em produção. */
export async function GET() {
  const env = getEnvHealth()
  if (!env.ok) {
    logger.warn({
      scope: 'health',
      message: 'Required environment variables are missing',
      missing: env.missing,
    })
  }
  return NextResponse.json(
    {
      ok: env.ok,
      service: 'sinai-engenharia',
      ts: new Date().toISOString(),
    },
    {
      status: env.ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
