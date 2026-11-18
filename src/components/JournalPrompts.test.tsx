import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CheckIn from './CheckIn'

describe('journal prompts in the check-in', () => {
  it('inserts a picked prompt into the journal box', async () => {
    render(
      <CheckIn
        pending={false}
        error={null}
        phase="final-sprint"
        aiConsent
        onConsent={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: /need a prompt/i }),
    )
    const prompt = screen.getByRole('button', { name: /rest and stay steady/i })
    await userEvent.click(prompt)

    const journal = screen.getByLabelText(/what's on your mind/i)
    expect(journal).toHaveValue(`${prompt.textContent}\n`)
    expect(journal).toHaveFocus()
  })
})
