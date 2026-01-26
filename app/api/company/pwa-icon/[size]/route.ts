import { NextRequest, NextResponse } from 'next/server'

// GET - Get PWA icon in specific size
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  try {
    const { size: sizeParam } = await params
    const sizeNum = parseInt(sizeParam || '192')

    if (!process.env.DATABASE_URL) {
      // Retornar ícone padrão
      return NextResponse.redirect(new URL(`/icon-${sizeNum}x${sizeNum}.png`, request.url))
    }

    const { prisma } = await import('@/lib/prisma')

    // Buscar logo mais recente
    const settings = await prisma.companySettings.findFirst({
      where: { logo: { not: null } },
      select: { logo: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!settings || !settings.logo) {
      // Retornar ícone padrão
      return NextResponse.redirect(new URL(`/icon-${sizeNum}x${sizeNum}.png`, request.url))
    }

    // Se o logo é base64, converter para imagem
    if (settings.logo.startsWith('data:image')) {
      // Extrair base64
      const base64Data = settings.logo.split(',')[1]
      const mimeType = settings.logo.match(/data:image\/([^;]+)/)?.[1] || 'png'
      
      const imageBuffer = Buffer.from(base64Data, 'base64')
      
      // Retornar a imagem (em produção, você poderia usar sharp ou similar para redimensionar)
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
    console.error('Get PWA icon error:', error)
    try {
      const { size: sizeParam } = await params
      const fallbackSize = sizeParam || '192'
      return NextResponse.redirect(new URL(`/icon-${fallbackSize}x${fallbackSize}.png`, request.url))
    } catch {
      return NextResponse.redirect(new URL('/icon-192x192.png', request.url))
    }
  }
}
