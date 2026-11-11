
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

describe('AppRoutes', () => {
  it('renders the POS page', () => {
    render(
      <MemoryRouter initialEntries={['/pdv']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Ponto de Venda',
      }),
    ).toBeInTheDocument()
  })

  it('renders the not found page', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Página não encontrada',
      }),
    ).toBeInTheDocument()
  })
})
