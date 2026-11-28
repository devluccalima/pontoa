import type { Product } from '../../api/types'
import { formatMoney } from '../../lib/money'

/**
 * DESIGN.md, "Cartão de produto": o cartão inteiro é a área de toque; um toque adiciona uma unidade.
 * Com estoque controlado (ADR-0012), mostra quantas unidades ainda cabem e fica "Esgotado" sem saldo.
 */
export function ProductGrid({
  products,
  quantities,
  disabled,
  onAdd,
}: {
  products: Product[]
  quantities: Map<string, number>
  disabled: boolean
  onAdd: (product: Product) => void
}) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {products.map((product) => {
        const quantity = quantities.get(product.id) ?? 0
        const selected = quantity > 0
        const stock = product.stock_quantity
        const soldOut = stock !== null && stock <= 0
        // Unidades que ainda podem entrar na comanda.
        const remaining = stock === null ? null : Math.max(stock - quantity, 0)
        const allInCart = !soldOut && remaining === 0

        const labelParts = [product.name, formatMoney(product.price)]
        if (soldOut) labelParts.push('esgotado')
        else if (remaining !== null) labelParts.push(stockText(remaining, allInCart).toLowerCase())
        if (selected) labelParts.push(`${quantity} na comanda`)

        return (
          <li key={product.id} className="flex">
            <button
              type="button"
              disabled={disabled || soldOut || allInCart}
              onClick={() => onAdd(product)}
              aria-label={labelParts.join(', ')}
              className={[
                'relative flex min-h-[84px] w-full flex-1 flex-col justify-between gap-2 rounded-md border p-3 text-left',
                'transition-transform duration-100 active:scale-[0.98] motion-reduce:active:scale-100',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                'disabled:cursor-not-allowed disabled:active:scale-100',
                soldOut
                  ? 'border-dashed border-border-strong bg-bg'
                  : selected
                    ? 'border-text bg-surface ring-1 ring-text ring-inset'
                    : 'border-hairline bg-surface',
                disabled && !soldOut ? 'disabled:opacity-60' : '',
              ].join(' ')}
            >
              <span className={`line-clamp-2 pr-6 font-medium ${soldOut ? 'text-muted' : ''}`}>{product.name}</span>
              <span className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
                <span className={`text-xl leading-tight font-semibold tabular-nums ${soldOut ? 'text-muted' : ''}`}>
                  {formatMoney(product.price)}
                </span>
                {soldOut ? (
                  <span className="text-sm font-semibold text-text">Esgotado</span>
                ) : remaining !== null ? (
                  <span className={`text-sm tabular-nums ${allInCart ? 'font-medium text-text' : 'text-muted'}`}>
                    {stockText(remaining, allInCart)}
                  </span>
                ) : null}
              </span>
              {selected ? (
                <span
                  aria-hidden
                  className="absolute -top-2 -right-2 flex min-h-7 min-w-7 items-center justify-center rounded-full border-2 border-bg bg-accent px-1.5 text-sm font-bold text-brand tabular-nums"
                >
                  {quantity}
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function stockText(remaining: number, allInCart: boolean): string {
  if (allInCart) return 'Tudo na comanda'
  return remaining === 1 ? 'Resta 1' : `Restam ${remaining}`
}
