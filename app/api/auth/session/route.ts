import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

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
    return NextResponse.json(
      { error: 'Erro ao verificar sessao' },
      { status: 500 }
    )
  }
}
