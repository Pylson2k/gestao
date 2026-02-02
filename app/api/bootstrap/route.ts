/**
 * GET /api/bootstrap — retorna company (settings + logo) em 1 chamada.
 * Reduz tráfego: o dashboard usa isso em vez de /api/company + /api/company/logo separados.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings } from '@/lib/emergency-store'
import { getPartnersDbUserIds } from '@/lib/user-mapping'

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
    const partnersIds = await getPartnersDbUserIds()

    let settings = await prisma.companySettings.findFirst({
      where: { userId: { in: partnersIds } },
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

    if (!settings && partnersIds.length > 0) {
      const created = await prisma.companySettings.create({
        data: {
          userId: partnersIds[0],
          name: 'ServiPro',
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
