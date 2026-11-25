import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { CircleAlert } from 'lucide-react'

/** DESIGN.md, seção 5 "Campo de formulário". */
type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  error?: string
  hint?: string
  /** Valores monetários: alinhados à direita e teclado numérico no celular. */
  money?: boolean
}

export function TextField({ label, error, hint, money = false, className = '', ...props }: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        inputMode={money ? 'decimal' : props.inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
        className={[
          'min-h-12 rounded-sm bg-surface px-3 text-base text-text',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          error ? 'border-2 border-danger' : 'border border-border-strong',
          money ? 'text-right tabular-nums' : '',
        ].join(' ')}
      />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-sm text-danger">
          <CircleAlert size={14} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  )
}
