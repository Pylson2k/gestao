import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getPartnersDbUserIds } from '@/lib/user-mapping'

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

    // Buscar logo de qualquer um dos sócios (compartilhado)
    const partnersIds = await getPartnersDbUserIds()
    
    settings = await prisma.companySettings.findFirst({
      where: { 
        userId: { in: partnersIds },
        logo: { not: null }
      },
      select: { logo: true, name: true },
      orderBy: { updatedAt: 'desc' },
    })
    
    // Se não encontrou com logo, buscar qualquer configuração dos sócios
    if (!settings) {
      settings = await prisma.companySettings.findFirst({
        where: { userId: { in: partnersIds } },
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
