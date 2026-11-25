import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readToken, saveToken } from '../auth/tokenStore'
import { apiError, business, fakeApi, makeUser } from '../test/fakeApi'
import { renderApp } from '../test/renderApp'

function signedInAs(role: 'owner' | 'operator') {
  saveToken('valid-token')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser(role), business } }),
    'POST /auth/logout': () => ({ status: 204 }),
  })
}

describe('authentication', () => {
  it('sends visitors without a session to the login page', async () => {
    renderApp('/caixa')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('logs in and returns to the requested page', async () => {
    const { calls } = fakeApi({
      'POST /auth/login': () => ({
        body: { user: makeUser('operator'), business, access_token: 'new-token', token_type: 'bearer', expires_at: '2026-11-26T00:00:00Z' },
      }),
    })
    renderApp('/caixa')

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: ' ivan@example.com ' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Caixa' })).toBeInTheDocument()
    expect(calls[0].body).toEqual({ email: 'ivan@example.com', password: 'senha-forte-123' })
    expect(readToken()).toBe('new-token')
  })

  it('shows the API message when the password is wrong', async () => {
    fakeApi({ 'POST /auth/login': () => apiError(401, 'unauthorized', 'E-mail ou senha inválidos.') })
    renderApp('/entrar')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ivan@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('restores the saved session on reload', async () => {
    signedInAs('operator')
    renderApp('/pedidos')

    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument()
  })

  it('returns to login with a notice when the session expired', async () => {
    saveToken('expired-token')
    fakeApi({ 'GET /auth/me': () => apiError(401, 'unauthorized', 'Sessão inválida ou expirada.') })
    renderApp('/pdv')

    expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument()
    expect(readToken()).toBeNull()
  })

  it('keeps the session and offers a retry when the API is unreachable', async () => {
    saveToken('valid-token')
    fakeApi({ 'GET /auth/me': () => ({ status: 502, body: 'Bad gateway' }) })
    renderApp('/pdv')

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(readToken()).toBe('valid-token')
  })

  it('logs out and forgets the token', async () => {
    const { calls } = signedInAs('operator')
    renderApp('/pdv')

    const [sidebarLogout] = await screen.findAllByRole('button', { name: 'Sair' })
    fireEvent.click(sidebarLogout)

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST' && call.path === '/auth/logout')).toBe(true)
    expect(readToken()).toBeNull()
  })
})

describe('navigation by role', () => {
  it('hides owner pages from operators', async () => {
    signedInAs('operator')
    renderApp('/pdv')

    const [nav] = await screen.findAllByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).getByRole('link', { name: 'Caixa' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Painel' })).not.toBeInTheDocument()
  })

  it('redirects operators away from owner pages', async () => {
    signedInAs('operator')
    renderApp('/painel')

    expect(await screen.findByRole('heading', { name: 'Vender' })).toBeInTheDocument()
  })

  it('lets owners open owner pages', async () => {
    signedInAs('owner')
    renderApp('/painel')

    expect(await screen.findByRole('heading', { name: 'Painel' })).toBeInTheDocument()
  })

  it('shows a not found page inside the app', async () => {
    signedInAs('owner')
    renderApp('/nao-existe')

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })
})
