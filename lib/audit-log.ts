/**
 * Sistema de Auditoria - Registra todas as ações importantes para prevenir manipulação
 */

import { getDbUserId } from './user-mapping'

export type AuditAction = 
  | 'create_quote'
  | 'update_quote'
  | 'delete_quote'
  | 'change_quote_status'
  | 'change_quote_discount'
  | 'change_quote_total'
  | 'create_expense'
  | 'update_expense'
  | 'delete_expense'
  | 'update_company_settings'

export type EntityType = 'quote' | 'expense'

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
