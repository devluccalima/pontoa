import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { LogIn } from 'lucide-react'
import { errorMessage, fieldErrors } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { TextField } from '../components/ui/TextField'
import { ThemeToggle } from '../theme/ThemeToggle'

type LocationState = { from?: string } | null

export function LoginPage() {
  const { state, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)

  if (state.status === 'authenticated') {
    const from = (location.state as LocationState)?.from
    return <Navigate to={from && from !== '/entrar' ? from : '/'} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (caught) {
      setError(caught)
      setSubmitting(false)
    }
  }

  const fields = fieldErrors(error)
  const expired = state.status === 'anonymous' && state.reason === 'expired' && !error

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-8 sm:items-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="mt-6 text-2xl font-semibold">Entrar</h1>
            <p className="mt-1 text-muted">Use o e-mail e a senha cadastrados pelo dono.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 rounded-md border border-hairline bg-surface p-6"
          >
            {expired ? <Alert tone="info">Sua sessão expirou. Entre novamente.</Alert> : null}
            {error && Object.keys(fields).length === 0 ? <Alert>{errorMessage(error)}</Alert> : null}

            <TextField
              label="E-mail"
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fields.email}
            />
            <TextField
              label="Senha"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fields.password}
            />

            <Button
              type="submit"
              variant="accent"
              size="lg"
              icon={<LogIn size={20} aria-hidden />}
              loading={submitting}
              loadingText="Entrando…"
              className="mt-2 w-full"
            >
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
