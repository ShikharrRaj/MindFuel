import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MoodPicker from './MoodPicker'

describe('MoodPicker', () => {
  it('exposes an accessible radiogroup with five options', () => {
    render(<MoodPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('selects a mood on click', async () => {
    const onChange = vi.fn()
    render(<MoodPicker value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: /great \(5 of 5\)/i }))
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('supports arrow-key navigation from the selected option', async () => {
    const onChange = vi.fn()
    render(<MoodPicker value={3} onChange={onChange} />)
    const selected = screen.getByRole('radio', { name: /okay \(3 of 5\)/i })
    selected.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('marks the active option with aria-checked', () => {
    render(<MoodPicker value={4} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: /good \(4 of 5\)/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
