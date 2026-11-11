
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-success text-white hover:brightness-110',
    secondary:
      'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:opacity-80',
  }

  return (
    <button
      {...props}
      className={[
        'inline-flex min-h-11 items-center justify-center',
        'rounded-xl px-4 py-2 font-semibold',
        'transition focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-accent',
        'disabled:opacity-50',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
