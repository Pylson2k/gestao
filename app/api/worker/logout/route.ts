import { NextResponse } from 'next/server'
import { extractWorkerToken } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const token = extractWorkerToken(request)
    if (!token) {
      return NextResponse.json({ success: true })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true })
    }

    const { prisma } = await import('@/lib/prisma')
    await prisma.workerSession.deleteMany({ where: { token } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}
