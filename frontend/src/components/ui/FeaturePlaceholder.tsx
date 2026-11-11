
import { Construction } from 'lucide-react'

type FeaturePlaceholderProps = {
  title: string
  description: string
}

export function FeaturePlaceholder({
  title,
  description,
}: FeaturePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold text-success">
          Pontoa · Fundação do Projeto
        </p>

        <h1 className="text-3xl font-bold">{title}</h1>

        <p className="mt-2 text-[var(--app-muted)]">
          {description}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8">
        <Construction className="mb-4 text-accent" size={32} />

        <h2 className="text-xl font-bold">
          Módulo em preparação
        </h2>

        <p className="mt-2 text-sm text-[var(--app-muted)]">
          A estrutura da interface está pronta.
          Esta funcionalidade será implementada
          nas próximas etapas do MVP.
        </p>
      </div>
    </section>
  )
}
