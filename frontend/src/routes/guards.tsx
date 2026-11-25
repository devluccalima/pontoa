import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { RefreshCw } from 'lucide-react'
import type { UserRole } from '../api/types'
import { errorMessage } from '../api/errors'
import { useAuth, useSession } from '../auth/useAuth'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Spinner'

/** Rotas que exigem login. */
export function RequireAuth() {
  const { state, retry, logout } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <SessionLoading />
  if (state.status === 'unavailable') {
    return (
      <CenteredPanel>
        <Alert>{errorMessage(state.error)}</Alert>
        <Button variant="primary" icon={<RefreshCw size={20} aria-hidden />} onClick={retry}>
          Tentar de novo
        </Button>
        <Button variant="secondary" onClick={() => void logout()}>
          Sair
        </Button>
      </CenteredPanel>
    )
  }
  if (state.status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Rotas restritas a um papel; quem não tem acesso vai para a tela de vendas. */
export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useSession()
  return user.role === role ? <Outlet /> : <Navigate to="/pdv" replace />
}

function SessionLoading() {
  // Só mostra o indicador se a espera passar de 300ms, para não piscar.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 300)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <CenteredPanel>
      {visible ? (
        <div className="flex justify-center text-muted">
          <Spinner size={32} label="Carregando sua sessão" />
        </div>
      ) : null}
    </CenteredPanel>
  )
}

function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="mb-4 text-center">
          <Logo />
        </div>
        {children}
      </div>
    </main>
  )
}
