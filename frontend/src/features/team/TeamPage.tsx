import { useState } from 'react'
import { ChevronRight, UserPlus, Users } from 'lucide-react'
import type { User } from '../../api/types'
import { useSession } from '../../auth/useAuth'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, EmptyState, LoadError } from '../../components/ui/QueryState'
import { ROLE_LABELS } from '../../layouts/navigation'
import { useUsers } from './api'
import { UserFormDialog } from './UserFormDialog'

export function TeamPage() {
  const { user: me } = useSession()
  const users = useUsers()
  const [editing, setEditing] = useState<{ user?: User } | null>(null)

  // Ativos primeiro; dentro de cada grupo, por nome.
  const sorted = [...(users.data ?? [])].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR'),
  )

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Equipe"
        description="Quem pode entrar no sistema."
        actions={
          <Button variant="accent" icon={<UserPlus size={20} aria-hidden />} onClick={() => setEditing({})}>
            Nova pessoa
          </Button>
        }
      />
      {users.isPending ? (
        <DelayedSpinner label="Carregando a equipe" />
      ) : users.error ? (
        <LoadError error={users.error} onRetry={() => void users.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={<Users size={28} aria-hidden />} title="Ninguém cadastrado" />
      ) : (
        <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
          {sorted.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => setEditing({ user })}
                aria-label={`Editar ${user.name}`}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${user.active ? '' : 'text-muted'}`}>
                      {user.name}
                      {user.id === me.id ? <span className="font-normal text-muted"> (você)</span> : null}
                    </span>
                    <Badge>{ROLE_LABELS[user.role]}</Badge>
                    {user.active ? null : <Badge tone="danger">Sem acesso</Badge>}
                  </span>
                  <span className="block truncate text-sm text-muted">{user.email}</span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <UserFormDialog user={editing.user} isSelf={editing.user?.id === me.id} onClose={() => setEditing(null)} />
      ) : null}
    </section>
  )
}
