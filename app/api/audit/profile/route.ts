import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// POST - Log profile changes
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { action, username, oldValue, newValue } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const metadata = getRequestMetadata(request)
    
    await createAuditLog({
      userId,
      action: action as any, // 'change_password' | 'change_email'
      entityType: 'user',
      entityId: userId,
      description: action === 'change_password' 
        ? `Usuário ${username} alterou a senha`
        : `Usuário ${username} alterou o email de "${oldValue}" para "${newValue}"`,
      oldValue: action === 'change_password' ? undefined : { email: oldValue },
      newValue: action === 'change_password' ? { changed: true } : { email: newValue },
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log profile change error:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar mudança de perfil' },
      { status: 500 }
    )
  }
}
