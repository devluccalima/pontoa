import type { OrderStatus, PaymentStatus } from '../../api/types'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Novo',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

/** Próximo passo do preparo e o texto do botão que o executa. */
export const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: 'preparing', label: 'Começar preparo' },
  preparing: { status: 'ready', label: 'Marcar como pronto' },
  ready: { status: 'delivered', label: 'Entregar' },
}

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: 'Pago',
  partial: 'Pago em parte',
  unpaid: 'A receber',
}

export const IN_PROGRESS: OrderStatus[] = ['new', 'preparing', 'ready']

/** "agora", "há 5 min", "há 1 h 20 min": tempo de espera do cliente. */
export function elapsedLabel(createdAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `há ${hours} h ${rest} min` : `há ${hours} h`
}
