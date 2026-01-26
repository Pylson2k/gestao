import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'

// GET - Get company logo (public endpoint, no auth required for favicon/PWA)
export async function GET(request: NextRequest) {
  try {
    // Tentar pegar userId do header, mas não é obrigatório (para favicon/PWA)
    const userId = request.headers.get('x-user-id')

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ logo: null, name: null })
    }

    const { prisma } = await import('@/lib/prisma')
    const { getDbUserId } = await import('@/lib/user-mapping')

    let settings = null

    // Se tem userId, buscar logo específico do usuário
    if (userId) {
      const dbUserId = await getDbUserId(userId)
      settings = await prisma.companySettings.findUnique({
        where: { userId: dbUserId },
        select: { logo: true, name: true },
      })
    } else {
      // Se não tem userId, pegar o primeiro logo disponível (para favicon/PWA)
      settings = await prisma.companySettings.findFirst({
        where: { logo: { not: null } },
        select: { logo: true, name: true },
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (!settings || !settings.logo) {
      return NextResponse.json({ logo: null, name: null })
    }

    // Retornar logo e nome
    return NextResponse.json({ 
      logo: settings.logo,
      name: settings.name || null
    })
  } catch (error) {
    console.error('Get logo error:', error)
    return NextResponse.json({ logo: null, name: null })
  }
}
