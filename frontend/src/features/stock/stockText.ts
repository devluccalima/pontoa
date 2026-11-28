import type { StockMovementKind } from '../../api/types'

/** Abaixo disso, o saldo aparece em destaque na tela de estoque. */
export const LOW_STOCK = 5

export function isLowStock(quantity: number): boolean {
  return quantity > 0 && quantity <= LOW_STOCK
}

export function unitsText(quantity: number): string {
  return quantity === 1 ? '1 unidade' : `${quantity} unidades`
}

export const MOVEMENT_LABELS: Record<StockMovementKind, string> = {
  adjustment: 'Ajuste',
  sale: 'Venda',
  cancellation: 'Cancelamento',
  tracking_off: 'Controle desligado',
}

export function signedChange(change: number): string {
  if (change > 0) return `+${change}`
  if (change < 0) return `−${Math.abs(change)}`
  return '0'
}
