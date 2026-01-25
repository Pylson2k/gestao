import { NextRequest, NextResponse } from 'next/server'

// Usuários de emergência (quando não há banco de dados)
const EMERGENCY_USERS = [
  { id: '1', username: 'gustavo', password: 'gustavo123', name: 'Gustavo', email: 'gustavo@servipro.com' },
  { id: '2', username: 'giovanni', password: 'giovanni123', name: 'Giovanni', email: 'giovanni@servipro.com' },
]

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario e senha sao obrigatorios' },
        { status: 400 }
      )
    }

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const user = EMERGENCY_USERS.find(
        u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      )
      
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario ou senha invalidos' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
        mustChangePassword: false,
      })
    }

    // Modo normal com banco de dados
    const { prisma } = await import('@/lib/prisma')
    const { compare } = await import('bcryptjs')

    // Debug: verificar se DATABASE_URL está disponível
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não encontrada no ambiente de runtime!')
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
      )
    }

    console.log('🔍 Tentando buscar usuário:', username.toLowerCase())
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    })
    
    console.log('👤 Usuário encontrado:', user ? user.username : 'não encontrado')

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario ou senha invalidos' },
        { status: 401 }
      )
    }

    const passwordMatch = await compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Usuario ou senha invalidos' },
        { status: 401 }
      )
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      mustChangePassword: user.mustChangePassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    
    // Se der erro no banco, tenta modo de emergência
    try {
      const { username, password } = await request.clone().json()
      const user = EMERGENCY_USERS.find(
        u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      )
      
      if (user) {
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
          },
          mustChangePassword: false,
        })
      }
    } catch {}
    
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  }
}
