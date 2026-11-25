import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { FORM_ERROR, errorMessage, fieldErrors } from './errors'

describe('errorMessage', () => {
  it('uses the Portuguese message of business rules', () => {
    const error = new ApiError(409, 'business_rule_violation', 'O pedido já está pago.')
    expect(errorMessage(error)).toBe('O pedido já está pago.')
  })

  it('adds the short request code to internal errors', () => {
    const error = new ApiError(500, 'internal_error', 'x', [], '0192f3a4-b5c6-7d8e-9f00-112233445566')
    expect(errorMessage(error)).toBe('Algo deu errado. Tente novamente. Código: 0192f3a4.')
  })

  it('never shows technical text for unknown errors', () => {
    expect(errorMessage(new Error('TypeError: x is undefined'))).toBe('Algo deu errado. Tente novamente.')
    expect(errorMessage(new ApiError(0, 'network_error', ''))).toMatch(/^Sem conexão/)
  })
})

describe('fieldErrors', () => {
  it('maps validation details to form fields in Portuguese', () => {
    const error = new ApiError(422, 'validation_error', 'Dados inválidos.', [
      { field: 'body.price', message: 'Input should be greater than 0', type: 'greater_than' },
      { field: 'body', message: 'Value error, O valor recebido é menor que o valor pago.', type: 'value_error' },
    ])

    expect(fieldErrors(error)).toEqual({
      price: 'Informe um valor maior que zero.',
      [FORM_ERROR]: 'O valor recebido é menor que o valor pago.',
    })
  })

  it('ignores errors that are not validation errors', () => {
    expect(fieldErrors(new ApiError(409, 'business_rule_violation', 'x'))).toEqual({})
  })
})
