import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Onboarding from './Onboarding'

describe('Onboarding', () => {
  it('requires an exam date before completing', async () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)
    await userEvent.click(
      screen.getByRole('button', { name: /start checking in/i }),
    )
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/exam date/i)
  })

  it('passes the chosen profile up on submit', async () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} />)

    await userEvent.type(screen.getByLabelText(/first name/i), 'Aarav')
    await userEvent.selectOptions(screen.getByLabelText(/which exam/i), 'NEET')
    const dateInput = screen.getByLabelText(/when is your exam/i)
    await userEvent.type(dateInput, '2026-06-22')

    await userEvent.click(
      screen.getByRole('button', { name: /start checking in/i }),
    )

    expect(onComplete).toHaveBeenCalledWith({
      name: 'Aarav',
      exam: 'NEET',
      examDateISO: '2026-06-22',
    })
  })
})
