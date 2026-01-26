import { NextRequest, NextResponse } from 'next/server'

// GET - Dynamic manifest with company logo
export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      // Retornar manifest padrão
      return NextResponse.redirect(new URL('/manifest.json', request.url))
    }

    const { prisma } = await import('@/lib/prisma')

    // Buscar logo mais recente e nome da empresa
    const settings = await prisma.companySettings.findFirst({
      where: { logo: { not: null } },
      select: { logo: true, name: true },
      orderBy: { updatedAt: 'desc' },
    })

    const companyName = settings?.name || 'ServiPro'
    const shortName = companyName.length > 12 ? companyName.substring(0, 12) : companyName
    const logoUrl = settings?.logo ? `/api/company/logo` : '/icon-192x192.png'

    const manifest = {
      name: `${companyName} - Gestão de Orçamentos`,
      short_name: shortName,
      description: `Sistema profissional de gestão de orçamentos, despesas e faturamento - ${companyName}`,
      start_url: '/dashboard',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'portrait-primary',
      scope: '/',
      icons: [
        {
          src: settings?.logo ? `/api/company/pwa-icon/192` : '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: settings?.logo ? `/api/company/pwa-icon/256` : '/icon-256x256.png',
          sizes: '256x256',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: settings?.logo ? `/api/company/pwa-icon/384` : '/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: settings?.logo ? `/api/company/pwa-icon/512` : '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: settings?.logo ? `/api/company/pwa-icon/180` : '/apple-icon-180x180.png',
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any',
        },
      ],
      categories: ['business', 'productivity', 'finance'],
      screenshots: [],
      shortcuts: [
        {
          name: 'Novo Orçamento',
          short_name: 'Novo',
          description: 'Criar um novo orçamento',
          url: '/dashboard/novo-orcamento',
          icons: [{ src: settings?.logo ? `/api/company/pwa-icon/192` : '/icon-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'Adicionar Despesa',
          short_name: 'Despesa',
          description: 'Adicionar nova despesa',
          url: '/dashboard/despesas',
          icons: [{ src: settings?.logo ? `/api/company/pwa-icon/192` : '/icon-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'Dashboard',
          short_name: 'Home',
          description: 'Ir para o dashboard',
          url: '/dashboard',
          icons: [{ src: settings?.logo ? `/api/company/pwa-icon/192` : '/icon-192x192.png', sizes: '192x192' }],
        },
      ],
      prefer_related_applications: false,
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Get manifest error:', error)
    // Fallback para manifest padrão
    return NextResponse.redirect(new URL('/manifest.json', request.url))
  }
}
