import { ArrowRight, Banknote, X } from 'lucide-react'
import type { Order } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatMoney, toCents } from '../../lib/money'
import { NEXT_STEP, PAYMENT_LABELS, elapsedLabel } from './status'

type Props = {
  order: Order
  now: number
  canCancel: boolean
  advancing: boolean
  onAdvance: () => void
  onReceive: () => void
  onCancel: () => void
}

export function PaymentBadge({ order }: { order: Order }) {
  return (
    <Badge tone={order.payment_status === 'paid' ? 'success' : 'attention'}>
      {PAYMENT_LABELS[order.payment_status]}
    </Badge>
  )
}

export function OrderCard({ order, now, canCancel, advancing, onAdvance, onReceive, onCancel }: Props) {
  const next = NEXT_STEP[order.status]
  const owes = toCents(order.amount_due) > 0
  return (
    <article
      aria-labelledby={`order-${order.id}`}
      className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`order-${order.id}`} className="text-2xl leading-tight font-bold tabular-nums">
            #{order.number}
          </h3>
          <p className="truncate text-muted">
            {order.customer_name ? `${order.customer_name} · ` : ''}
            {elapsedLabel(order.created_at, now)}
          </p>
        </div>
        <PaymentBadge order={order} />
      </header>

      <ul className="flex flex-col gap-1">
        {order.items.map((item) => (
          <li key={item.id}>
            <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.product_name}
            {item.notes ? <span className="block pl-6 text-sm text-accent-text">{item.notes}</span> : null}
          </li>
        ))}
      </ul>
      {order.notes ? <p className="rounded-sm bg-accent-bg px-3 py-2 text-sm text-accent-text">{order.notes}</p> : null}

      <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
        <span className="text-muted">Total</span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(order.total)}</span>
      </div>

      <div className="flex flex-col gap-2">
        {next ? (
          <Button variant="primary" className="w-full" icon={<ArrowRight size={20} aria-hidden />} loading={advancing} onClick={onAdvance}>
            {next.label}
          </Button>
        ) : null}
        {owes || canCancel ? (
          <div className="flex gap-2">
            {owes ? (
              <Button variant="secondary" className="flex-1" icon={<Banknote size={20} aria-hidden />} onClick={onReceive}>
                Receber
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="quiet-danger"
                className={owes ? 'px-3' : 'flex-1'}
                icon={<X size={20} aria-hidden />}
                onClick={onCancel}
                aria-label={`Cancelar pedido #${order.number}`}
              >
                {owes ? null : 'Cancelar'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
