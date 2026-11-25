
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Confirmar pedido</Button>)

    expect(
      screen.getByRole('button', {
        name: 'Confirmar pedido',
      }),
    ).toBeInTheDocument()
  })

  it('executes the click handler', () => {
    const handleClick = vi.fn()

    render(
      <Button onClick={handleClick}>
        Criar pedido
      </Button>,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Criar pedido',
      }),
    )

    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('respects the disabled state', () => {
    render(
      <Button disabled>
        Finalizar
      </Button>,
    )

    expect(
      screen.getByRole('button', {
        name: 'Finalizar',
      }),
    ).toBeDisabled()
  })

  it('blocks repeated taps while loading', () => {
    const handleClick = vi.fn()

    render(
      <Button loading loadingText="Finalizando…" onClick={handleClick}>
        Finalizar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Finalizando…' })
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(handleClick).not.toHaveBeenCalled()
  })
})
