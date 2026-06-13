import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CheckIn from './CheckIn'

describe('CheckIn', () => {
  it('blocks submission and shows errors until mood + text are provided', async () => {
    const onSubmit = vi.fn()
    render(<CheckIn pending={false} error={null} onSubmit={onSubmit} />)

    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/pick a mood first/i)).toBeInTheDocument()
  })

  it('submits mood, text, and selected tags, then clears the form', async () => {
    const onSubmit = vi.fn()
    render(<CheckIn pending={false} error={null} onSubmit={onSubmit} />)

    await userEvent.click(
      screen.getByRole('radio', { name: /low \(2 of 5\)/i }),
    )
    const textarea = screen.getByLabelText(/what's on your mind/i)
    await userEvent.type(textarea, 'Mock test went badly today')
    await userEvent.click(screen.getByRole('button', { name: /mock test/i }))

    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )

    expect(onSubmit).toHaveBeenCalledWith(2, 'Mock test went badly today', [
      'mock test',
    ])
    expect((textarea as HTMLTextAreaElement).value).toBe('')
  })

  it('disables the submit button while a reflection is pending', () => {
    render(<CheckIn pending={true} error={null} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /reflecting/i })).toBeDisabled()
  })
})
