import { describe, expect, it } from 'vitest'
import {
  countdownLabel,
  daysUntil,
  guidanceForDays,
  phaseForDays,
} from './exams'

describe('daysUntil', () => {
  const now = new Date('2026-06-13T09:00:00')

  it('counts whole days to a future exam', () => {
    expect(daysUntil('2026-06-22', now)).toBe(9)
  })

  it('returns 0 on the exam day regardless of time of day', () => {
    expect(daysUntil('2026-06-13', now)).toBe(0)
  })

  it('returns negative for a past exam', () => {
    expect(daysUntil('2026-06-10', now)).toBe(-3)
  })
})

describe('phaseForDays', () => {
  it('maps each band to the right phase', () => {
    expect(phaseForDays(200)).toBe('foundation')
    expect(phaseForDays(60)).toBe('momentum')
    expect(phaseForDays(20)).toBe('consolidation')
    expect(phaseForDays(5)).toBe('final-sprint')
    expect(phaseForDays(0)).toBe('exam-day')
    expect(phaseForDays(-2)).toBe('post-exam')
  })

  it('uses inclusive upper boundaries', () => {
    expect(phaseForDays(7)).toBe('final-sprint')
    expect(phaseForDays(30)).toBe('consolidation')
    expect(phaseForDays(90)).toBe('momentum')
  })
})

describe('guidanceForDays', () => {
  it('returns a prompt hint matching the phase', () => {
    const g = guidanceForDays(3)
    expect(g.phase).toBe('final-sprint')
    expect(g.promptHint.toLowerCase()).toContain('sleep')
  })
})

describe('countdownLabel', () => {
  it('renders human-friendly countdowns', () => {
    expect(countdownLabel(0)).toBe('Exam day')
    expect(countdownLabel(1)).toBe('1 day to go')
    expect(countdownLabel(9)).toBe('9 days to go')
    expect(countdownLabel(-1)).toBe('Exam was yesterday')
    expect(countdownLabel(-4)).toBe('Exam was 4 days ago')
  })
})
