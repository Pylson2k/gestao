import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// POST - Log user logout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, username } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao informado' },
        { status: 400 }
      )
    }

    const metadata = getRequestMetadata(request)
    
    await createAuditLog({
      userId,
      action: 'user_logout',
      entityType: 'user',
      entityId: userId,
      description: `Usuário ${username} fez logout do sistema`,
      newValue: {
        username,
        timestamp: new Date().toISOString(),
      },
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log logout error:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar logout' },
      { status: 500 }
    )
  }
}
