import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// POST - Log user login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, username, success, error } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao informado' },
        { status: 400 }
      )
    }

    const metadata = getRequestMetadata(request)
    
    await createAuditLog({
      userId,
      action: success ? 'user_login' : 'failed_login',
      entityType: 'user',
      entityId: userId,
      description: success 
        ? `Usuário ${username} fez login no sistema`
        : `Tentativa de login falhou para usuário: ${username}${error ? ` - Erro: ${error}` : ''}`,
      newValue: {
        username,
        success,
        timestamp: new Date().toISOString(),
      },
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log login error:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar login' },
      { status: 500 }
    )
  }
}
