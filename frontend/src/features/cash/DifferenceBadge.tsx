import { Badge } from '../../components/ui/Badge'
import { formatCents, toCents } from '../../lib/money'

/** Diferença do fechamento: contado − esperado. */
export function DifferenceBadge({ difference }: { difference: string }) {
  const cents = toCents(difference)
  if (cents === 0) return <Badge tone="success">Sem diferença</Badge>
  if (cents < 0) return <Badge tone="danger">Falta {formatCents(-cents)}</Badge>
  return <Badge tone="attention">Sobra {formatCents(cents)}</Badge>
}
