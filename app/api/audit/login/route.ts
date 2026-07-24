import { NextResponse } from 'next/server'

/**
 * Legado: o login já registra auditoria em `/api/auth/login`.
 * Mantido como no-op autenticado para não quebrar clientes antigos.
 */
export async function POST() {
  return NextResponse.json({ success: true, deprecated: true })
}
