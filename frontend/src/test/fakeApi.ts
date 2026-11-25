import { vi } from 'vitest'
import type { Business, User } from '../api/types'

type Handler = (request: { method: string; url: URL; body: unknown; headers: Headers }) =>
  | { status?: number; body?: unknown; headers?: Record<string, string> }
  | undefined

/**
 * Substitui o `fetch` global por respostas declaradas no teste.
 * Rotas sem resposta falham o teste com uma mensagem clara.
 */
export function fakeApi(routes: Record<string, Handler>) {
  const calls: { method: string; path: string; body: unknown; headers: Headers }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init.method ?? 'GET'
    const headers = new Headers(init.headers)
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    const path = url.pathname.replace(/^\/api\/v1/, '')
    calls.push({ method, path, body, headers })
    const handler = routes[`${method} ${path}`]
    if (!handler) throw new Error(`fakeApi: rota não declarada ${method} ${path}`)
    const result = handler({ method, url, body, headers }) ?? {}
    const status = result.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(result.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json', ...result.headers },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

export function apiError(status: number, code: string, message = '', details: unknown[] = []) {
  return { status, body: { error: { code, message, details } } }
}

export const business: Business = {
  id: '01a00000-0000-7000-8000-000000000001',
  name: 'Arepas da Feira',
  timezone: 'America/Sao_Paulo',
}

export function makeUser(role: User['role'], overrides: Partial<User> = {}): User {
  return {
    id: role === 'owner' ? '01a00000-0000-7000-8000-0000000000a1' : '01a00000-0000-7000-8000-0000000000b2',
    name: role === 'owner' ? 'Lucca' : 'Ivan',
    email: role === 'owner' ? 'lucca@example.com' : 'ivan@example.com',
    role,
    active: true,
    created_at: '2026-11-24T12:00:00Z',
    ...overrides,
  }
}
