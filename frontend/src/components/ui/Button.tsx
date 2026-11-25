import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

/** DESIGN.md, seção 5 "Botão". */
/** `quiet-danger`: secundário com texto vermelho, para abrir uma confirmação destrutiva. */
type ButtonVariant = 'accent' | 'primary' | 'secondary' | 'quiet-danger' | 'danger'
type ButtonSize = 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  /** `lg` (56px) só para a ação principal da tela. */
  size?: ButtonSize
  icon?: ReactNode
  /** Bloqueia novos toques enquanto a API responde, evitando pedidos duplicados. */
  loading?: boolean
  /** Texto no gerúndio durante o carregamento ("Finalizando…"). */
  loadingText?: string
}

const variants: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-brand active:bg-accent-pressed',
  primary: 'bg-primary text-on-primary active:bg-primary-pressed',
  secondary: 'border border-border-strong bg-surface text-text active:bg-bg',
  'quiet-danger': 'border border-border-strong bg-surface text-danger active:bg-danger-bg',
  danger: 'bg-danger text-on-danger active:brightness-95',
}

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-12',
  lg: 'min-h-14',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  loadingText,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const inactive = disabled || loading
  return (
    <button
      {...props}
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={[
        'inline-flex min-w-12 items-center justify-center gap-2 rounded-md px-4',
        'font-medium transition-[transform,background-color] duration-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'active:scale-[0.98] motion-reduce:active:scale-100',
        'disabled:active:scale-100',
        loading
          ? `${variants[variant]} cursor-progress`
          : disabled
            ? 'bg-neutral-bg text-muted'
            : variants[variant],
        sizes[size],
        className,
      ].join(' ')}
    >
      {loading ? <Spinner /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}
