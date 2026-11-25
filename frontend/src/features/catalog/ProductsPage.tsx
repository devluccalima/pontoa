import { useMemo, useState } from 'react'
import { ChevronRight, Package, Plus, Tags } from 'lucide-react'
import type { Category, Product } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, EmptyState, LoadError } from '../../components/ui/QueryState'
import { formatMoney } from '../../lib/money'
import { useCategories, useProducts } from './api'
import { CategoriesDialog } from './CategoriesDialog'
import { ProductFormDialog } from './ProductFormDialog'

const ALL = 'all'
const UNCATEGORIZED = 'none'

type Editing = { product?: Product } | null

export function ProductsPage() {
  const categories = useCategories()
  const products = useProducts()
  const [filter, setFilter] = useState<string>(ALL)
  const [editing, setEditing] = useState<Editing>(null)
  const [managingCategories, setManagingCategories] = useState(false)

  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data],
  )
  const visible = useMemo(() => {
    const all = products.data ?? []
    if (filter === ALL) return all
    if (filter === UNCATEGORIZED) return all.filter((product) => !product.category_id)
    return all.filter((product) => product.category_id === filter)
  }, [products.data, filter])

  const loading = categories.isPending || products.isPending
  const error = categories.error ?? products.error

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Produtos"
        description="O que aparece na tela de vendas."
        actions={
          <>
            <Button variant="secondary" icon={<Tags size={20} aria-hidden />} onClick={() => setManagingCategories(true)}>
              Categorias
            </Button>
            <Button variant="accent" icon={<Plus size={20} aria-hidden />} onClick={() => setEditing({})}>
              Novo produto
            </Button>
          </>
        }
      />

      {error ? (
        <LoadError
          error={error}
          onRetry={() => {
            void categories.refetch()
            void products.refetch()
          }}
        />
      ) : loading ? (
        <DelayedSpinner label="Carregando produtos" />
      ) : (
        <div className="flex flex-col gap-4">
          <CategoryFilter categories={categories.data ?? []} value={filter} onChange={setFilter} />
          {products.data?.length === 0 ? (
            <EmptyState icon={<Package size={28} aria-hidden />} title="Nenhum produto cadastrado">
              Cadastre o primeiro produto para começar a vender.
            </EmptyState>
          ) : visible.length === 0 ? (
            <EmptyState icon={<Package size={28} aria-hidden />} title="Nenhum produto nesta categoria" />
          ) : (
            <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
              {visible.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  category={product.category_id ? categoryById.get(product.category_id) : undefined}
                  onSelect={() => setEditing({ product })}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {editing ? (
        <ProductFormDialog
          product={editing.product}
          categories={categories.data ?? []}
          defaultCategoryId={filter !== ALL && filter !== UNCATEGORIZED ? filter : null}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {managingCategories ? (
        <CategoriesDialog categories={categories.data ?? []} onClose={() => setManagingCategories(false)} />
      ) : null}
    </section>
  )
}

function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (value: string) => void
}) {
  const options = [
    { id: ALL, label: 'Todos' },
    ...categories.map((category) => ({ id: category.id, label: category.name })),
    { id: UNCATEGORIZED, label: 'Sem categoria' },
  ]
  return (
    <div role="group" aria-label="Filtrar por categoria" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {options.map((option) => {
        const selected = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={[
              'min-h-12 shrink-0 rounded-md border px-4 font-medium whitespace-nowrap',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              selected ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-text',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function ProductRow({ product, category, onSelect }: { product: Product; category?: Category; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Editar ${product.name}`}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`font-medium ${product.active ? '' : 'text-muted'}`}>{product.name}</span>
            {product.active ? null : <Badge>Inativo</Badge>}
          </span>
          <span className="block truncate text-sm text-muted">
            {category?.name ?? 'Sem categoria'}
            {product.description ? ` · ${product.description}` : ''}
          </span>
        </span>
        <span className="text-right text-lg font-semibold tabular-nums">{formatMoney(product.price)}</span>
        <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  )
}
