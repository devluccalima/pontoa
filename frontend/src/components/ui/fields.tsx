import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { CircleAlert } from 'lucide-react'
import { controlBorder, describedBy } from './fieldHelpers'

const control = [
  'rounded-sm bg-surface px-3 text-base text-text',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
].join(' ')

export function FieldShell({
  id,
  label,
  error,
  hint,
  children,
  className = '',
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-sm text-danger">
          <CircleAlert size={14} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  )
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string
  error?: string
  hint?: string
}

export function SelectField({ label, error, hint, className, children, ...props }: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
        className={`min-h-12 ${control} ${controlBorder(error)}`}
      >
        {children}
      </select>
    </FieldShell>
  )
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  error?: string
  hint?: string
}

export function TextAreaField({ label, error, hint, className, ...props }: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
        className={`min-h-24 py-3 ${control} ${controlBorder(error)}`}
      />
    </FieldShell>
  )
}

/** Liga/desliga com rótulo visível; alvo de toque de 48px na linha inteira. */
export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-medium">{label}</span>
        {description ? <span className="block text-sm text-muted">{description}</span> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={[
          'relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-border-strong transition-colors duration-100',
          'checked:bg-success',
          "before:absolute before:top-1 before:left-1 before:size-5 before:rounded-full before:bg-white before:transition-transform before:duration-100 before:content-['']",
          'checked:before:translate-x-5',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        ].join(' ')}
      />
    </label>
  )
}
