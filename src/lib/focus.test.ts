import { describe, expect, it } from 'vitest'
import {
  FOCUS_PRESETS,
  focusTitle,
  formatClock,
  nextPhase,
  phaseSeconds,
  timerStatus,
} from './focus'

const base = {
  phase: 'focus' as const,
  left: 1122,
  running: true,
  paused: false,
  awaitingStart: false,
  blocks: 1,
}

describe('focus', () => {
  it('earns a long break every fourth block', () => {
    expect(nextPhase('focus', 1)).toBe('break')
    expect(nextPhase('focus', 4)).toBe('long-break')
    expect(nextPhase('break', 4)).toBe('focus')
    expect(phaseSeconds('long-break', FOCUS_PRESETS[0])).toBe(15 * 60)
    expect(formatClock(65)).toBe('01:05')
  })

  it('shows the countdown in the tab title', () => {
    expect(focusTitle(base)).toBe('18:42 · Focus · MindFuel')
    expect(focusTitle({ ...base, running: false, paused: true })).toBe(
      'Paused 18:42 · Focus · MindFuel',
    )
    expect(
      focusTitle({
        ...base,
        phase: 'break',
        running: false,
        awaitingStart: true,
      }),
    ).toBe('Ready for block 2 · MindFuel')
  })

  it('labels the floating timer by state', () => {
    expect(timerStatus(base)).toBe('Focus')
    expect(
      timerStatus({ ...base, phase: 'break', running: false, paused: true }),
    ).toBe('Short break · paused')
    expect(timerStatus({ ...base, running: false, awaitingStart: true })).toBe(
      'Ready for block 2',
    )
  })
})
