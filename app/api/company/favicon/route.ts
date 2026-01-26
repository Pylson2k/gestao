import { NextRequest, NextResponse } from 'next/server'

// GET - Get favicon as image (returns actual image, not JSON)
export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      // Retornar favicon padrão se não tiver banco
      return NextResponse.redirect(new URL('/icon-192x192.png', request.url))
    }

    const { prisma } = await import('@/lib/prisma')

    // Buscar logo mais recente
    const settings = await prisma.companySettings.findFirst({
      where: { logo: { not: null } },
      select: { logo: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!settings || !settings.logo) {
      // Retornar favicon padrão
      return NextResponse.redirect(new URL('/icon-192x192.png', request.url))
    }

    // Se o logo é base64, converter para imagem
    if (settings.logo.startsWith('data:image')) {
      // Extrair base64
      const base64Data = settings.logo.split(',')[1]
      const mimeType = settings.logo.match(/data:image\/([^;]+)/)?.[1] || 'png'
      
      const imageBuffer = Buffer.from(base64Data, 'base64')
      
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': `image/${mimeType}`,
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      })
    }

    // Se for URL, redirecionar
    return NextResponse.redirect(settings.logo)
  } catch (error) {
    console.error('Get favicon error:', error)
    return NextResponse.redirect(new URL('/icon-192x192.png', request.url))
  }
}
