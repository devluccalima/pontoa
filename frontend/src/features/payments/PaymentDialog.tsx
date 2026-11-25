import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Banknote, CreditCard, QrCode } from 'lucide-react'
import { FORM_ERROR, errorMessage, fieldErrors } from '../../api/errors'
import type { Order, PaymentMethod } from '../../api/types'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { formatCents, formatMoney, fromCents, parseMoneyInput, toCents, toMoneyInput } from '../../lib/money'
import { useOrder } from '../orders/api'
import { METHOD_LABELS, useRegisterPayment } from './api'

const METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  pix: <QrCode size={20} aria-hidden />,
  cash: <Banknote size={20} aria-hidden />,
  card: <CreditCard size={20} aria-hidden />,
}

/**
 * Recebimento de um pedido (ADR-0009): uma ou mais formas de pagamento até
 * quitar o saldo. Dinheiro aceita o valor entregue para calcular o troco.
 */
export function PaymentDialog({ order: initialOrder, onClose }: { order: Order; onClose: () => void }) {
  const { data: order = initialOrder } = useOrder(initialOrder.id)
  const register = useRegisterPayment(order.id)
  const { showToast } = useToast()
  const formId = useId()
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [amount, setAmount] = useState(toMoneyInput(order.amount_due))
  const [received, setReceived] = useState('')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const dueCents = toCents(order.amount_due)
  const parsedAmount = parseMoneyInput(amount)
  const parsedReceived = parseMoneyInput(received)
  const changeCents =
    method === 'cash' && parsedAmount !== null && parsedReceived !== null
      ? toCents(parsedReceived) - toCents(parsedAmount)
      : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problems: Record<string, string> = {}
    if (parsedAmount === null || toCents(parsedAmount) === 0) problems.amount = 'Informe um valor maior que zero.'
    else if (toCents(parsedAmount) > dueCents) problems.amount = `O saldo do pedido é ${formatMoney(order.amount_due)}.`
    if (method === 'cash' && received.trim()) {
      if (parsedReceived === null) problems.received_amount = 'Informe um valor válido, por exemplo 50,00.'
      else if (changeCents !== null && changeCents < 0) problems.received_amount = 'O valor recebido é menor que o valor pago.'
    }
    setLocalErrors(problems)
    if (Object.keys(problems).length > 0 || parsedAmount === null) return

    const receivedAmount = method === 'cash' && parsedReceived !== null ? parsedReceived : null
    register.mutate(
      { method, amount: parsedAmount, received_amount: receivedAmount },
      {
        onSuccess: (payment) => {
          const remaining = dueCents - toCents(payment.amount)
          const change = payment.change && toCents(payment.change) > 0 ? ` Troco: ${formatMoney(payment.change)}.` : ''
          if (remaining <= 0) {
            showToast({ tone: 'success', message: `Pedido #${order.number} pago.${change}` })
            onClose()
            return
          }
          showToast({ tone: 'success', message: `${METHOD_LABELS[payment.method]} registrado.${change} Falta ${formatCents(remaining)}.` })
          setAmount(toMoneyInput(fromCents(remaining)))
          setReceived('')
        },
      },
    )
  }

  const apiErrors = fieldErrors(register.error)
  const errors = { ...apiErrors, ...localErrors }
  const generalError =
    register.error && Object.keys(apiErrors).length === 0 ? errorMessage(register.error) : apiErrors[FORM_ERROR]

  return (
    <Dialog
      open
      title={`Receber pedido #${order.number}`}
      description={order.customer_name ? `Cliente: ${order.customer_name}` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Receber depois
          </Button>
          <Button type="submit" form={formId} variant="accent" size="lg" loading={register.isPending} loadingText="Registrando…">
            Confirmar pagamento
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 rounded-md bg-bg px-4 py-3">
          <div>
            <p className="text-muted">{order.payment_status === 'partial' ? 'Falta receber' : 'Total do pedido'}</p>
            <p className="text-[1.75rem] leading-tight font-bold tabular-nums">{formatMoney(order.amount_due)}</p>
          </div>
          {order.payment_status === 'partial' ? <Badge tone="attention">Pago {formatMoney(order.paid_amount)}</Badge> : null}
        </div>

        {generalError ? <Alert>{generalError}</Alert> : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Forma de pagamento</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((option) => (
              <label
                key={option}
                className={[
                  'flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border font-medium',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                  method === option ? 'border-2 border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="method"
                  value={option}
                  checked={method === option}
                  onChange={() => setMethod(option)}
                  className="sr-only"
                />
                {METHOD_ICONS[option]}
                {METHOD_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          label="Valor deste pagamento"
          money
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          hint="Para dividir entre formas de pagamento, diminua o valor."
        />

        {method === 'cash' ? (
          <>
            <TextField
              label="Valor recebido (opcional)"
              money
              placeholder="0,00"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              error={errors.received_amount}
              hint="Quanto o cliente entregou, para calcular o troco."
              autoFocus
            />
            <div aria-live="polite" className="flex min-h-12 items-center justify-between gap-4 rounded-md bg-success-bg px-4 empty:hidden">
              {changeCents !== null && changeCents >= 0 ? (
                <>
                  <span className="font-medium text-success-text">Troco</span>
                  <span className="text-[1.75rem] leading-tight font-bold text-success-text tabular-nums">
                    {formatCents(changeCents)}
                  </span>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </form>
    </Dialog>
  )
}
