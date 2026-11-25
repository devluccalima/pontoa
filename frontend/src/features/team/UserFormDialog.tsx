import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { FORM_ERROR, errorMessage, fieldErrors } from '../../api/errors'
import type { User, UserRole } from '../../api/types'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, SwitchField } from '../../components/ui/fields'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { ROLE_LABELS } from '../../layouts/navigation'
import { changedFields } from '../../lib/changedFields'
import { PASSWORD_MIN_LENGTH, useSaveUser } from './api'

type Props = {
  /** Pessoa em edição; ausente para cadastrar. */
  user?: User
  isSelf: boolean
  onClose: () => void
}

export function UserFormDialog({ user, isSelf, onClose }: Props) {
  const save = useSaveUser()
  const { showToast } = useToast()
  const formId = useId()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'operator')
  const [active, setActive] = useState(user?.active ?? true)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problems: Record<string, string> = {}
    if (!name.trim()) problems.name = 'Informe o nome.'
    if (!user && !/^\S+@\S+\.\S+$/.test(email.trim())) problems.email = 'Informe um e-mail válido.'
    if ((!user || password) && password.length < PASSWORD_MIN_LENGTH)
      problems.password = `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
    setLocalErrors(problems)
    if (Object.keys(problems).length > 0) return

    const data = user
      ? { ...changedFields(user, { name: name.trim(), role, active }), ...(password ? { password } : {}) }
      : { name: name.trim(), email: email.trim(), password, role }
    if (user && Object.keys(data).length === 0) {
      onClose()
      return
    }
    save.mutate(
      { id: user?.id, data },
      {
        onSuccess: (saved) => {
          showToast({ tone: 'success', message: user ? `${saved.name} atualizado.` : `${saved.name} cadastrado.` })
          onClose()
        },
      },
    )
  }

  const apiErrors = fieldErrors(save.error)
  const errors = { ...apiErrors, ...localErrors }
  const generalError = save.error && Object.keys(apiErrors).length === 0 ? errorMessage(save.error) : apiErrors[FORM_ERROR]

  return (
    <Dialog
      open
      title={user ? 'Editar pessoa' : 'Nova pessoa'}
      description={user ? undefined : 'Ela entra com o e-mail e a senha que você definir aqui.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={save.isPending} loadingText="Salvando…">
            Salvar
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {generalError ? <Alert>{generalError}</Alert> : null}
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} autoFocus autoComplete="off" />
        {user ? (
          <TextField label="E-mail" value={user.email} readOnly disabled hint="O e-mail não pode ser alterado." />
        ) : (
          <TextField
            label="E-mail"
            type="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            maxLength={254}
          />
        )}
        <TextField
          label={user ? 'Nova senha (opcional)' : 'Senha'}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          maxLength={128}
          hint={user ? 'Ao trocar a senha, a pessoa precisa entrar de novo.' : `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`}
        />
        <SelectField
          label="Papel"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isSelf}
          hint={isSelf ? 'Para mudar o seu papel, peça a outro dono.' : 'Dono vê o painel, gerencia produtos, caixa e equipe.'}
        >
          <option value="operator">{ROLE_LABELS.operator}</option>
          <option value="owner">{ROLE_LABELS.owner}</option>
        </SelectField>
        {user && !isSelf ? (
          <SwitchField
            label="Acesso ativo"
            description="Desativada, a pessoa sai na hora e não consegue entrar."
            checked={active}
            onChange={setActive}
          />
        ) : null}
      </form>
    </Dialog>
  )
}
