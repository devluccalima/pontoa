import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CashSession, Order } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { buildOrder } from '../../test/builders'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

const item = (name: string, quantity = 1, notes: string | null = null) => ({
  id: `i-${name}`,
  product_id: 'p',
  product_name: name,
  unit_price: '10.00',
  quantity,
  line_total: '10.00',
  notes,
})

const newOrder = buildOrder({ id: 'o1', number: 1, items: [item('Arepa de queijo', 2, 'sem cebola')] })
const preparing = buildOrder({ id: 'o2', number: 2, status: 'preparing', customer_name: null, payment_status: 'paid', paid_amount: '37.00', amount_due: '0.00', items: [item('Suco')] })
const delivered = buildOrder({ id: 'o3', number: 3, status: 'delivered', delivered_at: '2026-11-25T13:00:00Z', items: [item('Suco')] })

function ordersApi(role: 'owner' | 'operator', orders: Order[], extra: Parameters<typeof fakeApi>[0] = {}, cashOpen = true) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser(role), business } }),
    'GET /cash-sessions/current': () => ({ body: { session: cashOpen ? ({ id: 's1' } as CashSession) : null } }),
    'GET /orders': () => ({ body: orders }),
    ...extra,
  })
}

const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) })

describe('OrdersPage', () => {
  it('shows the queue by preparation step with items and payment', async () => {
    ordersApi('operator', [newOrder, preparing, delivered])
    renderApp('/pedidos')

    const novos = await screen.findByRole('region', { name: /^Novos/ })
    const card = within(novos).getByRole('article', { name: '#1' })
    expect(within(card).getByText('Arepa de queijo')).toBeInTheDocument()
    expect(within(card).getByText('sem cebola')).toBeInTheDocument()
    expect(within(card).getByText('A receber')).toBeInTheDocument()
    expect(within(column('Preparando')).getByText('Pago')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: '#3' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Em andamento (2)' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves an order to the next step', async () => {
    const { calls } = ordersApi('operator', [newOrder], {
      'POST /orders/o1/status': () => ({ body: { ...newOrder, status: 'preparing' } }),
    })
    renderApp('/pedidos')

    fireEvent.click(await screen.findByRole('button', { name: 'Começar preparo' }))

    expect(await screen.findByText('Pedido #1: preparando.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ status: 'preparing' })
  })

  it('lets operators cancel only new orders', async () => {
    ordersApi('operator', [newOrder, preparing])
    renderApp('/pedidos')

    expect(await screen.findByRole('button', { name: 'Cancelar pedido #1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar pedido #2' })).not.toBeInTheDocument()
  })

  it('asks for a reason and shows why a paid order cannot be cancelled', async () => {
    const { calls } = ordersApi('owner', [preparing], {
      'POST /orders/o2/cancel': () =>
        apiError(409, 'business_rule_violation', 'O pedido tem pagamentos. Estorne os pagamentos antes de cancelar.'),
    })
    renderApp('/pedidos')

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido #2' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancelar pedido #2?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar pedido' }))
    expect(within(dialog).getByText('Explique o motivo em poucas palavras.')).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST')).toBe(false)

    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'Cliente desistiu' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar pedido' }))

    expect(await within(dialog).findByText(/Estorne os pagamentos/)).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ reason: 'Cliente desistiu' })
  })

  it('lists delivered orders and offers to receive what is still due', async () => {
    ordersApi('operator', [newOrder, delivered])
    renderApp('/pedidos')

    fireEvent.click(await screen.findByRole('button', { name: 'Entregues (1)' }))

    expect(screen.getByText('#3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Receber' })).toBeInTheDocument()
  })

  it('explains that there is no queue without an open cash', async () => {
    ordersApi('operator', [], {}, false)
    renderApp('/pedidos')

    expect(await screen.findByText(/Não há caixa aberto/)).toBeInTheDocument()
  })
})
