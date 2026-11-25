import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dashboard } from '../../api/types'
import { saveToken } from '../../auth/tokenStore'
import { business, fakeApi, makeUser } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'
import { textMatcher } from '../../test/textMatcher'

const data: Dashboard = {
  start: '2026-11-25',
  end: '2026-11-25',
  timezone: 'America/Sao_Paulo',
  sales_total: '83.50',
  orders_count: 3,
  cancelled_count: 1,
  average_ticket: '27.83',
  received_total: '64.50',
  received_by_method: [
    { method: 'pix', amount: '20.00' },
    { method: 'cash', amount: '26.00' },
    { method: 'card', amount: '18.50' },
  ],
  receivable_total: '19.00',
  top_products: [{ product_id: 'p1', name: 'Arepa de queijo', quantity: 3, revenue: '55.50' }],
}

beforeEach(() => {
  // 25/11/2026 às 22:30 em São Paulo = 26/11 01:30 UTC: o "hoje" tem de ser o da barraca.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-26T01:30:00Z'))
})
afterEach(() => vi.useRealTimers())

function dashboardApi() {
  saveToken('t')
  return fakeApi({
    'GET /auth/me': () => ({ body: { user: makeUser('owner'), business } }),
    'GET /dashboard': ({ url }) => ({
      body: { ...data, start: url.searchParams.get('start'), end: url.searchParams.get('end') },
    }),
  })
}

const dashboardCalls = (fetchMock: ReturnType<typeof fakeApi>['fetchMock']) =>
  fetchMock.mock.calls.map((call) => String(call[0])).filter((url) => url.includes('/dashboard'))

describe('DashboardPage', () => {
  it('shows today in the business time zone with the key numbers', async () => {
    const { fetchMock } = dashboardApi()
    renderApp('/painel')

    expect(await screen.findByText(textMatcher('R$ 83,50'))).toBeInTheDocument()
    expect(screen.getByText('3 pedidos')).toBeInTheDocument()
    expect(screen.getByText(textMatcher('3 unidades · R$ 55,50'))).toBeInTheDocument()
    expect(screen.getByText('Vendas de 25/11/2026.')).toBeInTheDocument()
    expect(dashboardCalls(fetchMock)[0]).toContain('start=2026-11-25&end=2026-11-25')
  })

  it('switches between preset periods', async () => {
    const { fetchMock } = dashboardApi()
    renderApp('/painel')
    await screen.findByText(textMatcher('R$ 83,50'))

    fireEvent.click(screen.getByRole('button', { name: 'Este mês' }))

    await waitFor(() => expect(dashboardCalls(fetchMock).at(-1)).toContain('start=2026-11-01&end=2026-11-25'))
    expect(screen.getByRole('button', { name: 'Este mês' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('validates a custom period before asking the API', async () => {
    const { fetchMock } = dashboardApi()
    renderApp('/painel')
    await screen.findByText(textMatcher('R$ 83,50'))

    fireEvent.click(screen.getByRole('button', { name: 'Escolher datas' }))
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver período' }))

    expect(screen.getByText('A data final precisa ser igual ou posterior à inicial.')).toBeInTheDocument()
    expect(dashboardCalls(fetchMock).some((url) => url.includes('2026-11-10'))).toBe(false)
  })
})
