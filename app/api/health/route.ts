import { NextResponse } from 'next/server'
import { getEnvHealth } from '@/lib/env'
import { logger } from '@/lib/logger'

/** Rota leve para monitoramento (Vercel, uptime); pública no middleware. */
export async function GET() {
  const env = getEnvHealth()
  const payload = {
    ok: true,
    service: 'sinai-engenharia',
    ts: new Date().toISOString(),
    env: {
      ok: env.ok,
      missing: env.missing,
    },
  }
  if (!env.ok) {
    logger.warn({
      scope: 'health',
      message: 'Required environment variables are missing',
      missing: env.missing,
    })
  }
  return NextResponse.json(
    payload,
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
