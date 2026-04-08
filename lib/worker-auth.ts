import { randomBytes } from 'crypto'
import { compare } from 'bcryptjs'

const BEARER = 'Bearer '

export function extractWorkerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith(BEARER)) return auth.slice(BEARER.length).trim()
  return request.headers.get('x-worker-token')?.trim() || null
}

export async function getWorkerAuth(request: Request) {
  const token = extractWorkerToken(request)
  if (!token) return null

  const { prisma } = await import('@/lib/prisma')
  const session = await prisma.workerSession.findUnique({
    where: { token },
    include: {
      account: { include: { employee: true } },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.workerSession.delete({ where: { id: session.id } }).catch(() => {})
    }
    return null
  }

  return {
    session,
    account: session.account,
    employee: session.account.employee,
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export const WORKER_SESSION_DAYS = 30

export async function verifyWorkerPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash)
}

export function normalizeWorkerUsername(raw: string): string {
  return raw.trim().toLowerCase()
}
