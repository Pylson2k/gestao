import { NextRequest, NextResponse } from 'next/server'

// Usuários de emergência (quando não há banco de dados)
const EMERGENCY_USERS = [
  { id: '1', username: 'gustavo', name: 'Gustavo', email: 'gustavo@servipro.com' },
  { id: '2', username: 'giovanni', name: 'Giovanni', email: 'giovanni@servipro.com' },
]

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const user = EMERGENCY_USERS.find(u => u.id === userId)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario nao encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        user,
        mustChangePassword: false,
      })
    }

    // Modo normal com banco de dados
    const { prisma } = await import('@/lib/prisma')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        mustChangePassword: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user,
      mustChangePassword: user.mustChangePassword,
    })
  } catch (error) {
    console.error('Session error:', error)
    
    // Fallback para modo de emergência
    const userId = request.headers.get('x-user-id')
    if (userId) {
      const user = EMERGENCY_USERS.find(u => u.id === userId)
      if (user) {
        return NextResponse.json({
          user,
          mustChangePassword: false,
        })
      }
    }
    
    return NextResponse.json(
      { error: 'Erro ao verificar sessao' },
      { status: 500 }
    )
  }
}
