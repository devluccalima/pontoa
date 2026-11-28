import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, fieldErrors } from '../../api/errors'
import type { Product, StockMovement } from '../../api/types'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { DelayedSpinner, LoadError } from '../../components/ui/QueryState'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { formatDateTime } from '../../lib/datetime'
import { useDisableStock, useSetStock, useStockMovements } from './api'
import { MOVEMENT_LABELS, signedChange, unitsText } from './stockText'

const MAX_STOCK = 100_000

export function StockDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const tracked = product.stock_quantity !== null
  const setStock = useSetStock()
  const disableStock = useDisableStock()
  const { showToast } = useToast()
  const formId = useId()
  const [quantity, setQuantity] = useState(tracked ? String(product.stock_quantity) : '')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string>()
  const [confirmingOff, setConfirmingOff] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseQuantity(quantity)
    if (parsed === null) {
      setLocalError(`Informe um número inteiro de 0 a ${MAX_STOCK.toLocaleString('pt-BR')}.`)
      return
    }
    setLocalError(undefined)
    setStock.mutate(
      { productId: product.id, data: { quantity: parsed, reason: reason.trim() || null } },
      {
        onSuccess: (saved) => {
          showToast({ tone: 'success', message: `Estoque de ${saved.name}: ${unitsText(saved.stock_quantity ?? 0)}.` })
          onClose()
        },
      },
    )
  }

  function turnOff() {
    disableStock.mutate(
      { productId: product.id },
      {
        onSuccess: (saved) => {
          showToast({ tone: 'success', message: `${saved.name} volta a ser vendido sem limite.` })
          onClose()
        },
      },
    )
  }

  const apiErrors = fieldErrors(setStock.error)
  const error = localError ?? apiErrors.quantity
  const mutationError = setStock.error && !apiErrors.quantity ? setStock.error : disableStock.error

  return (
    <Dialog
      open
      title={product.name}
      description={
        tracked
          ? `Em estoque agora: ${unitsText(product.stock_quantity ?? 0)}.`
          : 'Informe quantas unidades há. A partir daí, cada venda baixa o estoque e, sem saldo, o produto fica esgotado.'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={setStock.isPending} loadingText="Salvando…">
            {tracked ? 'Salvar estoque' : 'Controlar estoque'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {mutationError ? <Alert>{errorMessage(mutationError)}</Alert> : null}
          <TextField
            label="Quantidade em estoque"
            inputMode="numeric"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={error}
            hint="O total que há agora, depois de contar ou produzir."
            autoFocus
          />
          <TextField
            label="Motivo (opcional)"
            placeholder="Ex.: produção do dia"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />
        </form>

        {tracked ? (
          <div className="flex flex-col gap-3 border-t border-hairline pt-4">
            {confirmingOff ? (
              <>
                <p>
                  Sem controle, <strong>{product.name}</strong> é vendido sem limite e o saldo deixa de ser
                  acompanhado. O histórico continua guardado.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="danger" loading={disableStock.isPending} loadingText="Desligando…" onClick={turnOff}>
                    Desligar controle
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmingOff(false)}>
                    Manter controle
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="secondary" className="self-start" onClick={() => setConfirmingOff(true)}>
                Desligar controle de estoque
              </Button>
            )}
          </div>
        ) : null}

        <History productId={product.id} />
      </div>
    </Dialog>
  )
}

function History({ productId }: { productId: string }) {
  const { business } = useSession()
  const movements = useStockMovements(productId, true)

  if (movements.isPending) return <DelayedSpinner />
  if (movements.error) return <LoadError error={movements.error} onRetry={() => void movements.refetch()} />
  if (movements.data.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">Últimas movimentações</h3>
      <ul className="divide-y divide-hairline rounded-md border border-hairline">
        {movements.data.map((movement) => (
          <MovementRow key={movement.id} movement={movement} timeZone={business.timezone} />
        ))}
      </ul>
    </div>
  )
}

function MovementRow({ movement, timeZone }: { movement: StockMovement; timeZone: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="font-medium">{MOVEMENT_LABELS[movement.kind]}</p>
        <p className="truncate text-sm text-muted">
          {formatDateTime(movement.created_at, timeZone)}
          {movement.reason ? ` · ${movement.reason}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className="font-semibold">{signedChange(movement.quantity_change)}</p>
        <p className="text-sm text-muted">{movement.balance === null ? 'sem controle' : `saldo ${movement.balance}`}</p>
      </div>
    </li>
  )
}

function parseQuantity(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  return parsed <= MAX_STOCK ? parsed : null
}
