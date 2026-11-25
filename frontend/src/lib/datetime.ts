/** Datas e horas sempre no fuso do estabelecimento, não no do aparelho. */

export function formatDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(value))
}

export function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(value))
}
