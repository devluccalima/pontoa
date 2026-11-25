import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CashSession, Order, Payment, Product } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'
import { textMatcher } from '../../test/textMatcher'

const queijo: Product = { id: 'p1', category_id: 'c1', name: 'Arepa de queijo', description: null, price: '18.50', position: 0, active: true }
const suco: Product = { ...queijo, id: 'p2', category_id: 'c2', name: 'Suco', price: '9.00' }
const inativo: Product = { ...queijo, id: 'p3', name: 'Fora do cardápio', active: false }
const session = { id: 's1', is_open: true } as CashSession

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    cash_session_id: 's1',
    number: 1,
    customer_name: 'Ana',
    notes: null,
    status: 'new',
    total: '37.00',
    paid_amount: '0.00',
    amount_due: '37.00',
    payment_status: 'unpaid',
    items: [],
    created_by_id: 'u',
    created_at: '2026-11-25T12:00:00Z',
    delivered_at: null,
    cancelled_at: null,
    cancelled_by_id: null,
    cancel_reason: null,
    ...overrides,
  }
}

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: 'pay',
    order_id: 'o1',
    cash_session_id: 's1',
    method: 'pix',
    amount: '37.00',
    received_amount: null,
    change: null,
    created_by_id: 'u',
    created_at: '2026-11-25T12:00:00Z',
    is_voided: false,
    voided_at: null,
    voided_by_id: null,
    void_reason: null,
    ...overrides,
  }
}

function posApi(options: { cashOpen?: boolean; role?: 'owner' | 'operator' } = {}, extra: Parameters<typeof fakeApi>[0] = {}) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser(options.role ?? 'operator'), business } }),
    'GET /cash-sessions/current': () => ({ body: { session: options.cashOpen === false ? null : session } }),
    'GET /products': () => ({ body: [queijo, suco, inativo] }),
    'GET /categories': () => ({
      body: [
        { id: 'c1', name: 'Arepas', position: 0, active: true },
        { id: 'c2', name: 'Bebidas', position: 1, active: true },
      ],
    }),
    ...extra,
  })
}

const card = (name: RegExp) => screen.findByRole('button', { name })

describe('PosPage', () => {
  it('builds the order by tapping products', async () => {
    posApi()
    renderApp('/pdv')

    fireEvent.click(await card(/^Arepa de queijo/))
    fireEvent.click(await card(/^Arepa de queijo/))
    fireEvent.click(await card(/^Suco/))

    expect(screen.getByRole('button', { name: /^Arepa de queijo, .*, 2 na comanda$/ })).toBeInTheDocument()
    const cart = screen.getByRole('complementary', { name: 'Comanda' })
    expect(within(cart).getByText(textMatcher('R$ 46,00'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fora do cardápio/ })).not.toBeInTheDocument()
  })

  it('removes an item and lets the attendant undo it', async () => {
    posApi()
    renderApp('/pdv')

    fireEvent.click(await card(/^Suco/))
    const cart = screen.getByRole('complementary', { name: 'Comanda' })
    fireEvent.click(within(cart).getByRole('button', { name: 'Remover Suco' }))
    expect(within(cart).queryByText('Suco')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(within(cart).getByText('Suco')).toBeInTheDocument()
  })

  it('creates the order and opens the payment', async () => {
    const { calls } = posApi({}, {
      'POST /orders': () => ({ status: 201, body: order() }),
      'GET /orders/o1': () => ({ body: order() }),
    })
    renderApp('/pdv')

    fireEvent.click(await card(/^Arepa de queijo/))
    const cart = screen.getByRole('complementary', { name: 'Comanda' })
    fireEvent.click(within(cart).getByRole('button', { name: 'Adicionar observação a Arepa de queijo' }))
    fireEvent.change(within(cart).getByLabelText('Observação: Arepa de queijo'), { target: { value: ' sem cebola ' } })
    fireEvent.change(within(cart).getByLabelText('Nome do cliente (opcional)'), { target: { value: 'Ana' } })
    fireEvent.click(within(cart).getByRole('button', { name: 'Finalizar pedido' }))

    expect(await screen.findByRole('dialog', { name: 'Receber pedido #1' })).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      customer_name: 'Ana',
      items: [{ product_id: 'p1', quantity: 1, notes: 'sem cebola' }],
    })
    expect(within(cart).getByText('Toque nos produtos para montar o pedido.')).toBeInTheDocument()
  })

  it('keeps the cart when the order fails', async () => {
    posApi({}, {
      'POST /orders': () => apiError(409, 'business_rule_violation', 'O caixa está fechado. Abra o caixa para continuar.'),
    })
    renderApp('/pdv')

    fireEvent.click(await card(/^Suco/))
    const cart = screen.getByRole('complementary', { name: 'Comanda' })
    fireEvent.click(within(cart).getByRole('button', { name: 'Finalizar pedido' }))

    expect(await screen.findByText('O caixa está fechado. Abra o caixa para continuar.')).toBeInTheDocument()
    expect(within(cart).getByText('Suco')).toBeInTheDocument()
  })

  it('keeps the cart after reloading the page', async () => {
    posApi()
    const { unmount } = renderApp('/pdv')
    fireEvent.click(await card(/^Suco/))
    unmount()

    renderApp('/pdv')
    expect(await card(/^Suco, .*, 1 na comanda$/)).toBeInTheDocument()
  })

  it('blocks selling while the cash is closed', async () => {
    posApi({ cashOpen: false, role: 'owner' })
    renderApp('/pdv')

    expect(await screen.findByRole('link', { name: 'Abrir o caixa' })).toHaveAttribute('href', '/caixa')
    expect(await card(/^Suco/)).toBeDisabled()
  })
})

