import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, fieldErrors } from '../../api/errors'
import type { Order } from '../../api/types'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { useCancelOrder } from './api'

export function CancelOrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const cancel = useCancelOrder()
  const { showToast } = useToast()
  const formId = useId()
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reason.trim().length < 3) {
      setLocalError('Explique o motivo em poucas palavras.')
      return
    }
    setLocalError(undefined)
    cancel.mutate(
      { id: order.id, reason: reason.trim() },
      {
        onSuccess: () => {
          showToast({ tone: 'success', message: `Pedido #${order.number} cancelado.` })
          onClose()
        },
      },
    )
  }

  const apiErrors = fieldErrors(cancel.error)
  return (
    <Dialog
      open
      title={`Cancelar pedido #${order.number}?`}
      description="O pedido sai da fila e não entra nas vendas. Não é possível desfazer."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={cancel.isPending} loadingText="Cancelando…">
            Cancelar pedido
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {cancel.error && Object.keys(apiErrors).length === 0 ? <Alert>{errorMessage(cancel.error)}</Alert> : null}
        <TextField
          label="Motivo"
          placeholder="Ex.: cliente desistiu"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={localError ?? apiErrors.reason}
          maxLength={200}
          autoFocus
        />
      </form>
    </Dialog>
  )
}
