import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type DialogProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  /** Botões de ação; ficam fixos no rodapé do diálogo. */
  footer?: ReactNode
}

/**
 * Diálogo modal (DESIGN.md: elevação 1, `motion-base`).
 * Usa o `<dialog>` nativo: o navegador cuida do foco preso e da tecla Esc.
 */
export function Dialog({ open, title, description, onClose, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className={[
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-md p-0',
        'border border-float-border bg-surface text-text shadow-float open:flex',
        'backdrop:bg-brand/50',
      ].join(' ')}
    >
      {open ? (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mt-2 -mr-3 inline-flex size-12 shrink-0 items-center justify-center rounded-md text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-hairline px-5 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </>
      ) : null}
    </dialog>
  )
}
