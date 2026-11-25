import { useState } from 'react'
import type { FormEvent } from 'react'
import { Banknote, Undo2 } from 'lucide-react'
import { errorMessage } from '../../api/errors'
import type { Order, Payment } from '../../api/types'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { DelayedSpinner, LoadError } from '../../components/ui/QueryState'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { formatDateTime } from '../../lib/datetime'
import { formatMoney, toCents } from '../../lib/money'
import { useOrder } from '../orders/api'
import { METHOD_LABELS, useOrderPayments, useVoidPayment } from './api'

/**
 * Pagamentos de um pedido (ADR-0009). O dono estorna pagamentos do caixa aberto;
 * o estorno exige motivo e devolve o valor ao saldo do pedido.
 */
export function OrderPaymentsDialog({
  order: initialOrder,
  onReceive,
  onClose,
}: {
  order: Order
  onReceive: (order: Order) => void
  onClose: () => void
}) {
  const { user } = useSession()
  const { data: order = initialOrder } = useOrder(initialOrder.id)
  const payments = useOrderPayments(order.id)
  const owes = toCents(order.amount_due) > 0 && order.status !== 'cancelled'

  return (
    <Dialog
      open
      title={`Pagamentos do pedido #${order.number}`}
      description={order.customer_name ? `Cliente: ${order.customer_name}` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {owes ? (
            <Button variant="primary" icon={<Banknote size={20} aria-hidden />} onClick={() => onReceive(order)}>
              Receber {formatMoney(order.amount_due)}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-2 rounded-md bg-bg px-4 py-3 text-center">
          <Amount label="Total" value={order.total} />
          <Amount label="Pago" value={order.paid_amount} />
          <Amount label="Falta" value={order.amount_due} />
        </dl>
        {payments.isPending ? (
          <DelayedSpinner label="Carregando pagamentos" />
        ) : payments.error ? (
          <LoadError error={payments.error} onRetry={() => void payments.refetch()} />
        ) : payments.data.length === 0 ? (
          <p className="text-muted">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {payments.data.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} canVoid={user.role === 'owner' && !payment.is_voided} />
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{formatMoney(value)}</dd>
    </div>
  )
}

function PaymentRow({ payment, canVoid }: { payment: Payment; canVoid: boolean }) {
  const { business } = useSession()
  const voidPayment = useVoidPayment()
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reason.trim().length < 3) {
      setLocalError('Explique o motivo em poucas palavras.')
      return
    }
    setLocalError(undefined)
    voidPayment.mutate(
      { id: payment.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setConfirming(false)
          showToast({ tone: 'success', message: `Pagamento de ${formatMoney(payment.amount)} estornado.` })
        },
      },
    )
  }

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {METHOD_LABELS[payment.method]}
            {payment.is_voided ? <Badge tone="danger">Estornado</Badge> : null}
          </p>
          <p className="text-sm text-muted">
            {formatDateTime(payment.created_at, business.timezone)}
            {payment.received_amount ? ` · Recebido ${formatMoney(payment.received_amount)}` : ''}
            {payment.change && toCents(payment.change) > 0 ? ` · Troco ${formatMoney(payment.change)}` : ''}
          </p>
          {payment.is_voided && payment.void_reason ? (
            <p className="text-sm text-muted">Motivo do estorno: {payment.void_reason}</p>
          ) : null}
        </div>
        <span className={`font-semibold tabular-nums ${payment.is_voided ? 'text-muted line-through' : ''}`}>
          {formatMoney(payment.amount)}
        </span>
      </div>

      {canVoid && !confirming ? (
        <Button variant="quiet-danger" className="self-start" icon={<Undo2 size={20} aria-hidden />} onClick={() => setConfirming(true)}>
          Estornar
        </Button>
      ) : null}
      {confirming ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-md border border-hairline p-3">
          <p className="text-muted">
            O valor volta para o saldo do pedido{payment.method === 'cash' ? ' e sai do esperado na gaveta' : ''}. Não é possível desfazer.
          </p>
          {voidPayment.error ? <Alert>{errorMessage(voidPayment.error)}</Alert> : null}
          <TextField
            label="Motivo do estorno"
            placeholder="Ex.: cobrado em duplicidade"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={localError}
            maxLength={200}
            autoFocus
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button type="submit" variant="danger" loading={voidPayment.isPending} loadingText="Estornando…">
              Estornar pagamento
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  )
}
