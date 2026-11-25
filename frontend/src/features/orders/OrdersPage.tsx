import { useState } from 'react'
import { Link } from 'react-router'
import { ClipboardList } from 'lucide-react'
import { errorMessage } from '../../api/errors'
import type { Order, OrderStatus } from '../../api/types'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, EmptyState, LoadError } from '../../components/ui/QueryState'
import { useToast } from '../../components/ui/useToast'
import { formatDateTime, formatTime } from '../../lib/datetime'
import { formatMoney, toCents } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { useCurrentCash } from '../cash/api'
import { usePendingPayments } from '../payments/api'
import { OrderPaymentsDialog } from '../payments/OrderPaymentsDialog'
import { PaymentDialog } from '../payments/PaymentDialog'
import { useChangeStatus, useCurrentOrders } from './api'
import { CancelOrderDialog } from './CancelOrderDialog'
import { OrderCard, PaymentBadge, PaymentsLink } from './OrderCard'
import { NEXT_STEP, STATUS_LABELS } from './status'

type View = 'queue' | 'pending' | 'delivered' | 'cancelled'

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: 'new', title: 'Novos' },
  { status: 'preparing', title: 'Preparando' },
  { status: 'ready', title: 'Prontos' },
]

export function OrdersPage() {
  const { user } = useSession()
  const cash = useCurrentCash()
  const orders = useCurrentOrders()
  const [view, setView] = useState<View>('queue')
  const pending = usePendingPayments()
  const [receiving, setReceiving] = useState<Order | null>(null)
  const [cancelling, setCancelling] = useState<Order | null>(null)
  const [inspecting, setInspecting] = useState<Order | null>(null)

  const all = orders.data ?? []
  const byStatus = (status: OrderStatus) => all.filter((order) => order.status === status)
  const queueCount = all.filter((order) => NEXT_STEP[order.status]).length
  const delivered = byStatus('delivered')
  const cancelled = byStatus('cancelled')
  const canCancel = (order: Order) =>
    order.status !== 'delivered' && order.status !== 'cancelled' && (user.role === 'owner' || order.status === 'new')

  const views: { id: View; label: string; count: number }[] = [
    { id: 'queue', label: 'Em andamento', count: queueCount },
    { id: 'pending', label: 'A receber', count: pending.data?.length ?? 0 },
    { id: 'delivered', label: 'Entregues', count: delivered.length },
    { id: 'cancelled', label: 'Cancelados', count: cancelled.length },
  ]

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Pedidos" description="Fila de preparo do caixa aberto. Atualiza sozinha." />

      {orders.isPending || cash.isPending ? (
        <DelayedSpinner label="Carregando pedidos" />
      ) : orders.error ? (
        <LoadError error={orders.error} onRetry={() => void orders.refetch()} />
      ) : !cash.data ? (
        <Alert tone="info">
          Não há caixa aberto, então não há fila de pedidos.{' '}
          {user.role === 'owner' ? (
            <Link to="/caixa" className="font-semibold underline underline-offset-4">
              Abrir o caixa
            </Link>
          ) : null}
        </Alert>
      ) : (
        <>
          <div role="group" aria-label="Mostrar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {views.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
                className={[
                  'min-h-12 shrink-0 rounded-md border px-4 font-medium whitespace-nowrap',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  view === item.id ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
                ].join(' ')}
              >
                {item.label} <span className="tabular-nums">({item.count})</span>
              </button>
            ))}
          </div>

          {view === 'queue' ? (
            queueCount === 0 ? (
              <EmptyState icon={<ClipboardList size={28} aria-hidden />} title="Nenhum pedido em andamento">
                Os pedidos feitos em Vender aparecem aqui.
              </EmptyState>
            ) : (
              <Queue
                columns={COLUMNS.map((column) => ({ ...column, orders: byStatus(column.status) }))}
                canCancel={canCancel}
                onReceive={setReceiving}
                onPayments={setInspecting}
                onCancel={setCancelling}
              />
            )
          ) : view === 'pending' ? (
            <PendingList query={pending} onReceive={setReceiving} onPayments={setInspecting} />
          ) : (
            <ClosedList
              orders={view === 'delivered' ? delivered : cancelled}
              emptyTitle={view === 'delivered' ? 'Nenhum pedido entregue ainda' : 'Nenhum pedido cancelado'}
              onReceive={setReceiving}
              onPayments={setInspecting}
            />
          )}
        </>
      )}

      {receiving ? <PaymentDialog order={receiving} onClose={() => setReceiving(null)} /> : null}
      {cancelling ? <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} /> : null}
      {inspecting ? (
        <OrderPaymentsDialog
          order={inspecting}
          onClose={() => setInspecting(null)}
          onReceive={(order) => {
            setInspecting(null)
            setReceiving(order)
          }}
        />
      ) : null}
    </section>
  )
}

