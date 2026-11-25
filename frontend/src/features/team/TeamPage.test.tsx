import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { saveToken } from '../../auth/tokenStore'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

const owner = makeUser('owner')
const ivan = makeUser('operator', { name: 'Ivan Carvajal' })
const old = makeUser('operator', { id: 'u3', name: 'Ana Antiga', email: 'ana@example.com', active: false })

function teamApi(extra: Parameters<typeof fakeApi>[0] = {}) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: owner, business } }),
    'GET /users': () => ({ body: [old, ivan, owner] }),
    ...extra,
  })
}

describe('TeamPage', () => {
  it('lists active people first and marks who has no access', async () => {
    teamApi()
    renderApp('/equipe')

    const rows = await screen.findAllByRole('button', { name: /^Editar / })
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(['Editar Ivan Carvajal', 'Editar Lucca', 'Editar Ana Antiga'])
    expect(within(rows[1]).getByText('(você)')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Sem acesso')).toBeInTheDocument()
  })

  it('creates an operator', async () => {
    const { calls } = teamApi({
      'POST /users': ({ body }) => ({ status: 201, body: { ...ivan, id: 'u9', ...(body as object) } }),
    })
    renderApp('/equipe')

    fireEvent.click(await screen.findByRole('button', { name: 'Nova pessoa' }))
    const dialog = screen.getByRole('dialog', { name: 'Nova pessoa' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Maria' } })
    fireEvent.change(within(dialog).getByLabelText('E-mail'), { target: { value: 'maria@example.com' } })
    fireEvent.change(within(dialog).getByLabelText('Senha'), { target: { value: 'curta' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    expect(within(dialog).getByText('Use pelo menos 8 caracteres.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Senha'), { target: { value: 'senha-forte-123' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Maria cadastrado.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-forte-123',
      role: 'operator',
    })
  })

  it('removes access and resets the password with only the changed fields', async () => {
    const { calls } = teamApi({ 'PATCH /users/01a00000-0000-7000-8000-0000000000b2': ({ body }) => ({ body: { ...ivan, ...(body as object) } }) })
    renderApp('/equipe')

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Ivan Carvajal' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar pessoa' })
    fireEvent.click(within(dialog).getByRole('switch', { name: /Acesso ativo/ }))
    fireEvent.change(within(dialog).getByLabelText('Nova senha (opcional)'), { target: { value: 'outra-senha-456' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    await screen.findByText('Ivan Carvajal atualizado.')
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ active: false, password: 'outra-senha-456' })
  })

  it('does not let the owner lock themselves out', async () => {
    teamApi()
    renderApp('/equipe')

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Lucca' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar pessoa' })
    expect(within(dialog).getByLabelText('Papel')).toBeDisabled()
    expect(within(dialog).queryByRole('switch')).not.toBeInTheDocument()
  })

  it('shows the API message for a duplicated email', async () => {
    teamApi({ 'POST /users': () => apiError(409, 'business_rule_violation', 'Já existe um usuário com este e-mail.') })
    renderApp('/equipe')

    fireEvent.click(await screen.findByRole('button', { name: 'Nova pessoa' }))
    const dialog = screen.getByRole('dialog', { name: 'Nova pessoa' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Ivan' } })
    fireEvent.change(within(dialog).getByLabelText('E-mail'), { target: { value: 'ivan@example.com' } })
    fireEvent.change(within(dialog).getByLabelText('Senha'), { target: { value: 'senha-forte-123' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await within(dialog).findByText('Já existe um usuário com este e-mail.')).toBeInTheDocument()
  })
})
