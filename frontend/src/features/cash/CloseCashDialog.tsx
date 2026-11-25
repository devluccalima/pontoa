import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, fieldErrors } from '../../api/errors'
import type { CashSession } from '../../api/types'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextAreaField } from '../../components/ui/fields'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { formatMoney, fromCents, parseMoneyInput, toCents } from '../../lib/money'
import { useCloseCash } from './api'
import { DifferenceBadge } from './DifferenceBadge'

/** Fechamento: ação difícil de desfazer, por isso diálogo com botão de perigo nomeado (DESIGN.md). */
export function CloseCashDialog({ session, onClose }: { session: CashSession; onClose: () => void }) {
  const close = useCloseCash()
  const { showToast } = useToast()
  const formId = useId()
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [localError, setLocalError] = useState<string>()

  const expected = session.summary.expected_amount
  const parsed = parseMoneyInput(counted)
  const difference = parsed === null ? null : fromCents(toCents(parsed) - toCents(expected))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (parsed === null) {
      setLocalError('Informe quanto há na gaveta, por exemplo 118,00.')
      return
    }
    setLocalError(undefined)
    close.mutate(
      { counted_amount: parsed, notes: notes.trim() || null },
      {
        onSuccess: (closed) => {
          const diff = toCents(closed.difference ?? '0')
          showToast({
            tone: 'success',
            message: diff === 0 ? 'Caixa fechado sem diferença.' : `Caixa fechado. Diferença de ${formatMoney(closed.difference ?? '0')}.`,
          })
          onClose()
        },
      },
    )
  }

  const apiErrors = fieldErrors(close.error)
  return (
    <Dialog
      open
      title="Fechar caixa"
      description="Conte o dinheiro da gaveta. Depois de fechado, o caixa não pode ser reaberto."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={close.isPending} loadingText="Fechando…">
            Fechar caixa
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {close.error && Object.keys(apiErrors).length === 0 ? <Alert>{errorMessage(close.error)}</Alert> : null}
        <div className="flex items-center justify-between gap-4 rounded-md bg-bg px-4 py-3">
          <span className="text-muted">Esperado na gaveta</span>
          <span className="text-lg font-semibold tabular-nums">{formatMoney(expected)}</span>
        </div>
        <TextField
          label="Valor contado"
          money
          placeholder="0,00"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          error={localError ?? apiErrors.counted_amount}
          autoFocus
        />
        <div aria-live="polite" className="flex min-h-8 items-center justify-between gap-4">
          {difference !== null ? (
            <>
              <span className="text-muted">Diferença</span>
              <DifferenceBadge difference={difference} />
            </>
          ) : null}
        </div>
        <TextAreaField
          label="Observações (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          error={apiErrors.notes}
          maxLength={500}
        />
      </form>
    </Dialog>
  )
}
