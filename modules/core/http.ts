import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

/**
 * Cliente HTTP mínimo para chamadas às rotas `/api/*`.
 * Centraliza headers comuns (ex.: `x-user-id`) para migrar contexts gradualmente.
 */
export type ApiFetchInit = RequestInit & {
  userId?: string
}

export function apiFetch(input: string | URL, init: ApiFetchInit = {}): Promise<Response> {
  const { userId, headers: initHeaders, ...rest } = init
  const headers = new Headers(initHeaders)
  headers.set('x-user-id', userId ?? OWNER_SESSION_USER_ID)
  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...rest, headers })
}

export async function readApiError(res: Response): Promise<string> {
  let message = res.statusText || 'Erro inesperado'
  try {
    const body = (await res.json()) as { error?: string; message?: string; details?: string }
    if (body?.error) return body.error
    if (body?.message) return body.message
    if (body?.details) return body.details
  } catch {
    // Ignore parse failures and fallback to status text.
  }
  return message
}

export async function apiJson<T>(input: string | URL, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetch(input, init)
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return (await res.json()) as T
}
