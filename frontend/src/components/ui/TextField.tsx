import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { controlBorder, describedBy } from './fieldHelpers'
import { FieldShell } from './fields'

/** DESIGN.md, seção 5 "Campo de formulário". */
type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  error?: string
  hint?: string
  /** Valores monetários: alinhados à direita e teclado numérico no celular. */
  money?: boolean
}

export function TextField({ label, error, hint, money = false, className, ...props }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <input
        id={id}
        inputMode={money ? 'decimal' : props.inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
        className={[
          'min-h-12 rounded-sm bg-surface px-3 text-base text-text',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          controlBorder(error),
          money ? 'text-right tabular-nums' : '',
        ].join(' ')}
      />
    </FieldShell>
  )
}
