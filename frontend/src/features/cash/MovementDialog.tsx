import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, fieldErrors } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { formatMoney, parseMoneyInput, toCents } from '../../lib/money'
import { useAddMovement } from './api'

const TEXT = {
  deposit: {
    title: 'Suprimento',
    description: 'Dinheiro colocado na gaveta, por exemplo mais troco.',
    placeholder: 'Ex.: troco extra',
    done: 'Suprimento registrado.',
  },
  withdrawal: {
    title: 'Sangria',
    description: 'Dinheiro retirado da gaveta, por exemplo para guardar ou pagar um fornecedor.',
    placeholder: 'Ex.: retirada para o cofre',
    done: 'Sangria registrada.',
  },
}

export function MovementDialog({
  kind,
  expectedAmount,
  onClose,
}: {
  kind: 'deposit' | 'withdrawal'
  expectedAmount: string
  onClose: () => void
}) {
  const text = TEXT[kind]
  const add = useAddMovement()
  const { showToast } = useToast()
  const formId = useId()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseMoneyInput(amount)
    const problems: Record<string, string> = {}
    if (parsed === null || toCents(parsed) === 0) problems.amount = 'Informe um valor maior que zero.'
    else if (kind === 'withdrawal' && toCents(parsed) > toCents(expectedAmount))
      problems.amount = `A gaveta tem ${formatMoney(expectedAmount)}.`
    if (!description.trim()) problems.description = 'Descreva o motivo.'
    setLocalErrors(problems)
    if (Object.keys(problems).length > 0 || parsed === null) return
    add.mutate(
      { kind, amount: parsed, description: description.trim() },
      {
        onSuccess: () => {
          showToast({ tone: 'success', message: text.done })
          onClose()
        },
      },
    )
  }

  const apiErrors = fieldErrors(add.error)
  const errors = { ...apiErrors, ...localErrors }
  return (
    <Dialog
      open
      title={text.title}
      description={text.description}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={add.isPending} loadingText="Registrando…">
            Registrar {text.title.toLowerCase()}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {add.error && Object.keys(apiErrors).length === 0 ? <Alert>{errorMessage(add.error)}</Alert> : null}
        <TextField label="Valor" money placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} autoFocus />
        <TextField
          label="Motivo"
          placeholder={text.placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          maxLength={200}
        />
      </form>
    </Dialog>
  )
}
