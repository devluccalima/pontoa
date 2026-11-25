import type { Order, Payment } from '../api/types'

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    cash_session_id: 's1',
    number: 1,
    customer_name: 'Ana',
    notes: null,
    status: 'new',
    total: '37.00',
    paid_amount: '0.00',
    amount_due: '37.00',
    payment_status: 'unpaid',
    items: [],
    created_by_id: 'u',
    created_at: '2026-11-25T12:00:00Z',
    delivered_at: null,
    cancelled_at: null,
    cancelled_by_id: null,
    cancel_reason: null,
    ...overrides,
  }
}

export function buildPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay',
    order_id: 'o1',
    cash_session_id: 's1',
    method: 'pix',
    amount: '37.00',
    received_amount: null,
    change: null,
    created_by_id: 'u',
    created_at: '2026-11-25T12:00:00Z',
    is_voided: false,
    voided_at: null,
    voided_by_id: null,
    void_reason: null,
    ...overrides,
  }
}
