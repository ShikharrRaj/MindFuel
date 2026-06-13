import { describe, expect, it } from 'vitest'
import { recommendExercise, roundDuration, TECHNIQUES } from './exercises'

describe('recommendExercise', () => {
  it('chooses grounding when mood is very low', () => {
    const rec = recommendExercise({
      mood: 1,
      severity: 'elevated',
      signals: [],
    })
    expect(rec.technique.id).toBe('grounding-54321')
  })

  it('chooses grounding on overwhelm signals even at neutral mood', () => {
    const rec = recommendExercise({
      mood: 3,
      severity: 'ok',
      signals: ['Racing thoughts', 'distracted'],
    })
    expect(rec.technique.id).toBe('grounding-54321')
  })

  it('chooses 4-7-8 when sleep is a problem', () => {
    const rec = recommendExercise({
      mood: 3,
      severity: 'ok',
      signals: ['low sleep'],
    })
    expect(rec.technique.id).toBe('four-seven-eight')
  })

  it('chooses 4-7-8 in wind-down phases regardless of signals', () => {
    const rec = recommendExercise({
      mood: 4,
      severity: 'ok',
      signals: [],
      phase: 'exam-day',
    })
    expect(rec.technique.id).toBe('four-seven-eight')
  })

  it('defaults to box breathing for a steady day', () => {
    const rec = recommendExercise({
      mood: 4,
      severity: 'ok',
      signals: ['revision'],
    })
    expect(rec.technique.id).toBe('box-breathing')
  })

  it('always returns a student-facing reason', () => {
    const rec = recommendExercise({ mood: 3, severity: 'ok', signals: [] })
    expect(rec.reason.length).toBeGreaterThan(10)
  })
})

describe('roundDuration', () => {
  it('sums the phase seconds for a breathing technique', () => {
    expect(roundDuration(TECHNIQUES['box-breathing'])).toBe(16)
    expect(roundDuration(TECHNIQUES['four-seven-eight'])).toBe(19)
  })
})
