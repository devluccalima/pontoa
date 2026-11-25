import { useState } from 'react'
import { Minus, NotebookPen, Plus, Trash2 } from 'lucide-react'
import { TextField } from '../../components/ui/TextField'
import { formatCents, formatMoney, toCents } from '../../lib/money'
import { MAX_QUANTITY, cartTotalCents } from './cart'
import type { Cart, CartAction, CartLine } from './cart'

const stepButton = [
  'inline-flex size-12 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'disabled:opacity-50',
].join(' ')

/** Conteúdo da comanda: itens, nome do cliente e total. O botão de finalizar fica com quem usa. */
export function CartContents({
  cart,
  dispatch,
  onRemove,
}: {
  cart: Cart
  dispatch: (action: CartAction) => void
  onRemove: (line: CartLine) => void
}) {
  if (cart.lines.length === 0) {
    return <p className="py-6 text-center text-muted">Toque nos produtos para montar o pedido.</p>
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-hairline">
        {cart.lines.map((line) => (
          <CartLineRow key={line.productId} line={line} dispatch={dispatch} onRemove={() => onRemove(line)} />
        ))}
      </ul>
      <TextField
        label="Nome do cliente (opcional)"
        hint="Para chamar quando o pedido ficar pronto."
        value={cart.customerName}
        maxLength={60}
        autoComplete="off"
        onChange={(e) => dispatch({ type: 'setCustomer', customerName: e.target.value })}
      />
    </div>
  )
}

function CartLineRow({ line, dispatch, onRemove }: { line: CartLine; dispatch: (action: CartAction) => void; onRemove: () => void }) {
  const [editingNotes, setEditingNotes] = useState(Boolean(line.notes))
  const subtotal = toCents(line.unitPrice) * line.quantity
  return (
    <li className="flex flex-col gap-2 py-3">
      {/* Sempre empilhado: a comanda é estreita mesmo em telas largas. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="font-medium">{line.name}</p>
          <p className="text-sm text-muted tabular-nums">{formatMoney(line.unitPrice)} cada</p>
        </div>
        <p className="text-right font-semibold tabular-nums">{formatCents(subtotal)}</p>
        <div className="col-span-2 flex items-center gap-2">
          {line.quantity === 1 ? (
            <button type="button" onClick={onRemove} aria-label={`Remover ${line.name}`} className={`${stepButton} text-danger`}>
              <Trash2 size={20} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'setQuantity', productId: line.productId, quantity: line.quantity - 1 })}
              aria-label={`Diminuir ${line.name}`}
              className={stepButton}
            >
              <Minus size={20} aria-hidden />
            </button>
          )}
          <span className="min-w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite" aria-label={`${line.quantity} unidades`}>
            {line.quantity}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'setQuantity', productId: line.productId, quantity: line.quantity + 1 })}
            disabled={line.quantity >= MAX_QUANTITY}
            aria-label={`Aumentar ${line.name}`}
            className={stepButton}
          >
            <Plus size={20} aria-hidden />
          </button>
          {!editingNotes ? (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              aria-label={`Adicionar observação a ${line.name}`}
              className={`${stepButton} ml-auto border-transparent text-muted`}
            >
              <NotebookPen size={20} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      {editingNotes ? (
        <TextField
          label={`Observação: ${line.name}`}
          placeholder="Ex.: sem cebola"
          value={line.notes}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => dispatch({ type: 'setNotes', productId: line.productId, notes: e.target.value })}
        />
      ) : null}
    </li>
  )
}

export function CartTotal({ cart }: { cart: Cart }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <span className="text-muted">Total</span>
      <span className="text-[1.75rem] leading-tight font-bold tabular-nums">{formatCents(cartTotalCents(cart))}</span>
    </div>
  )
}
