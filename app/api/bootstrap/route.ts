/**
 * GET /api/bootstrap — retorna company (settings + logo) em 1 chamada.
 * Reduz tráfego: o dashboard usa isso em vez de /api/company + /api/company/logo separados.
 */

import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings } from '@/lib/emergency-store'
import { getOwnerDbUserIds } from '@/lib/user-mapping'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(getCompanySettings())
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()

    let settings = await prisma.companySettings.findFirst({
      where: { userId: { in: ownerIds } },
      select: {
        name: true,
        logo: true,
        phone: true,
        email: true,
        address: true,
        cnpj: true,
        website: true,
        additionalInfo: true,
        companyCashPercentage: true,
      },
    })

    if (!settings && ownerIds.length > 0) {
      const created = await prisma.companySettings.create({
        data: {
          userId: ownerIds[0],
          name: APP_DISPLAY_NAME,
          phone: '',
          email: '',
          address: '',
          companyCashPercentage: 10,
        },
      })
      settings = {
        name: created.name,
        logo: created.logo,
        phone: created.phone,
        email: created.email,
        address: created.address,
        cnpj: created.cnpj,
        website: created.website,
        additionalInfo: created.additionalInfo,
        companyCashPercentage: created.companyCashPercentage,
      }
    }

    return NextResponse.json(settings ?? getCompanySettings())
  } catch (error) {
    console.error('Bootstrap error:', error)
    return NextResponse.json(getCompanySettings())
  }
}
