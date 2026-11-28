import { readToken } from '../auth/tokenStore'

/**
 * Cliente HTTP da API.
 *
 * - Envia o token da sessão em `Authorization: Bearer`.
 * - Converte o envelope de erro (ADR-0002) em `ApiError`.
 * - Falha de rede vira `ApiError` com código `network_error`.
 */

export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1'

export type ErrorDetail = { field: string; message: string; type: string }

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ErrorDetail[]
  readonly requestId: string | null

  constructor(
    status: number,
    code: string,
    message: string,
    details: ErrorDetail[] = [],
    requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

type Query = Record<string, string | number | boolean | string[] | null | undefined>

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
  signal?: AbortSignal
}

let unauthorizedHandler: (() => void) | null = null

/** Chamado quando uma requisição autenticada recebe 401 (sessão expirada ou revogada). */
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options
  const token = readToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'network_error', 'Sem conexão.')
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  const apiError = await toApiError(response)
  if (apiError.status === 401 && token) unauthorizedHandler?.()
  throw apiError
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

async function toApiError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('X-Request-ID')
  try {
    const data = (await response.json()) as {
      error?: { code?: string; message?: string; details?: ErrorDetail[] }
    }
    if (data.error?.code) {
      return new ApiError(
        response.status,
        data.error.code,
        data.error.message ?? '',
        data.error.details ?? [],
        requestId,
      )
    }
  } catch {
    // Corpo fora do envelope (ex.: proxy fora do ar): cai no genérico abaixo.
  }
  const code = response.status >= 500 ? 'internal_error' : 'unknown_error'
  return new ApiError(response.status, code, '', [], requestId)
}
