/**
 * Marca e textos padrão do sistema (SINAI ENGENHARIA).
 * Ajuste aqui para propagar nome do programa em UI, PDF, API e PWA.
 */
export const APP_DISPLAY_NAME = 'SINAI ENGENHARIA'

/** Texto após o nome da empresa na aba do navegador. */
export const APP_TITLE_SUFFIX = 'Gestão de Orçamentos'

/**
 * Nome curto para launcher PWA quando o nome completo passa de ~12 caracteres.
 */
export const APP_PWA_SHORT_NAME = 'SINAI'

/** sessionStorage — trocar a chave desconecta sessões antigas. */
export const AUTH_SESSION_STORAGE_KEY = 'sinai_engenharia_user'

/** Token do app /trabalhador (Bearer nas APIs /api/worker/*). */
export const WORKER_SESSION_STORAGE_KEY = 'sinai_worker_token'

/** Chave antiga de sessão (ServiPro) — migrada automaticamente. */
export const LEGACY_AUTH_SESSION_KEY = 'servipro_user'

/** Lê o id do usuário na sessão (migra chave legada se existir). */
export function readSessionUserId(): string | null {
  if (typeof window === 'undefined') return null
  let raw = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
  if (!raw) {
    raw = sessionStorage.getItem(LEGACY_AUTH_SESSION_KEY)
    if (raw) {
      sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, raw)
      sessionStorage.removeItem(LEGACY_AUTH_SESSION_KEY)
    }
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed.id ?? null
  } catch {
    return null
  }
}
