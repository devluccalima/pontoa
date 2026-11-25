import type { ReactNode } from 'react'
import { CircleAlert, Info } from 'lucide-react'

/** Mensagem dentro da página, para erros que não pertencem a um campo. */
export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'info'; children: ReactNode }) {
  const danger = tone === 'danger'
  return (
    <div
      role={danger ? 'alert' : 'status'}
      className={[
        'flex items-start gap-2 rounded-md px-4 py-3 text-base',
        danger ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-text',
      ].join(' ')}
    >
      {danger ? (
        <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
      ) : (
        <Info size={20} className="mt-0.5 shrink-0" aria-hidden />
      )}
      <div>{children}</div>
    </div>
  )
}
