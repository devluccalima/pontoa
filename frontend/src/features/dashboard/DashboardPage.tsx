import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../../api/errors'
import type { Dashboard, PaymentMethod } from '../../api/types'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, LoadError } from '../../components/ui/QueryState'
import { TextField } from '../../components/ui/TextField'
import { addDays, formatDate, startOfMonth, todayIn } from '../../lib/datetime'
import { formatMoney, toCents } from '../../lib/money'
import { METHOD_LABELS } from '../payments/api'
import { useDashboard } from './api'

type Period = { start: string; end: string }
type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

function presetPeriod(preset: Exclude<Preset, 'custom'>, today: string): Period {
  switch (preset) {
    case 'today':
      return { start: today, end: today }
    case 'yesterday':
      return { start: addDays(today, -1), end: addDays(today, -1) }
    case 'week':
      return { start: addDays(today, -6), end: today }
    case 'month':
      return { start: startOfMonth(today), end: today }
  }
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'week', label: '7 dias' },
  { id: 'month', label: 'Este mês' },
  { id: 'custom', label: 'Escolher datas' },
]

export function DashboardPage() {
  const { business } = useSession()
  const today = todayIn(business.timezone)
  const [preset, setPreset] = useState<Preset>('today')
  const [custom, setCustom] = useState<Period>({ start: today, end: today })
  const period = preset === 'custom' ? custom : presetPeriod(preset, today)
  const dashboard = useDashboard(period.start, period.end)

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Painel"
        description={
          period.start === period.end
            ? `Vendas de ${formatDate(period.start)}.`
            : `Vendas de ${formatDate(period.start)} a ${formatDate(period.end)}.`
        }
      />

      <div role="group" aria-label="Período" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={preset === item.id}
            onClick={() => setPreset(item.id)}
            className={[
              'min-h-12 shrink-0 rounded-md border px-4 font-medium whitespace-nowrap',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              preset === item.id ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? <CustomPeriod value={custom} today={today} onChange={setCustom} /> : null}

      {dashboard.isPending ? (
        <DelayedSpinner label="Carregando o painel" />
      ) : dashboard.error && !dashboard.data ? (
        <LoadError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : dashboard.data ? (
        <div className={`flex flex-col gap-6 transition-opacity duration-100 ${dashboard.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={dashboard.isPlaceholderData}>
          {dashboard.error ? <Alert>{errorMessage(dashboard.error)}</Alert> : null}
          <Indicators data={dashboard.data} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ReceivedByMethod data={dashboard.data} />
            <TopProducts data={dashboard.data} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function CustomPeriod({ value, today, onChange }: { value: Period; today: string; onChange: (period: Period) => void }) {
  const [start, setStart] = useState(value.start)
  const [end, setEnd] = useState(value.end)
  const [error, setError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!start || !end) return setError('Informe as duas datas.')
    if (end < start) return setError('A data final precisa ser igual ou posterior à inicial.')
    if (addDays(start, 365) < end) return setError('Escolha um período de até um ano.')
    setError(undefined)
    onChange({ start, end })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-wrap items-start gap-3">
      <TextField label="De" type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} error={error} />
      <TextField label="Até" type="date" value={end} max={today} onChange={(e) => setEnd(e.target.value)} />
      <Button type="submit" variant="primary" className="sm:mt-6">
        Ver período
      </Button>
    </form>
  )
}

/** Números-chave: o valor é o protagonista, sem gráfico (dataviz: "is it even a chart?"). */
function Indicators({ data }: { data: Dashboard }) {
  const tiles = [
    { label: 'Vendas', value: formatMoney(data.sales_total), hint: `${data.orders_count} ${data.orders_count === 1 ? 'pedido' : 'pedidos'}` },
    { label: 'Recebido', value: formatMoney(data.received_total), hint: 'Pix, dinheiro e cartão' },
    { label: 'A receber', value: formatMoney(data.receivable_total), hint: 'Dos pedidos do período', attention: toCents(data.receivable_total) > 0 },
    { label: 'Ticket médio', value: formatMoney(data.average_ticket), hint: 'Vendas ÷ pedidos' },
    { label: 'Cancelados', value: String(data.cancelled_count), hint: 'Fora das vendas' },
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tiles.map((tile, index) => (
        <div
          key={tile.label}
          className={`flex flex-col gap-1 rounded-md border border-hairline bg-surface p-4 ${index === 0 ? 'col-span-2 md:col-span-1' : ''}`}
        >
          <dt className="text-muted">{tile.label}</dt>
          <dd className={`text-[1.75rem] leading-tight font-bold tabular-nums ${tile.attention ? 'text-accent-text' : ''}`}>
            {tile.value}
          </dd>
          <dd className="text-sm text-muted">{tile.hint}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Barras horizontais de uma série só: rótulo e valor em texto ao lado de cada barra,
 * então a cor nunca é o único jeito de ler o número.
 */
function BarList({
  title,
  rows,
  empty,
  barClass,
}: {
  title: string
  rows: { key: string; label: string; value: string; detail?: string; cents: number }[]
  empty: string
  barClass: string
}) {
  const max = Math.max(0, ...rows.map((row) => row.cents))
  return (
    <section aria-labelledby={`bars-${title}`} className="flex flex-col gap-4 rounded-md border border-hairline bg-surface p-5">
      <h2 id={`bars-${title}`} className="text-lg font-semibold">
        {title}
      </h2>
      {max === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{row.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {row.value}
                  {row.detail ? <span className="font-normal text-muted"> · {row.detail}</span> : null}
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-bg" aria-hidden>
                <div
                  className={`h-2 rounded-full ${barClass}`}
                  style={{ width: `${row.cents === 0 ? 0 : Math.max(2, (row.cents / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const METHOD_ORDER: PaymentMethod[] = ['pix', 'cash', 'card']

function ReceivedByMethod({ data }: { data: Dashboard }) {
  const amounts = new Map(data.received_by_method.map((item) => [item.method, item.amount]))
  const rows = METHOD_ORDER.map((method) => {
    const amount = amounts.get(method) ?? '0.00'
    return { key: method, label: METHOD_LABELS[method], value: formatMoney(amount), cents: toCents(amount) }
  })
  // Verde = dinheiro recebido (DESIGN.md, "Cor tem significado").
  return <BarList title="Recebido por forma de pagamento" rows={rows} empty="Nada recebido no período." barClass="bg-success" />
}

function TopProducts({ data }: { data: Dashboard }) {
  const rows = data.top_products.map((product) => ({
    key: product.product_id,
    label: product.name,
    value: `${product.quantity} ${product.quantity === 1 ? 'unidade' : 'unidades'}`,
    detail: formatMoney(product.revenue),
    cents: product.quantity,
  }))
  return <BarList title="Mais vendidos" rows={rows} empty="Nenhuma venda no período." barClass="bg-primary" />
}
