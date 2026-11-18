import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BreathPacer from './BreathPacer'

const PHASES = [
  { label: 'Breathe in', seconds: 1, motion: 'in' as const },
  { label: 'Breathe out', seconds: 1, motion: 'out' as const },
]

describe('BreathPacer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('auto-starts, announces phases once each, and completes after all rounds', () => {
    const onComplete = vi.fn()
    render(
      <BreathPacer
        name="Test breath"
        phases={PHASES}
        rounds={2}
        autoStart
        onComplete={onComplete}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Breathe in, round 1 of 2',
    )

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Breathe out, round 1 of 2',
    )

    act(() => vi.advanceTimersByTime(3000))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(/done/i)
  })

  it('keeps wall-clock time when ticks are skipped (locked phone)', () => {
    const onComplete = vi.fn()
    render(
      <BreathPacer
        name="Test breath"
        phases={PHASES}
        rounds={3}
        autoStart
        onComplete={onComplete}
      />,
    )
    // Jump the clock without running intervals, as a suspended page would.
    act(() => {
      vi.setSystemTime(Date.now() + 6000)
      vi.advanceTimersByTime(250)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('resumes where it paused instead of starting over', () => {
    render(<BreathPacer name="Test breath" phases={PHASES} rounds={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    act(() => vi.advanceTimersByTime(3000))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => vi.advanceTimersByTime(10_000)) // time passes while paused
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('status')).toHaveTextContent('round 2 of 3')
  })
})
