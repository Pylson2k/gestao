import { NextResponse } from 'next/server'

/** Rota leve para monitoramento (Vercel, uptime); pública no middleware. */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'sinai-engenharia', ts: new Date().toISOString() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
