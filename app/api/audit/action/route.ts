import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// POST - Log custom action
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { action, entityType, entityId, description, oldValue, newValue } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const metadata = getRequestMetadata(request)
    
    await createAuditLog({
      userId,
      action: action as any,
      entityType: entityType as any,
      entityId: entityId || 'unknown',
      description: description || `Ação: ${action}`,
      oldValue,
      newValue,
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log action error:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar ação' },
      { status: 500 }
    )
  }
}
