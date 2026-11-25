import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { errorMessage, fieldErrors } from '../../api/errors'
import type { Category } from '../../api/types'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { useSaveCategory } from './api'

export function CategoriesDialog({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <Dialog
      open
      title="Categorias"
      description="Agrupam os produtos na tela de vendas."
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Concluir
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <NewCategoryForm nextPosition={categories.length} />
        {categories.length > 0 ? (
          <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline">
            {categories.map((category) =>
              category.id === editingId ? (
                <li key={category.id} className="p-3">
                  <EditCategoryForm category={category} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <CategoryRow key={category.id} category={category} onEdit={() => setEditingId(category.id)} />
              ),
            )}
          </ul>
        ) : (
          <p className="text-muted">Nenhuma categoria ainda.</p>
        )}
      </div>
    </Dialog>
  )
}

function NewCategoryForm({ nextPosition }: { nextPosition: number }) {
  const save = useSaveCategory()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setLocalError('Informe o nome da categoria.')
      return
    }
    setLocalError(undefined)
    save.mutate(
      { data: { name: name.trim(), position: nextPosition } },
      {
        onSuccess: (saved) => {
          setName('')
          showToast({ tone: 'success', message: `Categoria ${saved.name} criada.` })
        },
      },
    )
  }

  const error = localError ?? fieldErrors(save.error).name ?? (save.error ? errorMessage(save.error) : undefined)
  return (
    <form onSubmit={handleSubmit} noValidate className="flex items-start gap-2">
      <TextField
        label="Nova categoria"
        className="flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        maxLength={60}
      />
      <Button type="submit" variant="primary" className="mt-6" icon={<Plus size={20} aria-hidden />} loading={save.isPending} loadingText="Adicionando…">
        Adicionar
      </Button>
    </form>
  )
}

function CategoryRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const save = useSaveCategory()
  const { showToast } = useToast()

  function toggleActive() {
    save.mutate(
      { id: category.id, data: { active: !category.active } },
      {
        onSuccess: (saved) =>
          showToast({
            tone: 'success',
            message: saved.active ? `${saved.name} reativada.` : `${saved.name} desativada.`,
          }),
        onError: (error) => showToast({ tone: 'error', message: errorMessage(error) }),
      },
    )
  }

  return (
    <li className="flex items-center justify-between gap-2 p-3">
      <span className="flex min-w-0 items-center gap-2">
        <span className={`truncate font-medium ${category.active ? '' : 'text-muted'}`}>{category.name}</span>
        {category.active ? null : <Badge>Inativa</Badge>}
      </span>
      <span className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={onEdit} aria-label={`Renomear ${category.name}`} className="px-3">
          <Pencil size={20} aria-hidden />
        </Button>
        <Button variant="secondary" onClick={toggleActive} loading={save.isPending}>
          {category.active ? 'Desativar' : 'Reativar'}
        </Button>
      </span>
    </li>
  )
}

function EditCategoryForm({ category, onDone }: { category: Category; onDone: () => void }) {
  const save = useSaveCategory()
  const [name, setName] = useState(category.name)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === category.name) {
      onDone()
      return
    }
    save.mutate({ id: category.id, data: { name: trimmed } }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      {save.error && !fieldErrors(save.error).name ? <Alert>{errorMessage(save.error)}</Alert> : null}
      <TextField
        label="Nome da categoria"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors(save.error).name}
        maxLength={60}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={save.isPending} loadingText="Salvando…">
          Salvar
        </Button>
      </div>
    </form>
  )
}
