import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings, updateCompanySettings } from '@/lib/emergency-store'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

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

    // Mapear userId da autenticação para ID do banco
    const dbUserId = await getDbUserId(userId)

    let settings = await prisma.companySettings.findUnique({
      where: { userId: dbUserId },
    })

    // Create default if doesn't exist
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          userId: dbUserId,
          name: 'ServiPro',
          phone: '',
          email: '',
          address: '',
          companyCashPercentage: 10, // Padrão 10%
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

    // Mapear userId da autenticação para ID do banco
    const dbUserId = await getDbUserId(userId)

    // Buscar configurações antigas para auditoria
    const oldSettings = await prisma.companySettings.findUnique({
      where: { userId: dbUserId },
    })

    const settings = await prisma.companySettings.upsert({
      where: { userId: dbUserId },
      update: {
        name: body.name,
        logo: body.logo,
        phone: body.phone,
        email: body.email,
        address: body.address,
        cnpj: body.cnpj,
        website: body.website,
        additionalInfo: body.additionalInfo,
        companyCashPercentage: body.companyCashPercentage !== undefined ? Math.max(0, Math.min(50, parseFloat(body.companyCashPercentage))) : undefined,
      },
      create: {
        userId: dbUserId,
        name: body.name || 'ServiPro',
        logo: body.logo,
        phone: body.phone || '',
        email: body.email || '',
        address: body.address || '',
        cnpj: body.cnpj,
        companyCashPercentage: body.companyCashPercentage !== undefined ? Math.max(0, Math.min(50, parseFloat(body.companyCashPercentage))) : 10,
        website: body.website,
        additionalInfo: body.additionalInfo,
      },
    })

    // Log de auditoria para mudanças nas configurações da empresa
    if (oldSettings) {
      const changes: string[] = []
      if (oldSettings.name !== settings.name) changes.push(`Nome: "${oldSettings.name}" → "${settings.name}"`)
      if (oldSettings.phone !== settings.phone) changes.push(`Telefone alterado`)
      if (oldSettings.email !== settings.email) changes.push(`Email alterado`)
      if (oldSettings.address !== settings.address) changes.push(`Endereço alterado`)
      if (oldSettings.cnpj !== settings.cnpj) changes.push(`CNPJ alterado`)
      if (oldSettings.website !== settings.website) changes.push(`Website alterado`)
      if (oldSettings.logo !== settings.logo) changes.push(`Logo ${settings.logo ? 'atualizado' : 'removido'}`)
      if (oldSettings.additionalInfo !== settings.additionalInfo) changes.push(`Informações adicionais alteradas`)

      if (changes.length > 0) {
        const metadata = getRequestMetadata(request)
        await createAuditLog({
          userId,
          action: 'update_company_settings',
          entityType: 'company_settings',
          entityId: 'company-settings',
          description: `Configurações da empresa atualizadas - ${changes.join(', ')}`,
          oldValue: {
            name: oldSettings.name,
            phone: oldSettings.phone,
            email: oldSettings.email,
            address: oldSettings.address,
            cnpj: oldSettings.cnpj,
            website: oldSettings.website,
          },
          newValue: {
            name: settings.name,
            phone: settings.phone,
            email: settings.email,
            address: settings.address,
            cnpj: settings.cnpj,
            website: settings.website,
          },
          ...metadata,
        })
      }
    }

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
