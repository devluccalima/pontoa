import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CashSession } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { apiError, business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'
import { textMatcher as money } from '../../test/textMatcher'

const openSession: CashSession = {
  id: 's1',
  is_open: true,
  opened_by_id: 'u1',
  opened_at: '2026-11-25T12:00:00Z',
  closed_by_id: null,
  closed_at: null,
  counted_amount: null,
  difference: null,
  closing_notes: null,
  summary: {
    opening_amount: '100.00',
    deposits: '50.00',
    withdrawals: '30.00',
    cash_payments: '17.00',
    expected_amount: '137.00',
  },
}

function cashApi(role: 'owner' | 'operator', session: CashSession | null, extra: Parameters<typeof fakeApi>[0] = {}) {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser(role), business } }),
    'GET /cash-sessions/current': () => ({ body: { session } }),
    'GET /cash-sessions': () => ({ body: [] }),
    'GET /cash-sessions/s1/movements': () => ({ body: [] }),
    ...extra,
  })
}

describe('CashPage', () => {
  it('lets the owner open the cash with no change', async () => {
    const { calls } = cashApi('owner', null, {
      'POST /cash-sessions': () => ({ status: 201, body: openSession }),
    })
    renderApp('/caixa')

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir caixa' }))

    expect(await screen.findByText('Caixa aberto. Boas vendas!')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ opening_amount: '0.00' })
  })

  it('tells operators to ask the owner when the cash is closed', async () => {
    cashApi('operator', null)
    renderApp('/caixa')

    expect(await screen.findByText(/Peça ao dono para abrir o caixa/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir caixa' })).not.toBeInTheDocument()
  })

  it('shows the expected amount and its breakdown', async () => {
    cashApi('operator', openSession)
    renderApp('/caixa')

    expect(await screen.findByText('Esperado na gaveta')).toBeInTheDocument()
    expect(screen.getByText(money('R$ 137,00'))).toBeInTheDocument()
    expect(screen.getByText(money('+ R$ 17,00'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fechar caixa' })).not.toBeInTheDocument()
  })

  it('blocks a withdrawal larger than the drawer before calling the API', async () => {
    const { calls } = cashApi('owner', openSession)
    renderApp('/caixa')

    fireEvent.click(await screen.findByRole('button', { name: 'Sangria' }))
    const dialog = screen.getByRole('dialog', { name: 'Sangria' })
    fireEvent.change(within(dialog).getByLabelText('Valor'), { target: { value: '500' } })
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'Cofre' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar sangria' }))

    expect(within(dialog).getByText(money('A gaveta tem R$ 137,00.'))).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('shows the difference while counting and closes the cash', async () => {
    const { calls } = cashApi('owner', openSession, {
      'POST /cash-sessions/current/close': () => ({
        body: { ...openSession, is_open: false, counted_amount: '135.00', difference: '-2.00' },
      }),
    })
    renderApp('/caixa')

    fireEvent.click(await screen.findByRole('button', { name: 'Fechar caixa' }))
    const dialog = screen.getByRole('dialog', { name: 'Fechar caixa' })
    fireEvent.change(within(dialog).getByLabelText('Valor contado'), { target: { value: '135' } })

    expect(within(dialog).getByText(money('Falta R$ 2,00'))).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar caixa' }))
    expect(await screen.findByText(money('Caixa fechado. Diferença de -R$ 2,00.'))).toBeInTheDocument()
    expect(calls.find((call) => call.path === '/cash-sessions/current/close')?.body).toEqual({
      counted_amount: '135.00',
      notes: null,
    })
  })

  it('explains why the cash cannot be closed', async () => {
    cashApi('owner', openSession, {
      'POST /cash-sessions/current/close': () =>
        apiError(409, 'business_rule_violation', 'Há pedidos em andamento. Entregue ou cancele antes de fechar o caixa.'),
    })
    renderApp('/caixa')

    fireEvent.click(await screen.findByRole('button', { name: 'Fechar caixa' }))
    const dialog = screen.getByRole('dialog', { name: 'Fechar caixa' })
    fireEvent.change(within(dialog).getByLabelText('Valor contado'), { target: { value: '137' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar caixa' }))

    expect(await within(dialog).findByText(/Há pedidos em andamento/)).toBeInTheDocument()
  })

  it('shows the closing notes in the history, or a dash when there are none', async () => {
    const closed = (id: string, closedAt: string, notes: string | null): CashSession => ({
      ...openSession,
      id,
      is_open: false,
      closed_at: closedAt,
      closed_by_id: 'u1',
      counted_amount: '135.00',
      difference: '-2.00',
      closing_notes: notes,
    })
    cashApi('owner', null, {
      'GET /cash-sessions': () => ({
        body: [closed('a', '2026-11-25T22:00:00Z', 'Faltou troco de R$ 2'), closed('b', '2026-11-24T22:00:00Z', null)],
      }),
    })
    renderApp('/caixa')

    const history = (await screen.findByRole('heading', { name: 'Últimos fechamentos' })).parentElement!
    const rows = await within(history).findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Observação: Faltou troco de R$ 2')
    expect(rows[1]).toHaveTextContent('Observação: —')
  })
})
