import { Construction } from 'lucide-react'

type FeaturePlaceholderProps = {
  title: string
  description: string
}

/** Página provisória para telas que ainda serão construídas. */
export function FeaturePlaceholder({ title, description }: FeaturePlaceholderProps) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-muted">{description}</p>
      </div>

      <div className="rounded-md border border-hairline bg-surface p-6">
        <Construction className="mb-3 text-muted" size={20} aria-hidden />
        <h2 className="text-lg font-semibold">Em construção</h2>
        <p className="mt-1 text-muted">Esta tela chega nas próximas etapas do MVP.</p>
      </div>
    </section>
  )
}
