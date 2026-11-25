import { describe, expect, it } from 'vitest'
import { addDays, formatDate, startOfMonth, todayIn } from './datetime'

describe('dates in the business time zone', () => {
  it('uses the business day, not the device day', () => {
    // 01:30 UTC de 26/11 ainda é 25/11 em São Paulo.
    const instant = new Date('2026-11-26T01:30:00Z')
    expect(todayIn('America/Sao_Paulo', instant)).toBe('2026-11-25')
    expect(todayIn('UTC', instant)).toBe('2026-11-26')
  })

  it('does calendar math on plain dates', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(startOfMonth('2026-11-25')).toBe('2026-11-01')
    expect(formatDate('2026-11-25')).toBe('25/11/2026')
  })
})
