import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata, type AuditAction, type EntityType } from '@/lib/audit-log'
import { requireOwnerOr401 } from '@/lib/require-auth'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

// POST - Log custom action (sempre atribui ao dono autenticado)
export async function POST(request: NextRequest) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { action, entityType, entityId, description, oldValue, newValue } = body

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Acao obrigatoria' }, { status: 400 })
    }

    const metadata = getRequestMetadata(request)

    await createAuditLog({
      userId: OWNER_SESSION_USER_ID,
      action: action as AuditAction,
      entityType: (entityType || 'export') as EntityType,
      entityId: typeof entityId === 'string' ? entityId : 'unknown',
      description: typeof description === 'string' ? description : `Ação: ${action}`,
      oldValue,
      newValue,
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log action error:', error)
    return NextResponse.json({ error: 'Erro ao registrar ação' }, { status: 500 })
  }
}
