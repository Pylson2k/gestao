import { NextResponse } from 'next/server'

export function apiError(error: string, status: number, details?: unknown) {
  const payload =
    process.env.NODE_ENV === 'production' ? { error } : { error, details }
  return NextResponse.json(payload, { status })
}

export function apiOk<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status })
}

