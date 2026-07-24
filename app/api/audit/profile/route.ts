import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'
import { requireOwnerOr401 } from '@/lib/require-auth'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

export async function POST(request: NextRequest) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  try {
    const body = await request.json().catch(() => ({}))
    const metadata = getRequestMetadata(request)

    await createAuditLog({
      userId: OWNER_SESSION_USER_ID,
      action: 'update_profile',
      entityType: 'user',
      entityId: OWNER_SESSION_USER_ID,
      description:
        typeof body.description === 'string'
          ? body.description
          : 'Perfil atualizado',
      oldValue: body.oldValue,
      newValue: body.newValue,
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log profile error:', error)
    return NextResponse.json({ error: 'Erro ao registrar auditoria de perfil' }, { status: 500 })
  }
}
