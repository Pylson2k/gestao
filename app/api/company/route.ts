import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    return NextResponse.json(
      { error: 'Erro ao buscar configuracoes' },
      { status: 500 }
    )
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
    return NextResponse.json(
      { error: 'Erro ao atualizar configuracoes' },
      { status: 500 }
    )
  }
}
