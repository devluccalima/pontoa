import { useState } from 'react'
import { Link } from 'react-router'
import type { FormEvent } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Lock, LockOpen, Wallet } from 'lucide-react'
import type { CashMovement, CashSession } from '../../api/types'
import { errorMessage, fieldErrors } from '../../api/errors'
import { useSession } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { DelayedSpinner, EmptyState, LoadError } from '../../components/ui/QueryState'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { formatDateTime, formatTime } from '../../lib/datetime'
import { formatMoney, parseMoneyInput } from '../../lib/money'
import { EMPTY_VALUE } from '../../lib/text'
import { useProducts } from '../catalog/api'
import { useCashHistory, useCashMovements, useCurrentCash, useOpenCash } from './api'
import { CloseCashDialog } from './CloseCashDialog'
import { DifferenceBadge } from './DifferenceBadge'
import { MovementDialog } from './MovementDialog'

export function CashPage() {
  const { user } = useSession()
  const isOwner = user.role === 'owner'
  const current = useCurrentCash()

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Caixa" description="Dinheiro na gaveta durante o turno." />
      {current.isPending ? (
        <DelayedSpinner label="Carregando o caixa" />
      ) : current.error ? (
        <LoadError error={current.error} onRetry={() => void current.refetch()} />
      ) : current.data ? (
        <OpenCash session={current.data} isOwner={isOwner} />
      ) : (
        <ClosedCash isOwner={isOwner} />
      )}
      {isOwner ? <CashHistory /> : null}
    </section>
  )
}

function ClosedCash({ isOwner }: { isOwner: boolean }) {
  const open = useOpenCash()
  const { showToast } = useToast()
  const [amount, setAmount] = useState('')
  const [localError, setLocalError] = useState<string>()

  if (!isOwner) {
    return (
      <Alert tone="info">
        O caixa está fechado. Peça ao dono para abrir o caixa antes de começar as vendas.
      </Alert>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseMoneyInput(amount || '0')
    if (parsed === null) {
      setLocalError('Informe o valor do troco, por exemplo 50,00.')
      return
    }
    setLocalError(undefined)
    open.mutate(parsed, {
      onSuccess: () => showToast({ tone: 'success', message: 'Caixa aberto. Boas vendas!' }),
    })
  }

  const error = localError ?? fieldErrors(open.error).opening_amount
  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4 rounded-md border border-hairline bg-surface p-5">
      <div className="flex items-center gap-3">
        <Lock size={20} className="text-muted" aria-hidden />
        <h2 className="text-lg font-semibold">Caixa fechado</h2>
      </div>
      <p className="text-muted">Conte o dinheiro que fica na gaveta para troco e abra o caixa. Sem caixa aberto, não dá para registrar pedidos.</p>
      <StockReminder />
      {open.error && !error ? <Alert>{errorMessage(open.error)}</Alert> : null}
      <TextField
        label="Troco inicial"
        money
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={error}
        hint="Deixe em branco se não houver troco."
      />
      <Button
        type="submit"
        variant="accent"
        size="lg"
        icon={<LockOpen size={20} aria-hidden />}
        loading={open.isPending}
        loadingText="Abrindo…"
      >
        Abrir caixa
      </Button>
    </form>
  )
}

/** O saldo continua de um dia para o outro (ADR-0012): antes do turno, vale conferir. */
function StockReminder() {
  const products = useProducts()
  const tracked = (products.data ?? []).filter((product) => product.active && product.stock_quantity !== null).length
  if (tracked === 0) return null
  return (
    <Alert tone="info">
      {tracked === 1 ? '1 produto tem' : `${tracked} produtos têm`} estoque controlado.{' '}
      <Link to="/estoque" className="font-semibold underline underline-offset-4">
        Conferir o estoque
      </Link>{' '}
      antes de começar a vender.
    </Alert>
  )
}

