import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFS } from '../lib/calm'
import { EMPTY_SAFETY_PLAN } from '../lib/safetyPlan'
import type { CalmStore } from '../hooks/useCalmStore'
import { useFocusSession } from '../hooks/useFocusSession'
import FocusCoach from './FocusCoach'

const store: CalmStore = {
  sessions: [],
  prefs: { ...DEFAULT_PREFS, haptics: false },
  plan: EMPTY_SAFETY_PLAN,
  logSession: vi.fn(),
  updatePrefs: vi.fn(),
  savePlan: vi.fn(),
  reset: vi.fn(),
}

/** The app owns the session; the coach renders it. */
function Coach() {
  const session = useFocusSession(false)
  return <FocusCoach store={store} session={session} />
}

describe('FocusCoach', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps wall-clock time while the page is suspended, then starts the break', () => {
    render(<Coach />)
    fireEvent.click(screen.getByRole('button', { name: 'Start focus' }))
    // 25 minutes pass with the phone locked: no interval ticks run.
    act(() => {
      vi.setSystemTime(Date.now() + 25 * 60 * 1000)
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByText('Short break')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/focus block 1 done/i)
    expect(
      screen.getByRole('button', { name: 'Skip break' }),
    ).toBeInTheDocument()
  })

  it('pauses and resumes without losing time', () => {
    render(<Coach />)
    fireEvent.click(screen.getByRole('button', { name: 'Start focus' }))
    act(() => vi.advanceTimersByTime(60_000))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => vi.advanceTimersByTime(10 * 60_000))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByText('24:00')).toBeInTheDocument()
  })
})
