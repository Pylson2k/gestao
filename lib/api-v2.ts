import { apiJson, type ApiFetchInit } from '@/modules/core/http'

export async function apiV2Json<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return apiJson<T>(`/api/v2${normalizedPath}`, init)
}
