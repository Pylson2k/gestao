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
  return fetch(input, { ...rest, headers })
}

export async function apiJson<T>(input: string | URL, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetch(input, init)
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}
