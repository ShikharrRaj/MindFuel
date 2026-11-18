import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SafetyCard from './SafetyCard'

describe('SafetyCard', () => {
  it('always offers the national line and the 112 emergency number', () => {
    render(<SafetyCard />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '14416' })).toHaveAttribute(
      'href',
      'tel:14416',
    )
    expect(screen.getByRole('link', { name: '112' })).toHaveAttribute(
      'href',
      'tel:112',
    )
  })

  it('can render as a non-alert banner', () => {
    render(<SafetyCard alert={false} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})
