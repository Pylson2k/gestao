import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { consolidateDataToSingleOwner } from '@/lib/single-owner-migration'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secretKey = searchParams.get('key')

    const expected = process.env.ADMIN_OPERATIONS_SECRET
    if (!expected || secretKey !== expected) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            'DATABASE_URL não configurada. Configure a variável com a URL do PostgreSQL.',
          hasDbUrl: false,
        },
        { status: 500 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const hashedPassword = await hash('gustavo123', 10)

    await prisma.user.upsert({
      where: { username: 'gustavo' },
      update: {
        password: hashedPassword,
        mustChangePassword: true,
      },
      create: {
        username: 'gustavo',
        name: 'Gustavo',
        email: 'gustavo@servipro.com',
        password: hashedPassword,
        mustChangePassword: true,
      },
    })

    await consolidateDataToSingleOwner(prisma)

    return NextResponse.json({
      success: true,
      message: 'Senha resetada e contas extras removidas.',
      users: [{ username: 'gustavo', password: 'gustavo123' }],
    })
  } catch (error: any) {
    console.error('Reset error:', error)
    return NextResponse.json(
      {
        error: 'Erro ao resetar senhas',
        details: error?.message || String(error),
        code: error?.code,
      },
      { status: 500 }
    )
  }
}
