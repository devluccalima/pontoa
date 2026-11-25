import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted">O endereço acessado não existe.</p>
      <Link
        to="/pdv"
        className="inline-flex min-h-12 w-fit items-center rounded-md border border-border-strong bg-surface px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Ir para as vendas
      </Link>
    </section>
  )
}
