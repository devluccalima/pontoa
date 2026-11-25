import {
  ChartNoAxesCombined,
  ClipboardList,
  Package,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '../api/types'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  ownerOnly?: boolean
}

/** Ordem de importância: no celular, os quatro primeiros ficam na barra inferior. */
export const NAVIGATION: NavItem[] = [
  { label: 'Vender', path: '/pdv', icon: ShoppingCart },
  { label: 'Pedidos', path: '/pedidos', icon: ClipboardList },
  { label: 'Caixa', path: '/caixa', icon: Wallet },
  { label: 'Painel', path: '/painel', icon: ChartNoAxesCombined, ownerOnly: true },
  { label: 'Produtos', path: '/produtos', icon: Package, ownerOnly: true },
  { label: 'Equipe', path: '/equipe', icon: Users, ownerOnly: true },
]

export const MOBILE_BAR_SIZE = 4

export function navigationFor(role: UserRole): NavItem[] {
  return NAVIGATION.filter((item) => !item.ownerOnly || role === 'owner')
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Dono',
  operator: 'Operador',
}
