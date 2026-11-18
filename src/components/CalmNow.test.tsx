import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFS } from '../lib/calm'
import type { JournalEntry } from '../lib/types'
import CalmNow from './CalmNow'

function setup(latest: JournalEntry | null = null) {
  const onLog = vi.fn()
  render(
    <CalmNow
      latest={latest}
      sessions={[]}
      prefs={DEFAULT_PREFS}
      onLog={onLog}
      onSettingChange={vi.fn()}
      onOpenPlan={vi.fn()}
    />,
  )
  return { onLog }
}

describe('CalmNow', () => {
  it('recommends an activity with a reason, runs it and logs before/after', async () => {
    const { onLog } = setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /panic/i }))
    await user.click(
      screen.getByRole('button', { name: /find something that helps/i }),
    )

    expect(screen.getByText(/suggested for you/i)).toBeInTheDocument()
    expect(screen.getByText(/why this:/i).parentElement).toHaveTextContent(
      /panic/i,
    )

    await user.click(screen.getByRole('button', { name: /^start /i }))
    await user.click(screen.getByRole('button', { name: /i’m done/i }))
    fireEvent.change(screen.getByLabelText(/how strong is it now/i), {
      target: { value: '2' },
    })
    await user.click(screen.getByRole('button', { name: /it helped/i }))

    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({
        states: ['panic'],
        before: 5,
        after: 2,
        outcome: 'helped',
        source: 'calm',
      }),
    )
    expect(screen.getByText(/you brought it from 5 to 2/i)).toBeInTheDocument()
  })

  it('does not log a rating the student never gave', async () => {
    const { onLog } = setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /racing thoughts/i }))
    await user.click(
      screen.getByRole('button', { name: /find something that helps/i }),
    )
    await user.click(screen.getByRole('button', { name: /^start /i }))
    await user.click(screen.getByRole('button', { name: /i’m done/i }))
    await user.click(screen.getByRole('button', { name: /it helped/i }))
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ after: undefined, outcome: 'helped' }),
    )
  })

  it('explains the two-pick limit instead of silently swapping', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /panic/i }))
    await user.click(screen.getByRole('button', { name: /lonely/i }))
    await user.click(screen.getByRole('button', { name: /irritable/i }))
    expect(screen.getByRole('button', { name: /panic/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText(/you can pick two/i)).toBeInTheDocument()
  })

  it('pre-fills from a recent check-in', () => {
    setup({
      id: '1',
      createdAtISO: new Date().toISOString(),
      mood: 2,
      text: 'Could not sleep before the mock.',
      tags: ['low sleep'],
    })
    expect(
      screen.getByRole('button', { name: /can't sleep/i }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByText(/pre-filled from your last check-in/i),
    ).toBeInTheDocument()
  })

  it('shows helplines alongside activities at 9/10 or above', async () => {
    setup()
    // jsdom does not move range inputs on arrow keys, so set the value directly.
    fireEvent.change(screen.getByLabelText(/how strong is it\?/i), {
      target: { value: '9' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: /find something that helps/i }),
    )
    expect(screen.getByText(/14416/)).toBeInTheDocument()
  })
})
