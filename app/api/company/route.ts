import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings, updateCompanySettings } from '@/lib/emergency-store'

// GET - Get company settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(getCompanySettings())
    }

    const { prisma } = await import('@/lib/prisma')

    let settings = await prisma.companySettings.findUnique({
      where: { userId },
    })

    // Create default if doesn't exist
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          userId,
          name: 'ServiPro',
          phone: '',
          email: '',
          address: '',
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get company settings error:', error)
    // Fallback
    return NextResponse.json(getCompanySettings())
  }
}

// PUT - Update company settings
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const updated = updateCompanySettings(body)
      return NextResponse.json(updated)
    }

    const { prisma } = await import('@/lib/prisma')

    const settings = await prisma.companySettings.upsert({
      where: { userId },
      update: {
        name: body.name,
        logo: body.logo,
        phone: body.phone,
        email: body.email,
        address: body.address,
        cnpj: body.cnpj,
        website: body.website,
        additionalInfo: body.additionalInfo,
      },
      create: {
        userId,
        name: body.name || 'ServiPro',
        logo: body.logo,
        phone: body.phone || '',
        email: body.email || '',
        address: body.address || '',
        cnpj: body.cnpj,
        website: body.website,
        additionalInfo: body.additionalInfo,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update company settings error:', error)
    // Fallback
    try {
      const body = await request.clone().json()
      const updated = updateCompanySettings(body)
      return NextResponse.json(updated)
    } catch {
      return NextResponse.json(
        { error: 'Erro ao atualizar configuracoes' },
        { status: 500 }
      )
    }
  }
}
