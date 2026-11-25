import type { ReactNode } from 'react'
import { Check, Clock, X } from 'lucide-react'

/** DESIGN.md, seção 5 "Badge". Estado nunca depende só da cor: sempre há texto. */
type BadgeTone = 'success' | 'attention' | 'danger' | 'neutral'

const tones: Record<BadgeTone, { className: string; icon: ReactNode }> = {
  success: { className: 'bg-success-bg text-success-text', icon: <Check size={14} aria-hidden /> },
  attention: { className: 'bg-accent-bg text-accent-text', icon: <Clock size={14} aria-hidden /> },
  danger: { className: 'bg-danger-bg text-danger', icon: <X size={14} aria-hidden /> },
  neutral: { className: 'bg-neutral-bg text-text', icon: null },
}

export function Badge({ tone = 'neutral', icon, children }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode }) {
  const style = tones[tone]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm leading-none font-medium whitespace-nowrap ${style.className}`}
    >
      {icon ?? style.icon}
      {children}
    </span>
  )
}
