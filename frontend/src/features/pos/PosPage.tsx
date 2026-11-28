import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Check, Package, ShoppingBag } from 'lucide-react'
import { errorMessage } from '../../api/errors'
import type { Order, Product } from '../../api/types'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, EmptyState, LoadError } from '../../components/ui/QueryState'
import { useToast } from '../../components/ui/useToast'
import { formatCents } from '../../lib/money'
import { useCurrentCash } from '../cash/api'
import { useCategories, useProducts } from '../catalog/api'
import { useCreateOrder } from '../orders/api'
import { PaymentDialog } from '../payments/PaymentDialog'
import { cartItemCount, cartTotalCents, quantityLimit, useCart } from './cart'
import type { CartLine } from './cart'
import { CartContents, CartTotal } from './CartPanel'
import { ProductGrid } from './ProductGrid'

const ALL = 'all'
const STOCK_REFRESH_MS = 30_000

export function PosPage() {
  const { user } = useSession()
  const cash = useCurrentCash()
  // Outro aparelho pode vender o último item: o saldo é atualizado de tempos em tempos.
  const products = useProducts({ refetchInterval: STOCK_REFRESH_MS })
  const categories = useCategories()
  const { cart, dispatch } = useCart()
  const { showToast } = useToast()
  const createOrder = useCreateOrder()
  const [category, setCategory] = useState(ALL)
  const [cartOpen, setCartOpen] = useState(false)
  const [paying, setPaying] = useState<Order | null>(null)

  const available = useMemo(() => (products.data ?? []).filter((product) => product.active), [products.data])
  const tabs = useMemo(() => {
    const used = new Set(available.map((product) => product.category_id))
    return (categories.data ?? []).filter((item) => item.active && used.has(item.id))
  }, [available, categories.data])
  const visible = category === ALL ? available : available.filter((product) => product.category_id === category)
  const quantities = useMemo(() => new Map(cart.lines.map((line) => [line.productId, line.quantity])), [cart.lines])
  const limits = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, quantityLimit(product)])),
    [products.data],
  )

  const cashOpen = Boolean(cash.data)
  const count = cartItemCount(cart)
  const empty = cart.lines.length === 0

  function add(product: Product) {
    dispatch({ type: 'add', productId: product.id, name: product.name, unitPrice: product.price, max: quantityLimit(product) })
  }

  function remove(line: CartLine) {
    const index = cart.lines.findIndex((item) => item.productId === line.productId)
    dispatch({ type: 'remove', productId: line.productId })
    showToast({
      tone: 'info',
      message: 'Item removido.',
      action: { label: 'Desfazer', onClick: () => dispatch({ type: 'restore', line, index }) },
    })
  }

  function finish() {
    createOrder.mutate(
      {
        customer_name: cart.customerName.trim() || null,
        items: cart.lines.map((line) => ({
          product_id: line.productId,
          quantity: line.quantity,
          notes: line.notes.trim() || null,
        })),
      },
      {
        onSuccess: (order) => {
          dispatch({ type: 'clear' })
          setCartOpen(false)
          showToast({ tone: 'success', message: `Pedido #${order.number} criado.` })
          setPaying(order)
        },
        // A comanda continua na tela; a mensagem explica o que fazer.
        onError: (error) => showToast({ tone: 'error', message: errorMessage(error) }),
      },
    )
  }

  const finishButton = (
    <Button
      variant="accent"
      size="lg"
      className="w-full"
      icon={<Check size={20} aria-hidden />}
      disabled={empty || !cashOpen}
      loading={createOrder.isPending}
      loadingText="Finalizando…"
      onClick={finish}
    >
      Finalizar pedido
    </Button>
  )

  const loading = products.isPending || categories.isPending || cash.isPending
  const error = products.error ?? categories.error ?? cash.error

  return (
    <section className="flex flex-col gap-6 pb-20 md:pb-0 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <PageHeader title="Vender" />
        {error ? (
          <LoadError
            error={error}
            onRetry={() => {
              void products.refetch()
              void categories.refetch()
              void cash.refetch()
            }}
          />
        ) : loading ? (
          <DelayedSpinner label="Carregando produtos" />
        ) : (
          <>
            {!cashOpen ? (
              <Alert tone="info">
                O caixa está fechado.{' '}
                {user.role === 'owner' ? (
                  <Link to="/caixa" className="font-semibold underline underline-offset-4">
                    Abrir o caixa
                  </Link>
                ) : (
                  'Peça ao dono para abrir o caixa.'
                )}
              </Alert>
            ) : null}
            {tabs.length > 0 ? (
              <div role="group" aria-label="Categorias" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
                {[{ id: ALL, name: 'Todos' }, ...tabs].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={category === tab.id}
                    onClick={() => setCategory(tab.id)}
                    className={[
                      'min-h-12 shrink-0 rounded-md border px-4 font-medium whitespace-nowrap',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                      category === tab.id ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
                    ].join(' ')}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            ) : null}
            {available.length === 0 ? (
              <EmptyState icon={<Package size={28} aria-hidden />} title="Nenhum produto disponível">
                {user.role === 'owner' ? (
                  <Link to="/produtos" className="font-semibold text-text underline underline-offset-4">
                    Cadastrar produtos
                  </Link>
                ) : (
                  'Peça ao dono para cadastrar os produtos.'
                )}
              </EmptyState>
            ) : (
              <ProductGrid products={visible} quantities={quantities} disabled={!cashOpen} onAdd={add} />
            )}
          </>
        )}
      </div>

      {/* Tablet e desktop: comanda fixa ao lado. */}
      <aside aria-label="Comanda" className="hidden flex-col gap-4 rounded-md border border-hairline bg-surface p-4 md:sticky md:top-6 md:flex md:max-h-[calc(100dvh-3rem)]">
        <h2 className="text-lg font-semibold">
          Comanda{count > 0 ? <span className="font-normal text-muted"> · {count} {count === 1 ? 'item' : 'itens'}</span> : null}
        </h2>
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          <CartContents cart={cart} dispatch={dispatch} onRemove={remove} limits={limits} />
        </div>
        <CartTotal cart={cart} />
        {finishButton}
      </aside>

      {/* Celular: barra fixa acima da navegação, que abre a comanda. */}
      {!empty ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex min-h-14 items-center justify-between gap-3 rounded-md border border-float-border bg-primary px-4 text-on-primary shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
        >
          <span className="flex items-center gap-2 font-medium">
            <ShoppingBag size={20} aria-hidden />
            Ver comanda · {count} {count === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-lg font-bold tabular-nums">{formatCents(cartTotalCents(cart))}</span>
        </button>
      ) : null}
      <Dialog
        open={cartOpen}
        title="Comanda"
        onClose={() => setCartOpen(false)}
        footer={
          <div className="flex w-full flex-col gap-3">
            <CartTotal cart={cart} />
            {finishButton}
          </div>
        }
      >
        <CartContents cart={cart} dispatch={dispatch} onRemove={remove} limits={limits} />
      </Dialog>

      {paying ? <PaymentDialog order={paying} onClose={() => setPaying(null)} /> : null}
    </section>
  )
}
