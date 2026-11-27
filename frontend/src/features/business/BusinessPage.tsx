import { useState } from 'react'
import type { FormEvent } from 'react'
import { Clock } from 'lucide-react'
import { FORM_ERROR, errorMessage, fieldErrors } from '../../api/errors'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { changedFields } from '../../lib/changedFields'
import { formatTime } from '../../lib/datetime'
import { useNow } from '../../lib/useNow'
import { useUpdateBusiness } from './api'
import { BRAZIL_TIMEZONES } from './timezones'

/** Dados do estabelecimento (só dono): nome que aparece no sistema e fuso das datas e do painel. */
export function BusinessPage() {
  const { business } = useSession()
  const save = useUpdateBusiness()
  const { showToast } = useToast()
  const now = useNow()
  const [name, setName] = useState(business.name)
  const [timezone, setTimezone] = useState(business.timezone)
  const [nameError, setNameError] = useState<string>()

  const changes = changedFields(business, { name: name.trim(), timezone })
  const hasChanges = Object.keys(changes).length > 0
  // Um fuso fora da lista (definido pela API ou pela linha de comando) continua selecionável.
  const knownTimezone = BRAZIL_TIMEZONES.some((option) => option.value === business.timezone)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Informe o nome do estabelecimento.')
      return
    }
    setNameError(undefined)
    if (!hasChanges) return
    save.mutate(changes, {
      onSuccess: (saved) => {
        setName(saved.name)
        showToast({ tone: 'success', message: 'Dados do estabelecimento salvos.' })
      },
    })
  }

  const apiErrors = fieldErrors(save.error)
  const generalError =
    save.error && Object.keys(apiErrors).length === 0 ? errorMessage(save.error) : apiErrors[FORM_ERROR]

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Estabelecimento" description="Como o seu negócio aparece no sistema." />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex max-w-xl flex-col gap-5 rounded-md border border-hairline bg-surface p-4 md:p-6"
      >
        {generalError ? <Alert>{generalError}</Alert> : null}
        <TextField
          label="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError ?? apiErrors.name}
          maxLength={120}
          autoComplete="organization"
          hint="Aparece no menu para toda a equipe."
        />
        <SelectField
          label="Fuso horário"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          error={apiErrors.timezone}
          hint="Define o horário dos pedidos e em que dia cada venda entra no painel."
        >
          {knownTimezone ? null : <option value={business.timezone}>{business.timezone}</option>}
          {BRAZIL_TIMEZONES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <p className="flex items-center gap-2 text-muted">
          <Clock size={18} aria-hidden />
          <span>
            Agora nesse fuso:{' '}
            <span className="font-medium text-text tabular-nums">{formatTime(new Date(now).toISOString(), timezone)}</span>
          </span>
        </p>
        <div>
          <Button type="submit" variant="primary" disabled={!hasChanges} loading={save.isPending} loadingText="Salvando…">
            Salvar alterações
          </Button>
        </div>
      </form>
    </section>
  )
}
