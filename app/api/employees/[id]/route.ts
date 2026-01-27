import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getPartnersDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Funcionario nao encontrado' },
        { status: 404 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        userId: { in: partnersIds },
      },
      include: {
        expenses: {
          orderBy: {
            date: 'desc',
          },
          take: 10, // Últimas 10 despesas
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionario nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Get employee error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar funcionario' },
      { status: 500 }
    )
  }
}

// PUT - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    const body = await request.json()

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
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    // Verify ownership (qualquer um dos sócios pode editar)
    const existingEmployee = await prisma.employee.findFirst({
      where: { id, userId: { in: partnersIds } },
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Funcionario nao encontrado' },
        { status: 404 }
      )
    }

    // Update employee
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.cpf !== undefined) updateData.cpf = body.cpf?.trim() || null
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null
    if (body.email !== undefined) updateData.email = body.email?.trim() || null
    if (body.position !== undefined) updateData.position = body.position?.trim() || null
    if (body.hireDate !== undefined) updateData.hireDate = body.hireDate ? new Date(body.hireDate) : null
    if (body.observations !== undefined) updateData.observations = body.observations?.trim() || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    const changes: string[] = []
    
    if (body.name !== undefined && existingEmployee.name !== employee.name) {
      changes.push(`Nome: "${existingEmployee.name}" → "${employee.name}"`)
    }
    if (body.position !== undefined && existingEmployee.position !== employee.position) {
      changes.push(`Cargo alterado`)
    }
    if (body.isActive !== undefined && existingEmployee.isActive !== employee.isActive) {
      changes.push(`Status: ${employee.isActive ? 'Ativado' : 'Desativado'}`)
    }

    if (changes.length > 0) {
      await createAuditLog({
        userId,
        action: 'update_employee',
        entityType: 'employee',
        entityId: id,
        description: `Funcionário atualizado - ${changes.join(', ')}`,
        oldValue: {
          name: existingEmployee.name,
          position: existingEmployee.position,
          isActive: existingEmployee.isActive,
        },
        newValue: {
          name: employee.name,
          position: employee.position,
          isActive: employee.isActive,
        },
        ...metadata,
      })
    }

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Update employee error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar funcionario', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

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
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    // Verify ownership (qualquer um dos sócios pode deletar)
    const employee = await prisma.employee.findFirst({
      where: { id, userId: { in: partnersIds } },
      include: {
        expenses: {
          select: { id: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionario nao encontrado' },
        { status: 404 }
      )
    }

    // Verificar se tem despesas associadas
    if (employee.expenses.length > 0) {
      return NextResponse.json(
        { error: 'Nao e possivel excluir funcionario com despesas associadas. Desative o funcionario ao inves de excluir.' },
        { status: 400 }
      )
    }

    // Log de auditoria antes de excluir
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_employee',
      entityType: 'employee',
      entityId: id,
      description: `⚠️ Funcionário EXCLUÍDO - ${employee.name}${employee.position ? ` (${employee.position})` : ''}`,
      oldValue: {
        name: employee.name,
        position: employee.position,
        isActive: employee.isActive,
      },
      ...metadata,
    })

    await prisma.employee.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir funcionario' },
      { status: 500 }
    )
  }
}
