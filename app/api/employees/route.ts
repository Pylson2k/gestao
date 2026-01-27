import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getPartnersDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - List all employees for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('isActive')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const { prisma } = await import('@/lib/prisma')
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    const where: any = { 
      userId: { in: partnersIds } // Compartilhar dados entre sócios
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar funcionarios' },
      { status: 500 }
    )
  }
}

// POST - Create new employee
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

    const body = await request.json()
    const { name, cpf, phone, email, position, hireDate, observations, isActive } = body

    // Validações
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome e obrigatorio' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const employee = await prisma.employee.create({
      data: {
        userId: dbUserId,
        name: name.trim(),
        cpf: cpf?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        position: position?.trim() || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        observations: observations?.trim() || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_employee',
      entityType: 'employee',
      entityId: employee.id,
      description: `Funcionário cadastrado - ${employee.name}${employee.position ? ` (${employee.position})` : ''}`,
      newValue: {
        name: employee.name,
        position: employee.position,
        isActive: employee.isActive,
      },
      ...metadata,
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error: any) {
    console.error('Create employee error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar funcionario', details: error.message },
      { status: 500 }
    )
  }
}
