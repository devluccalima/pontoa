import { createContext, useContext } from 'react'

export type ToastInput = {
  tone: 'success' | 'error' | 'info'
  message: string
  action?: { label: string; onClick: () => void }
}

export type ToastContextValue = {
  showToast: (toast: ToastInput) => void
  dismissToast: () => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider')
  return context
}
