/**
 * Cliente HTTP mínimo para chamadas às rotas `/api/*`.
 * Autenticação via cookie HttpOnly (`credentials: 'include'`).
 * Não envia `x-user-id` — o proxy injeta identidade só após validar a sessão.
 */
export type ApiFetchInit = RequestInit & {
  /** @deprecated Ignorado — auth é por cookie de sessão */
  userId?: string
}

export function apiFetch(input: string | URL, init: ApiFetchInit = {}): Promise<Response> {
  const { userId: _userId, headers: initHeaders, credentials, ...rest } = init
  const headers = new Headers(initHeaders)
  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, {
    ...rest,
    headers,
    credentials: credentials ?? 'include',
  })
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
