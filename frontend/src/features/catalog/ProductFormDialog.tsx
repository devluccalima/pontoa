import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { FORM_ERROR, errorMessage, fieldErrors } from '../../api/errors'
import type { Category, Product, ProductCreate } from '../../api/types'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, SwitchField, TextAreaField } from '../../components/ui/fields'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { parseMoneyInput, toMoneyInput } from '../../lib/money'
import { changedFields, useSaveProduct } from './api'

type Props = {
  /** Produto em edição; ausente para cadastrar um novo. */
  product?: Product
  categories: Category[]
  defaultCategoryId?: string | null
  onClose: () => void
}

export function ProductFormDialog({ product, categories, defaultCategoryId = null, onClose }: Props) {
  const { showToast } = useToast()
  const save = useSaveProduct()
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? toMoneyInput(product.price) : '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? defaultCategoryId ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [position, setPosition] = useState(String(product?.position ?? 0))
  const [active, setActive] = useState(product?.active ?? true)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const apiErrors = fieldErrors(save.error)
  const errors = { ...apiErrors, ...localErrors }
  const generalError = save.error && Object.keys(apiErrors).length === 0 ? errorMessage(save.error) : apiErrors[FORM_ERROR]

  // Categorias inativas só aparecem se o produto já estiver nelas.
  const selectable = categories.filter((category) => category.active || category.id === product?.category_id)

  // Aqui o preço já está no formato da API ("18.50"), sempre texto.
  function validate(): (ProductCreate & { price: string }) | null {
    const problems: Record<string, string> = {}
    const parsedPrice = parseMoneyInput(price)
    const parsedPosition = Number(position)
    if (!name.trim()) problems.name = 'Informe o nome do produto.'
    if (parsedPrice === null) problems.price = 'Informe o preço, por exemplo 18,50.'
    if (!Number.isInteger(parsedPosition) || parsedPosition < 0) problems.position = 'Use um número inteiro, 0 ou maior.'
    setLocalErrors(problems)
    if (Object.keys(problems).length > 0 || parsedPrice === null) return null
    return {
      name: name.trim(),
      price: parsedPrice,
      category_id: categoryId || null,
      description: description.trim() || null,
      position: parsedPosition,
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = validate()
    if (!data) return
    const body = product
      ? changedFields(product, { ...data, active })
      : data
    if (product && Object.keys(body).length === 0) {
      onClose()
      return
    }
    save.mutate(
      { id: product?.id, data: body },
      {
        onSuccess: (saved) => {
          showToast({ tone: 'success', message: product ? `${saved.name} atualizado.` : `${saved.name} cadastrado.` })
          onClose()
        },
      },
    )
  }

  const formId = useId()
  return (
    <Dialog
      open
      title={product ? 'Editar produto' : 'Novo produto'}
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
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} autoFocus />
        <TextField
          label="Preço"
          money
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          placeholder="0,00"
        />
        <SelectField label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category_id}>
          <option value="">Sem categoria</option>
          {selectable.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.active ? '' : ' (inativa)'}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          maxLength={500}
        />
        <TextField
          label="Ordem na tela de vendas"
          hint="Números menores aparecem primeiro."
          inputMode="numeric"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          error={errors.position}
        />
        {product ? (
          <SwitchField
            label="Disponível para venda"
            description="Desativado, some da tela de vendas mas continua nos pedidos antigos."
            checked={active}
            onChange={setActive}
          />
        ) : null}
      </form>
    </Dialog>
  )
}
