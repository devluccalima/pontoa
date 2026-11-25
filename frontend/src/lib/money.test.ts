import { describe, expect, it } from 'vitest'
import { formatCents, formatMoney, fromCents, parseMoneyInput, toCents, toMoneyInput } from './money'

describe('money', () => {
  it('formats with the Brazilian currency formatter', () => {
    expect(formatMoney('18.50')).toBe('R$ 18,50')
    expect(formatCents(123450)).toBe('R$ 1.234,50')
  })

  it('converts between API text and cents without floating point', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30)
    expect(toCents('18.5')).toBe(1850)
    expect(toCents('-2.00')).toBe(-200)
    expect(fromCents(30)).toBe('0.30')
    expect(fromCents(-200)).toBe('-2.00')
  })

  it.each([
    ['18', '18.00'],
    ['18,5', '18.50'],
    ['18,50', '18.50'],
    ['1.234,50', '1234.50'],
    ['1.234', '1234.00'],
    ['R$ 18,50', '18.50'],
    ['18.50', '18.50'],
    ['0', '0.00'],
  ])('parses %s', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected)
  })

  it.each(['', 'abc', '18,505', '-5', '1,2,3'])('rejects %s', (input) => {
    expect(parseMoneyInput(input)).toBeNull()
  })

  it('fills edit fields with a comma', () => {
    expect(toMoneyInput('18.50')).toBe('18,50')
  })
})
