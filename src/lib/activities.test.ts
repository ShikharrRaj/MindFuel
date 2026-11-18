import { describe, expect, it } from 'vitest'
import {
  ACTIVITIES,
  breathPosition,
  CALM_STATES,
  getActivity,
  roundSeconds,
} from './activities'

describe('activity catalogue', () => {
  it('has unique ids that resolve via getActivity', () => {
    const ids = ACTIVITIES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(getActivity(id)?.id).toBe(id)
  })

  it('offers at least three activities for every state', () => {
    for (const { id } of CALM_STATES) {
      const count = ACTIVITIES.filter((a) => a.states.includes(id)).length
      expect(count, id).toBeGreaterThanOrEqual(3)
    }
  })

  it('only marks discreet activities as suitable for the exam hall / library', () => {
    for (const a of ACTIVITIES) {
      if (a.settings.includes('silent')) expect(a.discreet, a.id).toBe(true)
    }
  })

  it('has well-formed fields on every activity', () => {
    for (const a of ACTIVITIES) {
      expect(a.settings.length, a.id).toBeGreaterThan(0)
      expect(a.intensity.length, a.id).toBeGreaterThan(0)
      expect(a.states.length, a.id).toBeGreaterThan(0)
      expect([1, 2, 3, 4, 5, 10]).toContain(a.minutes)
      if (a.format.kind === 'breathing') {
        expect(a.format.phases.every((p) => p.seconds > 0)).toBe(true)
      }
    }
  })

  it('flags breath-hold techniques so they are skipped during panic', () => {
    for (const a of ACTIVITIES) {
      const holds =
        a.format.kind === 'breathing' &&
        a.format.phases.some((p) => p.motion === 'hold')
      expect(Boolean(a.avoidInPanic), a.id).toBe(holds)
    }
  })
})

describe('breathPosition', () => {
  const sigh = getActivity('physiological-sigh')!
  const phases = sigh.format.kind === 'breathing' ? sigh.format.phases : []

  it('walks through phases and rounds', () => {
    expect(roundSeconds(phases)).toBe(9)
    expect(breathPosition(phases, 0)).toMatchObject({
      phaseIndex: 0,
      secondsLeft: 2,
      round: 1,
    })
    expect(breathPosition(phases, 2)).toMatchObject({ phaseIndex: 1 })
    expect(breathPosition(phases, 3)).toMatchObject({
      phaseIndex: 2,
      intoPhase: 0,
      secondsLeft: 6,
    })
    expect(breathPosition(phases, 9)).toMatchObject({ phaseIndex: 0, round: 2 })
  })
})
