import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { ToastContext } from './useToast'
import type { ToastInput } from './useToast'

/**
 * DESIGN.md, "Toasts": um por vez; sucesso some em 3s (5s se tiver "Desfazer");
 * erro fica até ser fechado e é anunciado com `role="alert"`.
 */
const SUCCESS_MS = 3000
const ACTION_MS = 5000

type Toast = ToastInput & { id: number }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((input: ToastInput) => setToast({ ...input, id: Date.now() }), [])
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast || toast.tone === 'error') return
    const timer = window.setTimeout(() => setToast(null), toast.action ? ACTION_MS : SUCCESS_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext value={value}>
      {children}
      {/* Regiões sempre presentes, para leitores de tela anunciarem a mudança. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:inset-x-auto md:right-6 md:bottom-6 md:justify-end">
        <div aria-live="polite" className="contents">
          {toast && toast.tone !== 'error' ? <ToastView toast={toast} onClose={dismissToast} /> : null}
        </div>
        <div role="alert" className="contents">
          {toast && toast.tone === 'error' ? <ToastView toast={toast} onClose={dismissToast} /> : null}
        </div>
      </div>
    </ToastContext>
  )
}

const icons = {
  success: <CircleCheck size={20} className="shrink-0 text-success-text" aria-hidden />,
  error: <CircleAlert size={20} className="shrink-0 text-danger" aria-hidden />,
  info: <Info size={20} className="shrink-0 text-muted" aria-hidden />,
}

function ToastView({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div
      key={toast.id}
      className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md border border-float-border bg-surface py-2 pr-2 pl-4 text-text shadow-float motion-safe:animate-[toast-in_200ms_ease-out]"
    >
      {icons[toast.tone]}
      <p className="flex-1 py-2">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onClose()
          }}
          className="min-h-12 rounded-sm px-3 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <X size={20} aria-hidden />
      </button>
    </div>
  )
}
