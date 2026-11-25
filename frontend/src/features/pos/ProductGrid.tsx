import type { Product } from '../../api/types'
import { formatMoney } from '../../lib/money'

/** DESIGN.md, "Cartão de produto": o cartão inteiro é a área de toque; um toque adiciona uma unidade. */
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
        return (
          <li key={product.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAdd(product)}
              aria-label={`${product.name}, ${formatMoney(product.price)}${selected ? `, ${quantity} na comanda` : ''}`}
              className={[
                'relative flex min-h-[84px] w-full flex-col justify-between gap-2 rounded-md bg-surface p-3 text-left',
                'transition-transform duration-100 active:scale-[0.98] motion-reduce:active:scale-100',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
                selected ? 'border-2 border-text' : 'border border-hairline',
              ].join(' ')}
            >
              <span className="line-clamp-2 pr-6 font-medium">{product.name}</span>
              <span className="text-xl leading-tight font-semibold tabular-nums">{formatMoney(product.price)}</span>
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
