import { createContext, useContext } from 'react'
import { toCents } from '../../lib/money'

export const MAX_QUANTITY = 99
export const MAX_LINES = 50

export type CartLine = {
  productId: string
  name: string
  /** Preço do catálogo, só para exibir; o valor oficial é o que a API congela no pedido. */
  unitPrice: string
  quantity: number
  notes: string
}

export type Cart = {
  lines: CartLine[]
  customerName: string
}

export const EMPTY_CART: Cart = { lines: [], customerName: '' }

export type CartAction =
  /** `max`: limite de unidades, por exemplo o saldo em estoque. */
  | { type: 'add'; productId: string; name: string; unitPrice: string; max?: number }
  | { type: 'setQuantity'; productId: string; quantity: number; max?: number }
  | { type: 'remove'; productId: string }
  | { type: 'restore'; line: CartLine; index: number }
  | { type: 'setNotes'; productId: string; notes: string }
  | { type: 'setCustomer'; customerName: string }
  | { type: 'clear' }

export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'add': {
      const max = limit(action.max)
      const existing = cart.lines.find((line) => line.productId === action.productId)
      if (existing) {
        if (existing.quantity >= max) return cart
        return updateLine(cart, action.productId, (line) => ({ ...line, quantity: line.quantity + 1 }))
      }
      if (cart.lines.length >= MAX_LINES || max < 1) return cart
      const line = { productId: action.productId, name: action.name, unitPrice: action.unitPrice, quantity: 1, notes: '' }
      return { ...cart, lines: [...cart.lines, line] }
    }
    case 'setQuantity':
      if (action.quantity < 1) return cartReducer(cart, { type: 'remove', productId: action.productId })
      return updateLine(cart, action.productId, (line) => ({
        ...line,
        // Diminuir sempre é permitido, mesmo acima de um limite que caiu.
        quantity: action.quantity > line.quantity ? Math.min(action.quantity, limit(action.max)) : action.quantity,
      }))
    case 'remove':
      return { ...cart, lines: cart.lines.filter((line) => line.productId !== action.productId) }
    case 'restore': {
      if (cart.lines.some((line) => line.productId === action.line.productId)) return cart
      const lines = [...cart.lines]
      lines.splice(Math.min(action.index, lines.length), 0, action.line)
      return { ...cart, lines }
    }
    case 'setNotes':
      return updateLine(cart, action.productId, (line) => ({ ...line, notes: action.notes }))
    case 'setCustomer':
      return { ...cart, customerName: action.customerName }
    case 'clear':
      return EMPTY_CART
  }
}

function limit(max: number | undefined): number {
  return Math.min(max ?? MAX_QUANTITY, MAX_QUANTITY)
}

/** Quantas unidades do produto cabem na comanda: o saldo, se o estoque é controlado. */
export function quantityLimit(product: { stock_quantity: number | null }): number {
  return limit(product.stock_quantity ?? undefined)
}

function updateLine(cart: Cart, productId: string, update: (line: CartLine) => CartLine): Cart {
  return { ...cart, lines: cart.lines.map((line) => (line.productId === productId ? update(line) : line)) }
}

export function cartTotalCents(cart: Cart): number {
  return cart.lines.reduce((total, line) => total + toCents(line.unitPrice) * line.quantity, 0)
}

export function cartItemCount(cart: Cart): number {
  return cart.lines.reduce((count, line) => count + line.quantity, 0)
}

export type CartContextValue = { cart: Cart; dispatch: (action: CartAction) => void }

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart precisa estar dentro de CartProvider')
  return context
}