function OpenCash({ session, isOwner }: { session: CashSession; isOwner: boolean }) {
  const { business } = useSession()
  const [dialog, setDialog] = useState<'deposit' | 'withdrawal' | 'close' | null>(null)
  const { summary } = session

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-md border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="success">Caixa aberto</Badge>
          <span className="text-sm text-muted">Desde {formatDateTime(session.opened_at, business.timezone)}</span>
        </div>
        <div>
          <p className="text-muted">Esperado na gaveta</p>
          <p className="text-[1.75rem] leading-tight font-bold tabular-nums">{formatMoney(summary.expected_amount)}</p>
        </div>
        <dl className="flex flex-col divide-y divide-hairline border-t border-hairline">
          <SummaryRow label="Troco inicial" value={summary.opening_amount} />
          <SummaryRow label="Recebido em dinheiro" value={summary.cash_payments} sign="+" />
          <SummaryRow label="Suprimentos" value={summary.deposits} sign="+" />
          <SummaryRow label="Sangrias" value={summary.withdrawals} sign="−" />
        </dl>
        <p className="text-sm text-muted">Pix e cartão não passam pela gaveta e não entram nesta conta.</p>

        {isOwner ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" icon={<ArrowDownToLine size={20} aria-hidden />} onClick={() => setDialog('deposit')}>
              Suprimento
            </Button>
            <Button variant="secondary" icon={<ArrowUpFromLine size={20} aria-hidden />} onClick={() => setDialog('withdrawal')}>
              Sangria
            </Button>
            <Button variant="primary" icon={<Lock size={20} aria-hidden />} onClick={() => setDialog('close')} className="sm:ml-auto">
              Fechar caixa
            </Button>
          </div>
        ) : null}
      </div>

      {isOwner ? <Movements sessionId={session.id} /> : null}

      {dialog === 'deposit' || dialog === 'withdrawal' ? (
        <MovementDialog kind={dialog} expectedAmount={summary.expected_amount} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'close' ? <CloseCashDialog session={session} onClose={() => setDialog(null)} /> : null}
    </div>
  )
}

function SummaryRow({ label, value, sign }: { label: string; value: string; sign?: '+' | '−' }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">
        {sign ? `${sign} ` : ''}
        {formatMoney(value)}
      </dd>
    </div>
  )
}

function Movements({ sessionId }: { sessionId: string }) {
  const { business } = useSession()
  const movements = useCashMovements(sessionId, true)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Suprimentos e sangrias</h2>
      {movements.isPending ? (
        <DelayedSpinner />
      ) : movements.error ? (
        <LoadError error={movements.error} onRetry={() => void movements.refetch()} />
      ) : movements.data.length === 0 ? (
        <p className="text-muted">Nenhuma movimentação neste caixa.</p>
      ) : (
        <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
          {movements.data.map((movement) => (
            <MovementRow key={movement.id} movement={movement} timeZone={business.timezone} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MovementRow({ movement, timeZone }: { movement: CashMovement; timeZone: string }) {
  const deposit = movement.kind === 'deposit'
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{deposit ? 'Suprimento' : 'Sangria'}</p>
        <p className="truncate text-sm text-muted">
          {formatTime(movement.created_at, timeZone)} · {movement.description}
        </p>
      </div>
      <span className="font-semibold tabular-nums">
        {deposit ? '+ ' : '− '}
        {formatMoney(movement.amount)}
      </span>
    </li>
  )
}

function CashHistory() {
  const { business } = useSession()
  const history = useCashHistory(true)
  const closed = history.data?.filter((session) => !session.is_open) ?? []

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Últimos fechamentos</h2>
      {history.isPending ? (
        <DelayedSpinner />
      ) : history.error ? (
        <LoadError error={history.error} onRetry={() => void history.refetch()} />
      ) : closed.length === 0 ? (
        <EmptyState icon={<Wallet size={28} aria-hidden />} title="Nenhum caixa fechado ainda" />
      ) : (
        <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
          {closed.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div>
                <p className="font-medium">{formatDateTime(session.closed_at ?? session.opened_at, business.timezone)}</p>
                <p className="text-sm text-muted tabular-nums">
                  Esperado {formatMoney(session.summary.expected_amount)} · Contado {formatMoney(session.counted_amount ?? '0')}
                </p>
              </div>
              <DifferenceBadge difference={session.difference ?? '0'} />
              <p className="basis-full text-sm break-words whitespace-pre-line">
                <span className="text-muted">Observação: </span>
                {session.closing_notes?.trim() || EMPTY_VALUE}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
