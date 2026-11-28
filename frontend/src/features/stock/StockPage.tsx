import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Boxes, ChevronRight, TriangleAlert } from 'lucide-react'
import type { Product } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, EmptyState, LoadError } from '../../components/ui/QueryState'
import { useProducts } from '../catalog/api'
import { StockDialog } from './StockDialog'
import { isLowStock, unitsText } from './stockText'

/** Estoque por produto (ADR-0012): o dono informa o saldo; a venda baixa e o cancelamento devolve. */
export function StockPage() {
  const products = useProducts()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { tracked, untracked } = useMemo(() => {
    const active = (products.data ?? []).filter((product) => product.active)
    return {
      tracked: active.filter((product) => product.stock_quantity !== null),
      untracked: active.filter((product) => product.stock_quantity === null),
    }
  }, [products.data])
  // Busca na lista atual: o diálogo acompanha o saldo depois de salvar.
  const selected = products.data?.find((product) => product.id === selectedId)

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Estoque" description="Quantas unidades há de cada produto. Sem saldo, o produto não pode ser vendido." />

      {products.error ? (
        <LoadError error={products.error} onRetry={() => void products.refetch()} />
      ) : products.isPending ? (
        <DelayedSpinner label="Carregando o estoque" />
      ) : tracked.length + untracked.length === 0 ? (
        <EmptyState icon={<Boxes size={28} aria-hidden />} title="Nenhum produto ativo">
          <Link to="/produtos" className="font-semibold text-text underline underline-offset-4">
            Cadastrar produtos
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Com estoque controlado</h2>
            {tracked.length === 0 ? (
              <p className="text-muted">Nenhum ainda. Escolha um produto abaixo para informar a quantidade.</p>
            ) : (
              <ProductList products={tracked} onSelect={setSelectedId} />
            )}
          </div>
          {untracked.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold">Sem controle</h2>
                <p className="text-sm text-muted">Vendidos sem limite, como um suco feito na hora.</p>
              </div>
              <ProductList products={untracked} onSelect={setSelectedId} />
            </div>
          ) : null}
        </>
      )}

      {selected ? <StockDialog product={selected} onClose={() => setSelectedId(null)} /> : null}
    </section>
  )
}

function ProductList({ products, onSelect }: { products: Product[]; onSelect: (id: string) => void }) {
  return (
    <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
      {products.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            onClick={() => onSelect(product.id)}
            aria-label={`Estoque de ${product.name}`}
            className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            <span className="min-w-0 flex-1 font-medium">{product.name}</span>
            <StockValue quantity={product.stock_quantity} />
            <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

function StockValue({ quantity }: { quantity: number | null }) {
  if (quantity === null) return <span className="text-muted">Controlar</span>
  if (quantity === 0) return <Badge tone="danger">Esgotado</Badge>
  if (isLowStock(quantity))
    return (
      <Badge tone="attention" icon={<TriangleAlert size={14} aria-hidden />}>
        {unitsText(quantity)}
      </Badge>
    )
  return <span className="text-lg font-semibold tabular-nums">{unitsText(quantity)}</span>
}
