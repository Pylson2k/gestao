import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Verificar chave secreta para segurança
    const { searchParams } = new URL(request.url)
    const secretKey = searchParams.get('key')
    
    if (secretKey !== 'sinai2026reset') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
    }

    // Dynamic imports para Prisma 7.3.0
    const { PrismaClient } = await import('@prisma/client')
    const { hash } = await import('bcryptjs')
    
    const prisma = new PrismaClient()
    
    // Senhas padrão
    const hashedPassword1 = await hash('gustavo123', 10)
    const hashedPassword2 = await hash('giovanni123', 10)
    
    // Reset gustavo
    await prisma.user.upsert({
      where: { username: 'gustavo' },
      update: {
        password: hashedPassword1,
        mustChangePassword: true,
      },
      create: {
        username: 'gustavo',
        name: 'Gustavo',
        email: 'gustavo@servipro.com',
        password: hashedPassword1,
        mustChangePassword: true,
      },
    })
    
    // Reset giovanni
    await prisma.user.upsert({
      where: { username: 'giovanni' },
      update: {
        password: hashedPassword2,
        mustChangePassword: true,
      },
      create: {
        username: 'giovanni',
        name: 'Giovanni',
        email: 'giovanni@servipro.com',
        password: hashedPassword2,
        mustChangePassword: true,
      },
    })
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: 'Senhas resetadas com sucesso!',
      users: [
        { username: 'gustavo', password: 'gustavo123' },
        { username: 'giovanni', password: 'giovanni123' },
      ],
    })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json(
      { error: 'Erro ao resetar senhas', details: String(error) },
      { status: 500 }
    )
  }
}
