import { NextResponse } from 'next/server'

/**
 * Portal do trabalhador ainda não tem backend implementado.
 * Evita 404 genérico nas chamadas do front `/api/worker/*`.
 */
function notImplemented() {
  return NextResponse.json(
    {
      error: 'Portal do trabalhador em desenvolvimento',
      code: 'WORKER_API_NOT_IMPLEMENTED',
    },
    { status: 501 }
  )
}

export async function GET() {
  return notImplemented()
}

export async function POST() {
  return notImplemented()
}

export async function PUT() {
  return notImplemented()
}

export async function PATCH() {
  return notImplemented()
}

export async function DELETE() {
  return notImplemented()
}
