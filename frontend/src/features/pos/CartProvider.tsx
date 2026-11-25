import { useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { readDraft, writeDraft } from '../../lib/sessionDraft'
import { CartContext, EMPTY_CART, cartReducer } from './cart'
import type { Cart } from './cart'

/**
 * A comanda fica acima das rotas: trocar de tela ou recarregar não perde o que
 * a atendente montou (DESIGN.md: "uma falha nunca descarta o que a atendente já montou").
 */
export function CartProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const key = `cart.${userId}`
  const [cart, dispatch] = useReducer(cartReducer, undefined, () => readDraft<Cart>(key) ?? EMPTY_CART)

  useEffect(() => writeDraft(key, cart), [key, cart])

  const value = useMemo(() => ({ cart, dispatch }), [cart])
  return <CartContext value={value}>{children}</CartContext>
}
