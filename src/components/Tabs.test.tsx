import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import Tabs from './Tabs'

const TABS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
] as const

function Harness() {
  const [active, setActive] = useState<'a' | 'b' | 'c'>('a')
  return <Tabs tabs={[...TABS]} active={active} onChange={setActive} />
}

describe('Tabs keyboard', () => {
  it('keeps only the active tab in the Tab order', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })

  it('moves and selects with arrows (wrapping), Home and End', async () => {
    render(<Harness />)
    const alpha = screen.getByRole('tab', { name: 'Alpha' })
    alpha.focus()

    await userEvent.keyboard('{ArrowRight}')
    const beta = screen.getByRole('tab', { name: 'Beta' })
    expect(beta).toHaveFocus()
    expect(beta).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(alpha).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(alpha).toHaveAttribute('aria-selected', 'true')
  })
})
