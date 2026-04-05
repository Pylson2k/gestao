import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { OWNER_SESSION_USER_ID, OWNER_USERNAME } from '@/lib/owner-user'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const username = String(body.username ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')

    if (username !== OWNER_USERNAME) {
      return NextResponse.json(
        { success: false, error: 'Usuario ou senha invalidos' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados nao configurado' },
        { status: 503 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario ou senha invalidos' },
        { status: 401 }
      )
    }

    const valid = await compare(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Usuario ou senha invalidos' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: OWNER_SESSION_USER_ID,
        username: user.username,
        name: user.name,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
      },
    })
  } catch (e) {
    console.error('Login API error:', e)
    return NextResponse.json(
      { success: false, error: 'Erro ao entrar. Tente novamente.' },
      { status: 500 }
    )
  }
}
