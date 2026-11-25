import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { errorMessage } from '../../api/errors'
import { Alert } from './Alert'
import { Button } from './Button'
import { Spinner } from './Spinner'

/** Indicador de carregamento que só aparece depois de 300ms, para não piscar. */
export function DelayedSpinner({ label = 'Carregando' }: { label?: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 300)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className="flex min-h-32 items-center justify-center text-muted">
      {visible ? <Spinner size={28} label={label} /> : null}
    </div>
  )
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert>{errorMessage(error)}</Alert>
      <Button variant="secondary" icon={<RefreshCw size={20} aria-hidden />} onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-strong px-6 py-10 text-center">
      <span className="text-muted">{icon}</span>
      <p className="text-lg font-semibold">{title}</p>
      {children ? <div className="text-muted">{children}</div> : null}
    </div>
  )
}
