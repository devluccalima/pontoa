import { Store } from 'lucide-react'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-2xl font-bold ${className}`}>
      <Store className="text-accent" size={24} aria-hidden />
      <span>
        Pontoa<span className="text-accent">.</span>
      </span>
    </span>
  )
}
