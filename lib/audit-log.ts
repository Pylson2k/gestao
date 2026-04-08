/**
 * Sistema de Auditoria - Registra todas as ações importantes para prevenir manipulação
 */

import { getDbUserId } from './user-mapping'

export type AuditAction = 
  // Orçamentos
  | 'create_quote'
  | 'update_quote'
  | 'delete_quote'
  | 'change_quote_status'
  | 'change_quote_discount'
  | 'change_quote_total'
  | 'toggle_quote_delinquency_list'
  | 'view_quote'
  | 'download_quote_pdf'
  | 'download_service_order_pdf'
  | 'download_materials_list_pdf'
  | 'create_material_list'
  | 'update_material_list'
  | 'delete_material_list'
  | 'download_material_list_pdf'
  | 'send_quote_whatsapp'
  | 'send_service_order_whatsapp'
  // Despesas
  | 'create_expense'
  | 'update_expense'
  | 'delete_expense'
  // Clientes
  | 'create_client'
  | 'update_client'
  | 'delete_client'
  | 'view_client'
  // Funcionários
  | 'create_employee'
  | 'update_employee'
  | 'delete_employee'
  | 'view_employee'
  // Serviços
  | 'create_service'
  | 'update_service'
  | 'delete_service'
  // Fechamentos de Caixa
  | 'create_cash_closing'
  | 'view_cash_closing'
  // Pagamentos
  | 'create_payment'
  | 'update_payment'
  | 'delete_payment'
  // Configurações
  | 'update_company_settings'
  | 'update_profile'
  | 'change_password'
  | 'change_email'
  // Autenticação
  | 'user_login'
  | 'user_logout'
  | 'failed_login'
  // Exportações
  | 'export_csv'
  | 'export_pdf'
  // Obras / ponto / trabalhador
  | 'create_work_assignment'
  | 'update_work_assignment'
  | 'delete_work_assignment'
  | 'approve_work_day_log'
  | 'reject_work_day_log'
  | 'approve_work_contract_submission'
  | 'reject_work_contract_submission'
  | 'create_worker_account'
  | 'update_worker_account'

export type EntityType =
  | 'quote'
  | 'material_list'
  | 'expense'
  | 'client'
  | 'employee'
  | 'service'
  | 'cash_closing'
  | 'payment'
  | 'company_settings'
  | 'user'
  | 'export'
  | 'work_assignment'
  | 'work_day_log'
  | 'worker_contract_submission'
  | 'worker_account'

interface AuditLogData {
  userId: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  description: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Cria um log de auditoria
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      // Sem banco, apenas log no console
      console.log('[AUDIT LOG]', data)
      return
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(data.userId)

    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    })
  } catch (error) {
    // Não falhar a operação principal se o log falhar
    console.error('Error creating audit log:', error)
  }
}

/**
 * Obtém o IP e User-Agent da requisição
 */
export function getRequestMetadata(request: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   undefined
  const userAgent = request.headers.get('user-agent') || undefined
  
  return { ipAddress, userAgent }
}
