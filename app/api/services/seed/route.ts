import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// Serviços pré-definidos de elétrica
const predefinedServices = [
  // Instalações e pequenos serviços
  {
    name: 'Instalação de tomada ou interruptor',
    description: 'Instalação de tomada ou interruptor por ponto',
    unitPrice: 55, // Valor médio entre R$ 40-70
    unit: 'ponto',
    category: 'instalacao',
  },
  {
    name: 'Instalação de ponto de luz',
    description: 'Instalação de ponto de luz',
    unitPrice: 42.5, // Valor médio entre R$ 35-50
    unit: 'ponto',
    category: 'instalacao',
  },
  {
    name: 'Instalação de luminária (LED/lustre)',
    description: 'Instalação de luminária LED ou lustre',
    unitPrice: 115, // Valor médio entre R$ 80-150
    unit: 'unidade',
    category: 'instalacao',
  },
  {
    name: 'Instalar ventilador de teto',
    description: 'Instalação de ventilador de teto',
    unitPrice: 185, // Valor médio entre R$ 120-250
    unit: 'unidade',
    category: 'instalacao',
  },
  {
    name: 'Instalar chuveiro elétrico',
    description: 'Instalação de chuveiro elétrico',
    unitPrice: 140, // Valor médio entre R$ 100-180
    unit: 'unidade',
    category: 'instalacao',
  },
  {
    name: 'Instalar sensor de presença',
    description: 'Instalação de sensor de presença',
    unitPrice: 80, // Valor médio entre R$ 40-120
    unit: 'unidade',
    category: 'instalacao',
  },
  {
    name: 'Instalar antena ou similar',
    description: 'Instalação de antena ou similar',
    unitPrice: 210, // Valor médio entre R$ 200-220
    unit: 'unidade',
    category: 'instalacao',
  },
  // Trocas, reparos e manutenção
  {
    name: 'Troca de lâmpada simples',
    description: 'Troca de lâmpada simples',
    unitPrice: 24, // Valor médio entre R$ 18-30
    unit: 'unidade',
    category: 'troca',
  },
  {
    name: 'Troca de tomada',
    description: 'Troca de tomada',
    unitPrice: 45, // Valor médio entre R$ 30-60
    unit: 'unidade',
    category: 'troca',
  },
  {
    name: 'Troca de disjuntor',
    description: 'Troca de disjuntor',
    unitPrice: 121, // Valor médio entre R$ 42-200
    unit: 'unidade',
    category: 'troca',
  },
  {
    name: 'Manutenção simples (ponto de luz/fiação)',
    description: 'Manutenção simples em ponto de luz ou fiação',
    unitPrice: 225, // Valor médio entre R$ 150-300
    unit: 'servico',
    category: 'manutencao',
  },
  {
    name: 'Reparo no quadro de distribuição',
    description: 'Reparo no quadro de distribuição',
    unitPrice: 275, // Valor médio entre R$ 150-400
    unit: 'servico',
    category: 'manutencao',
  },
  // Serviços maiores / projetos
  {
    name: 'Instalação de quadro elétrico',
    description: 'Instalação completa de quadro elétrico',
    unitPrice: 1600, // Valor médio entre R$ 1.200-2.000+
    unit: 'servico',
    category: 'projeto',
  },
  {
    name: 'Passagem de nova fiação (apartamento padrão)',
    description: 'Passagem de nova fiação para apartamento padrão',
    unitPrice: 1000, // Valor médio entre R$ 500-1.500
    unit: 'servico',
    category: 'projeto',
  },
  {
    name: 'Instalação de sistema de automação residencial',
    description: 'Instalação de sistema de automação residencial',
    unitPrice: 6500, // Valor médio entre R$ 3.000-10.000
    unit: 'servico',
    category: 'projeto',
  },
  // Mão de obra por hora
  {
    name: 'Mão de obra - Eletricista básico',
    description: 'Mão de obra de eletricista básico (simples)',
    unitPrice: 50, // Valor médio entre R$ 35-65
    unit: 'hora',
    category: 'mao_obra',
  },
  {
    name: 'Mão de obra - Eletricista experiente',
    description: 'Mão de obra de eletricista experiente/qualificado',
    unitPrice: 75, // Valor médio entre R$ 65-85
    unit: 'hora',
    category: 'mao_obra',
  },
  {
    name: 'Mão de obra - Eletricista especializado',
    description: 'Mão de obra de eletricista especializado (automação/industrial)',
    unitPrice: 102.5, // Valor médio entre R$ 85-120
    unit: 'hora',
    category: 'mao_obra',
  },
  {
    name: 'Diária de serviço completo',
    description: 'Diária completa de serviço',
    unitPrice: 400, // Valor médio entre R$ 300-500+
    unit: 'dia',
    category: 'mao_obra',
  },
]

// POST - Seed predefined services
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Banco de dados nao configurado' },
        { status: 500 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    // Verificar se já existem serviços para este usuário
    const existingServices = await prisma.service.findMany({
      where: { userId: dbUserId },
    })

    // Permitir popular mesmo se já existirem serviços, mas avisar
    if (existingServices.length > 0) {
      // Verificar se algum dos serviços pré-definidos já existe (por nome)
      const existingNames = existingServices.map(s => s.name.toLowerCase().trim())
      const duplicates = predefinedServices.filter(s => 
        existingNames.includes(s.name.toLowerCase().trim())
      )

      if (duplicates.length > 0) {
        return NextResponse.json(
          { 
            error: 'Alguns servicos pre-definidos ja existem',
            message: `${duplicates.length} serviço(s) pré-definido(s) já estão cadastrados. Exclua os serviços existentes primeiro ou edite manualmente.`,
            existingCount: existingServices.length,
            duplicatesCount: duplicates.length,
          },
          { status: 400 }
        )
      }
    }

    // Criar todos os serviços pré-definidos
    const createdServices = []
    const metadata = getRequestMetadata(request)

    for (const serviceData of predefinedServices) {
      const service = await prisma.service.create({
        data: {
          userId: dbUserId,
          name: serviceData.name,
          description: serviceData.description,
          unitPrice: serviceData.unitPrice,
          unit: serviceData.unit,
          isActive: true,
        },
      })

      // Log de auditoria
      await createAuditLog({
        userId,
        action: 'create_service',
        entityType: 'service',
        entityId: service.id,
        description: `Serviço pré-definido cadastrado - ${service.name} - Preço: R$ ${service.unitPrice.toFixed(2)}/${service.unit}`,
        newValue: {
          name: service.name,
          unitPrice: service.unitPrice,
          unit: service.unit,
          isActive: service.isActive,
          predefined: true,
        },
        ...metadata,
      })

      createdServices.push(service)
    }

    return NextResponse.json(
      {
        message: `${createdServices.length} servicos pre-definidos criados com sucesso`,
        count: createdServices.length,
        services: createdServices,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Seed services error:', error)
    return NextResponse.json(
      { error: 'Erro ao popular servicos pre-definidos', details: error.message },
      { status: 500 }
    )
  }
}
