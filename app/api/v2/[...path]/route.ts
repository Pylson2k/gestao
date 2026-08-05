import { NextRequest, NextResponse } from 'next/server'
import { buildRustTarget, shouldUseRust } from '@/lib/rust-gateway'
import { logger } from '@/lib/logger'

async function proxyToRust(req: NextRequest): Promise<NextResponse> {
  const target = buildRustTarget(req)
  if (!target) {
    return NextResponse.json(
      { error: 'RUST_API_BASE_URL nao configurada para /api/v2' },
      { status: 503 }
    )
  }

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()
  const headers = new Headers(req.headers)
  const correlationId = req.headers.get('x-correlation-id') ?? crypto.randomUUID()
  headers.set('x-source-gateway', 'next-v2')
  headers.set('x-correlation-id', correlationId)

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
  })

  const text = await upstream.text()
  logger.info({
    scope: 'api-v2-gateway',
    message: 'Proxied request to rust backend',
    method: req.method,
    path: req.nextUrl.pathname,
    status: upstream.status,
    correlationId,
  })
  const responseHeaders = new Headers(upstream.headers)
  // O corpo foi re-lido via upstream.text() (já descomprimido); descartar
  // headers de compressão/encoding para não quebrar a resposta no navegador.
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')
  responseHeaders.delete('transfer-encoding')
  responseHeaders.set('x-correlation-id', correlationId)
  return new NextResponse(text, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

function unavailableResponse() {
  return NextResponse.json(
    { error: 'Dominio ainda nao habilitado em /api/v2 para Rust.' },
    { status: 503 }
  )
}

export async function GET(req: NextRequest) {
  if (!shouldUseRust(req)) return unavailableResponse()
  return proxyToRust(req)
}
export async function POST(req: NextRequest) {
  if (!shouldUseRust(req)) return unavailableResponse()
  return proxyToRust(req)
}
export async function PUT(req: NextRequest) {
  if (!shouldUseRust(req)) return unavailableResponse()
  return proxyToRust(req)
}
export async function PATCH(req: NextRequest) {
  if (!shouldUseRust(req)) return unavailableResponse()
  return proxyToRust(req)
}
export async function DELETE(req: NextRequest) {
  if (!shouldUseRust(req)) return unavailableResponse()
  return proxyToRust(req)
}
