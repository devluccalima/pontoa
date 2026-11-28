import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Product, StockMovement } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

const arepa: Product = {
  id: 'p1',
  category_id: null,
  name: 'Arepa',
  description: null,
  price: '18.50',
  position: 0,
  active: true,
  stock_quantity: 3,
}
const suco: Product = { ...arepa, id: 'p2', name: 'Suco', stock_quantity: null }
const antigo: Product = { ...arepa, id: 'p3', name: 'Fora do cardápio', active: false }

const sale: StockMovement = {
  id: 'm2',
  product_id: 'p1',
  kind: 'sale',
  quantity_change: -2,
  balance: 3,
  order_id: 'o1',
  reason: null,
  created_by_id: 'u1',
  created_at: '2026-11-28T15:30:00Z',
}
const adjustment: StockMovement = {
  ...sale,
  id: 'm1',
  kind: 'adjustment',
  quantity_change: 5,
  balance: 5,
  order_id: null,
  reason: 'Produção do dia',
  created_at: '2026-11-28T12:00:00Z',
}

function stockApi(products: Product[] = [arepa, suco, antigo], extra: Parameters<typeof fakeApi>[0] = {}) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser('owner'), business } }),
    'GET /products': () => ({ body: products }),
    'GET /products/p1/stock/movements': () => ({ body: [sale, adjustment] }),
    'GET /products/p2/stock/movements': () => ({ body: [] }),
    ...extra,
  })
}

describe('StockPage', () => {
  it('separates products with and without stock control', async () => {
    stockApi()
    renderApp('/estoque')

    const tracked = (await screen.findByRole('heading', { name: 'Com estoque controlado' })).parentElement!
    expect(within(tracked).getByRole('button', { name: 'Estoque de Arepa' })).toHaveTextContent('3 unidades')
    const untracked = screen.getByRole('heading', { name: 'Sem controle' }).closest('div')!.parentElement!
    expect(within(untracked).getByRole('button', { name: 'Estoque de Suco' })).toHaveTextContent('Controlar')
    expect(screen.queryByText('Fora do cardápio')).not.toBeInTheDocument()
  })

  it('starts controlling the stock of a product', async () => {
    const { calls } = stockApi([arepa, suco], {
      'PUT /products/p2/stock': ({ body }) => ({ body: { ...suco, stock_quantity: (body as { quantity: number }).quantity } }),
    })
    renderApp('/estoque')

    fireEvent.click(await screen.findByRole('button', { name: 'Estoque de Suco' }))
    const dialog = await screen.findByRole('dialog', { name: 'Suco' })
    fireEvent.change(within(dialog).getByLabelText('Quantidade em estoque'), { target: { value: '24' } })
    fireEvent.change(within(dialog).getByLabelText('Motivo (opcional)'), { target: { value: ' Compra ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Controlar estoque' }))

    expect(await screen.findByText('Estoque de Suco: 24 unidades.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ quantity: 24, reason: 'Compra' })
  })

  it('shows the movement history and the current balance', async () => {
    stockApi()
    renderApp('/estoque')

    fireEvent.click(await screen.findByRole('button', { name: 'Estoque de Arepa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Arepa' })

    expect(within(dialog).getByText('Em estoque agora: 3 unidades.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Quantidade em estoque')).toHaveValue('3')
    const rows = await within(dialog).findAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Venda')
    expect(rows[0]).toHaveTextContent('−2')
    expect(rows[1]).toHaveTextContent('Produção do dia')
    expect(rows[1]).toHaveTextContent('+5')
  })

  it('rejects a quantity that is not a whole number', async () => {
    const { calls } = stockApi()
    renderApp('/estoque')

    fireEvent.click(await screen.findByRole('button', { name: 'Estoque de Arepa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Arepa' })
    fireEvent.change(within(dialog).getByLabelText('Quantidade em estoque'), { target: { value: '2,5' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar estoque' }))

    expect(await within(dialog).findByText('Informe um número inteiro de 0 a 100.000.')).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'PUT')).toBe(false)
  })

  it('turns the stock control off after confirming', async () => {
    const { calls } = stockApi([arepa, suco], {
      'DELETE /products/p1/stock': () => ({ body: { ...arepa, stock_quantity: null } }),
    })
    renderApp('/estoque')

    fireEvent.click(await screen.findByRole('button', { name: 'Estoque de Arepa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Arepa' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desligar controle de estoque' }))
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desligar controle' }))

    expect(await screen.findByText('Arepa volta a ser vendido sem limite.')).toBeInTheDocument()
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(1)
  })

  it('shows the API message when saving fails', async () => {
    stockApi([arepa], {
      'PUT /products/p1/stock': () => apiError(404, 'not_found', 'Produto não encontrado.'),
    })
    renderApp('/estoque')

    fireEvent.click(await screen.findByRole('button', { name: 'Estoque de Arepa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Arepa' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar estoque' }))

    // Produto apagado em outro aparelho: o diálogo explica em vez de fechar.
    expect(await within(dialog).findByText('Este registro não está mais disponível.')).toBeInTheDocument()
  })

  it('is listed in the owner navigation', async () => {
    stockApi()
    renderApp('/estoque')

    const [nav] = await screen.findAllByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).getByRole('link', { name: 'Estoque' })).toHaveAttribute('aria-current', 'page')
  })
})
