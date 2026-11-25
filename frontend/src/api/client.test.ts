import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveToken } from '../auth/tokenStore'
import { apiError, fakeApi } from '../test/fakeApi'
import { ApiError, apiRequest, onUnauthorized } from './client'

afterEach(() => onUnauthorized(null))

describe('apiRequest', () => {
  it('sends the session token and JSON body', async () => {
    saveToken('token-123')
    const { calls } = fakeApi({ 'POST /orders': () => ({ status: 201, body: { id: 'x' } }) })

    const result = await apiRequest<{ id: string }>('/orders', { method: 'POST', body: { a: 1 } })

    expect(result).toEqual({ id: 'x' })
    expect(calls[0].headers.get('Authorization')).toBe('Bearer token-123')
    expect(calls[0].body).toEqual({ a: 1 })
  })

  it('repeats array query params and skips empty ones', async () => {
    const { fetchMock } = fakeApi({ 'GET /orders': () => ({ body: [] }) })

    await apiRequest('/orders', { query: { status: ['new', 'ready'], cash_session_id: undefined } })

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/v1/orders?status=new&status=ready')
  })

  it('turns the error envelope into ApiError with the request id', async () => {
    fakeApi({
      'POST /orders': () => ({
        ...apiError(409, 'business_rule_violation', 'Abra o caixa antes de vender.'),
        headers: { 'X-Request-ID': 'abcd-1234' },
      }),
    })

    const error = await apiRequest('/orders', { method: 'POST', body: {} }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'business_rule_violation',
      message: 'Abra o caixa antes de vender.',
      requestId: 'abcd-1234',
    })
  })

  it('reports network failures as network_error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({ code: 'network_error', status: 0 })
  })

  it('treats a non-envelope 502 as internal_error', async () => {
    fakeApi({ 'GET /auth/me': () => ({ status: 502, body: 'Bad gateway' }) })

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({ code: 'internal_error' })
  })

  it('notifies a 401 only when a session token was sent', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)
    fakeApi({ 'POST /auth/login': () => apiError(401, 'unauthorized', 'E-mail ou senha inválidos.') })

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)
    expect(handler).not.toHaveBeenCalled()

    saveToken('expired')
    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledOnce()
  })
})
