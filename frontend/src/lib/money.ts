/**
 * Dinheiro no frontend (ADR-0006): a API manda texto com duas casas ("18.50").
 * Contas são feitas em centavos inteiros; `Number` só para exibir.
 */

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatMoney(value: string | number): string {
  return formatter.format(typeof value === 'number' ? value : Number(value))
}

export function formatCents(cents: number): string {
  return formatter.format(cents / 100)
}

/** "18.50" → 1850. Aceita só o formato da API. */
export function toCents(value: string): number {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) throw new Error(`Valor monetário inválido: ${value}`)
  const [, sign, units, decimals = ''] = match
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, '0'))
  return sign ? -cents : cents
}

/** 1850 → "18.50", o formato que a API aceita. */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

/**
 * O que a pessoa digitou → texto da API, ou `null` se não for um valor.
 * Aceita "18", "18,5", "18,50", "1.234,50", "R$ 18,50" e "18.50".
 */
export function parseMoneyInput(input: string): string | null {
  let text = input.replace(/R\$/i, '').replace(/\s/g, '')
  if (!text) return null
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '') // "1.234" sem vírgula: separador de milhar
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  return fromCents(toCents(text))
}

/** "18.50" → "18,50", para preencher um campo de edição. */
export function toMoneyInput(value: string): string {
  return value.replace('.', ',')
}