function Queue({
  columns,
  canCancel,
  onReceive,
  onPayments,
  onCancel,
}: {
  columns: { status: OrderStatus; title: string; orders: Order[] }[]
  canCancel: (order: Order) => boolean
  onReceive: (order: Order) => void
  onPayments: (order: Order) => void
  onCancel: (order: Order) => void
}) {
  const now = useNow()
  const changeStatus = useChangeStatus()
  const { showToast } = useToast()

  function advance(order: Order) {
    const next = NEXT_STEP[order.status]
    if (!next) return
    changeStatus.mutate(
      { id: order.id, status: next.status },
      {
        onSuccess: (updated) =>
          showToast({ tone: 'success', message: `Pedido #${updated.number}: ${STATUS_LABELS[updated.status].toLowerCase()}.` }),
        onError: (error) => showToast({ tone: 'error', message: errorMessage(error) }),
      },
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {columns.map((column) => (
        <section key={column.status} aria-labelledby={`column-${column.status}`} className="flex flex-col gap-3">
          <h2 id={`column-${column.status}`} className="flex items-center gap-2 text-lg font-semibold">
            {column.title}
            <Badge>{column.orders.length}</Badge>
          </h2>
          {column.orders.length === 0 ? (
            <p className="rounded-md border border-dashed border-hairline px-4 py-6 text-center text-muted">Nenhum pedido.</p>
          ) : (
            column.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                now={now}
                canCancel={canCancel(order)}
                advancing={changeStatus.isPending && changeStatus.variables?.id === order.id}
                onAdvance={() => advance(order)}
                onReceive={() => onReceive(order)}
                onPayments={() => onPayments(order)}
                onCancel={() => onCancel(order)}
              />
            ))
          )}
        </section>
      ))}
    </div>
  )
}

function ClosedList({
  orders,
  emptyTitle,
  onReceive,
  onPayments,
}: {
  orders: Order[]
  emptyTitle: string
  onReceive: (order: Order) => void
  onPayments: (order: Order) => void
}) {
  const { business } = useSession()
  if (orders.length === 0) return <EmptyState icon={<ClipboardList size={28} aria-hidden />} title={emptyTitle} />
  return (
    <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
      {[...orders].reverse().map((order) => (
        <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold">
              <span className="tabular-nums">#{order.number}</span>
              {order.customer_name ? <span className="font-normal text-muted"> · {order.customer_name}</span> : null}
            </p>
            <p className="text-sm text-muted">
              {order.status === 'cancelled'
                ? `Cancelado${order.cancelled_at ? ` às ${formatTime(order.cancelled_at, business.timezone)}` : ''}: ${order.cancel_reason ?? ''}`
                : `Entregue${order.delivered_at ? ` às ${formatTime(order.delivered_at, business.timezone)}` : ''} · ${order.items
                    .map((item) => `${item.quantity}× ${item.product_name}`)
                    .join(', ')}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold tabular-nums">{formatMoney(order.total)}</span>
            {order.status === 'cancelled' ? <Badge tone="danger">Cancelado</Badge> : <PaymentBadge order={order} />}
            {toCents(order.paid_amount) > 0 ? <PaymentsLink onClick={() => onPayments(order)} /> : null}
            {order.status !== 'cancelled' && toCents(order.amount_due) > 0 ? (
              <Button variant="secondary" onClick={() => onReceive(order)}>
                Receber
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function PendingList({
  query,
  onReceive,
  onPayments,
}: {
  query: ReturnType<typeof usePendingPayments>
  onReceive: (order: Order) => void
  onPayments: (order: Order) => void
}) {
  const { business } = useSession()
  if (query.isPending) return <DelayedSpinner label="Carregando pedidos a receber" />
  if (query.error) return <LoadError error={query.error} onRetry={() => void query.refetch()} />
  if (query.data.length === 0) {
    return (
      <EmptyState icon={<ClipboardList size={28} aria-hidden />} title="Nada a receber">
        Todos os pedidos estão pagos.
      </EmptyState>
    )
  }
  return (
    <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
      {query.data.map((order) => (
        <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold">
              <span className="tabular-nums">#{order.number}</span>
              {order.customer_name ? <span className="font-normal text-muted"> · {order.customer_name}</span> : null}
            </p>
            <p className="text-sm text-muted">
              {formatDateTime(order.created_at, business.timezone)} · {STATUS_LABELS[order.status]} · Total {formatMoney(order.total)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-accent-text tabular-nums">Falta {formatMoney(order.amount_due)}</span>
            {toCents(order.paid_amount) > 0 ? <PaymentsLink onClick={() => onPayments(order)} /> : null}
            <Button variant="secondary" onClick={() => onReceive(order)}>
              Receber
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
