import { ApiError } from './client'

/**
 * Mensagens para pessoas a partir do erro da API (DESIGN.md, "Erros da API").
 * Nunca mostra código HTTP, texto técnico ou mensagem em inglês.
 */

const GENERIC = 'Algo deu errado. Tente novamente.'

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC
  switch (error.code) {
    case 'network_error':
      return 'Sem conexão. Verifique a internet e tente novamente.'
    case 'not_found':
      return 'Este registro não está mais disponível.'
    case 'validation_error':
      return 'Confira os campos destacados.'
    case 'internal_error':
    case 'unknown_error':
      return error.requestId ? `${GENERIC} Código: ${shortRequestId(error.requestId)}.` : GENERIC
    default:
      // business_rule_violation, unauthorized, forbidden: a API já manda texto em português.
      return error.message || GENERIC
  }
}

export function shortRequestId(requestId: string): string {
  return requestId.replace(/-/g, '').slice(0, 8)
}

const FIELD_MESSAGES: Record<string, string> = {
  missing: 'Preencha este campo.',
  string_too_short: 'Preencha este campo.',
  string_too_long: 'Texto longo demais.',
  value_error: 'Valor inválido.',
  decimal_parsing: 'Informe um valor válido.',
  greater_than: 'Informe um valor maior que zero.',
  greater_than_equal: 'O valor não pode ser negativo.',
  decimal_max_places: 'Use no máximo duas casas decimais.',
  decimal_max_digits: 'Valor alto demais.',
  extra_forbidden: 'Campo não reconhecido.',
}

/** Chave usada para erros que valem para o formulário inteiro, não para um campo. */
export const FORM_ERROR = '_form'

// Validações nossas (model_validator) já vêm em português, com este prefixo do Pydantic.
const VALUE_ERROR_PREFIX = 'Value error, '

/**
 * Erros de validação por campo do formulário: `body.price` vira `price`.
 * As mensagens padrão do Pydantic chegam em inglês, então o texto vem do `type`.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'validation_error') return {}
  const result: Record<string, string> = {}
  for (const detail of error.details) {
    const field = detail.field === 'body' ? FORM_ERROR : detail.field.replace(/^body\./, '')
    const message =
      detail.type === 'value_error' && detail.message.startsWith(VALUE_ERROR_PREFIX)
        ? detail.message.slice(VALUE_ERROR_PREFIX.length)
        : (FIELD_MESSAGES[detail.type] ?? 'Valor inválido.')
    result[field] ??= message
  }
  return result
}