describe('PaymentDialog', () => {
  async function openPayment(extra: Parameters<typeof fakeApi>[0]) {
    const api = posApi({}, { 'POST /orders': () => ({ status: 201, body: order() }), ...extra })
    renderApp('/pdv')
    fireEvent.click(await card(/^Suco/))
    fireEvent.click(within(screen.getByRole('complementary', { name: 'Comanda' })).getByRole('button', { name: 'Finalizar pedido' }))
    return { ...api, dialog: await screen.findByRole('dialog', { name: 'Receber pedido #1' }) }
  }

  it('splits between Pix and cash and shows the change', async () => {
    let paid = '0.00'
    const { calls, dialog } = await openPayment({
      'GET /orders/o1': () => ({
        body: order({ paid_amount: paid, amount_due: paid === '0.00' ? '37.00' : '17.00', payment_status: paid === '0.00' ? 'unpaid' : 'partial' }),
      }),
      'POST /orders/o1/payments': ({ body }) => {
        const data = body as { method: Payment['method']; amount: string; received_amount: string | null }
        if (data.method === 'pix') {
          paid = '20.00'
          return { status: 201, body: payment({ method: 'pix', amount: '20.00' }) }
        }
        return { status: 201, body: payment({ method: 'cash', amount: '17.00', received_amount: '20.00', change: '3.00' }) }
      },
    })

    fireEvent.change(within(dialog).getByLabelText('Valor deste pagamento'), { target: { value: '20' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }))
    await screen.findByText(textMatcher('Pix registrado. Falta R$ 17,00.'))
    await waitFor(() => expect(within(dialog).getByLabelText('Valor deste pagamento')).toHaveValue('17,00'))

    fireEvent.click(within(dialog).getByRole('radio', { name: 'Dinheiro' }))
    fireEvent.change(within(dialog).getByLabelText('Valor recebido (opcional)'), { target: { value: '20' } })
    expect(within(dialog).getByText(textMatcher('R$ 3,00'))).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }))

    expect(await screen.findByText(textMatcher('Pedido #1 pago. Troco: R$ 3,00.'))).toBeInTheDocument()
    expect(calls.filter((call) => call.method === 'POST' && call.path.endsWith('/payments')).map((call) => call.body)).toEqual([
      { method: 'pix', amount: '20.00', received_amount: null },
      { method: 'cash', amount: '17.00', received_amount: '20.00' },
    ])
  })

  it('blocks paying more than the amount due', async () => {
    const { calls, dialog } = await openPayment({ 'GET /orders/o1': () => ({ body: order() }) })

    fireEvent.change(within(dialog).getByLabelText('Valor deste pagamento'), { target: { value: '50' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }))

    expect(within(dialog).getByText(textMatcher('O saldo do pedido é R$ 37,00.'))).toBeInTheDocument()
    expect(calls.some((call) => call.path.endsWith('/payments'))).toBe(false)
  })
})
