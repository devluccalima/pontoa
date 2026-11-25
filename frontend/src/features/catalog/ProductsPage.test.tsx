import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Category, Product } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { formatMoney } from '../../lib/money'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

const arepas: Category = { id: 'c1', name: 'Arepas', position: 0, active: true }
const bebidas: Category = { id: 'c2', name: 'Bebidas', position: 1, active: true }
const queijo: Product = {
  id: 'p1',
  category_id: 'c1',
  name: 'Arepa de queijo',
  description: null,
  price: '18.50',
  position: 0,
  active: true,
}
const suco: Product = { ...queijo, id: 'p2', category_id: 'c2', name: 'Suco de maracujá', price: '9.00' }

function catalogApi(extra: Parameters<typeof fakeApi>[0] = {}) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser('owner'), business } }),
    'GET /categories': () => ({ body: [arepas, bebidas] }),
    'GET /products': () => ({ body: [queijo, suco] }),
    ...extra,
  })
}

describe('ProductsPage', () => {
  it('lists products with formatted prices and filters by category', async () => {
    catalogApi()
    renderApp('/produtos')

    expect(await screen.findByText('Arepa de queijo')).toBeInTheDocument()
    expect(screen.getByText(formatMoney('18.50'), { normalizer: (text) => text })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }))
    expect(screen.queryByText('Arepa de queijo')).not.toBeInTheDocument()
    expect(screen.getByText('Suco de maracujá')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bebidas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('creates a product converting the typed price', async () => {
    const { calls } = catalogApi({
      'POST /products': ({ body }) => ({ status: 201, body: { ...queijo, ...(body as object), id: 'p3' } }),
    })
    renderApp('/produtos')

    fireEvent.click(await screen.findByRole('button', { name: 'Novo produto' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo produto' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: '  Arepa de frango ' } })
    fireEvent.change(within(dialog).getByLabelText('Preço'), { target: { value: '21,5' } })
    fireEvent.change(within(dialog).getByLabelText('Categoria'), { target: { value: 'c1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Arepa de frango cadastrado.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      name: 'Arepa de frango',
      price: '21.50',
      category_id: 'c1',
      description: null,
      position: 0,
    })
  })

  it('validates the price before calling the API', async () => {
    const { calls } = catalogApi()
    renderApp('/produtos')

    fireEvent.click(await screen.findByRole('button', { name: 'Novo produto' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo produto' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Arepa' } })
    fireEvent.change(within(dialog).getByLabelText('Preço'), { target: { value: 'dezoito' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(within(dialog).getByLabelText('Preço')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('Informe o preço, por exemplo 18,50.')).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('sends only the changed fields when editing', async () => {
    const { calls } = catalogApi({
      'PATCH /products/p1': ({ body }) => ({ body: { ...queijo, ...(body as object) } }),
    })
    renderApp('/produtos')

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Arepa de queijo' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar produto' })
    expect(within(dialog).getByLabelText('Preço')).toHaveValue('18,50')
    fireEvent.change(within(dialog).getByLabelText('Preço'), { target: { value: '20' } })
    fireEvent.click(within(dialog).getByRole('switch', { name: /Disponível para venda/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    await screen.findByText('Arepa de queijo atualizado.')
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ price: '20.00', active: false })
  })

  it('shows the API message for a duplicated name', async () => {
    catalogApi({
      'POST /products': () => apiError(409, 'business_rule_violation', 'Já existe um produto com este nome.'),
    })
    renderApp('/produtos')

    fireEvent.click(await screen.findByRole('button', { name: 'Novo produto' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo produto' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'arepa de queijo' } })
    fireEvent.change(within(dialog).getByLabelText('Preço'), { target: { value: '18,50' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Já existe um produto com este nome.')
    expect(screen.getByRole('dialog', { name: 'Novo produto' })).toBeInTheDocument()
  })

  it('creates and deactivates categories', async () => {
    const { calls } = catalogApi({
      'POST /categories': ({ body }) => ({ status: 201, body: { id: 'c3', active: true, ...(body as object) } }),
      'PATCH /categories/c2': ({ body }) => ({ body: { ...bebidas, ...(body as object) } }),
    })
    renderApp('/produtos')

    fireEvent.click(await screen.findByRole('button', { name: 'Categorias' }))
    const dialog = screen.getByRole('dialog', { name: 'Categorias' })
    fireEvent.change(within(dialog).getByLabelText('Nova categoria'), { target: { value: 'Doces' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar' }))
    await screen.findByText('Categoria Doces criada.')

    const row = within(dialog).getByText('Bebidas').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: 'Desativar' }))
    await screen.findByText('Bebidas desativada.')

    await waitFor(() =>
      expect(calls.filter((call) => call.method !== 'GET').map((call) => [call.method, call.path, call.body])).toEqual([
        ['POST', '/categories', { name: 'Doces', position: 2 }],
        ['PATCH', '/categories/c2', { active: false }],
      ]),
    )
  })
})
