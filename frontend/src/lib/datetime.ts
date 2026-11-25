/** Datas e horas sempre no fuso do estabelecimento, não no do aparelho. */

export function formatDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(value))
}

export function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(value))
}

/** Data de hoje ("2026-11-25") no fuso informado. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Soma dias a uma data "AAAA-MM-DD", sem depender do fuso do aparelho. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 8)}01`
}

/** "2026-11-25" → "25/11/2026". */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}
