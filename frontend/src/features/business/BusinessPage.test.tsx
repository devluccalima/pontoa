import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Business } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

function businessApi(current: Business = business, extra: Parameters<typeof fakeApi>[0] = {}) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser('owner'), business: current } }),
    'PATCH /business': ({ body }) => ({ body: { ...current, ...(body as object) } }),
    ...extra,
  })
}

describe('BusinessPage', () => {
  it('saves only what changed and updates the name in the menu', async () => {
    const { calls } = businessApi()
    renderApp('/estabelecimento')

    const name = await screen.findByLabelText('Nome')
    const save = screen.getByRole('button', { name: 'Salvar alterações' })
    expect(name).toHaveValue('Arepas da Feira')
    expect(screen.getByLabelText('Fuso horário')).toHaveValue('America/Sao_Paulo')
    expect(save).toBeDisabled()

    fireEvent.change(name, { target: { value: '  Arepas do Lucca ' } })
    fireEvent.click(save)

    expect(await screen.findByText('Dados do estabelecimento salvos.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ name: 'Arepas do Lucca' })
    const [nav] = screen.getAllByRole('complementary')
    expect(within(nav).getByText('Arepas do Lucca')).toBeInTheDocument()
    expect(name).toHaveValue('Arepas do Lucca')
    expect(save).toBeDisabled()
  })

  it('changes the timezone', async () => {
    const { calls } = businessApi()
    renderApp('/estabelecimento')

    fireEvent.change(await screen.findByLabelText('Fuso horário'), { target: { value: 'America/Manaus' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Dados do estabelecimento salvos.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ timezone: 'America/Manaus' })
  })

  it('treats spaces around the same name as no change', async () => {
    businessApi()
    renderApp('/estabelecimento')

    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: ' Arepas da Feira ' } })

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  })

  it('does not send a blank name', async () => {
    const { calls } = businessApi()
    renderApp('/estabelecimento')

    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Informe o nome do estabelecimento.')).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false)
  })

  it('keeps a timezone that is not in the list', async () => {
    businessApi({ ...business, timezone: 'Europe/Lisbon' })
    renderApp('/estabelecimento')

    const select = await screen.findByLabelText('Fuso horário')
    expect(select).toHaveValue('Europe/Lisbon')
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  })

  it('shows the API validation message on the field', async () => {
    businessApi(business, {
      'PATCH /business': () =>
        apiError(422, 'validation_error', 'Dados inválidos.', [
          { field: 'body.timezone', message: 'Value error, Fuso horário desconhecido. Exemplo: America/Sao_Paulo.', type: 'value_error' },
        ]),
    })
    renderApp('/estabelecimento')

    fireEvent.change(await screen.findByLabelText('Fuso horário'), { target: { value: 'America/Noronha' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Fuso horário desconhecido. Exemplo: America/Sao_Paulo.')).toBeInTheDocument()
  })

  it('is listed in the owner navigation', async () => {
    businessApi()
    renderApp('/estabelecimento')

    const [nav] = await screen.findAllByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).getByRole('link', { name: 'Estabelecimento' })).toHaveAttribute('aria-current', 'page')
  })
})
