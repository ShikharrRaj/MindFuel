import { describe, expect, it } from 'vitest'
import {
  BLOCKS_PER_LONG_BREAK,
  FOCUS_PRESETS,
  formatClock,
  nextPhase,
  phaseSeconds,
  shouldNudgeLongBreak,
} from './focus'
import { EXAM_HALL_STEPS, PANIC_EXPLAINER, PARENT_GUIDE } from './guides'
import { promptsFor } from './journalPrompts'
import { LESSONS, lessonForDate } from './lessons'
import { EMPTY_SAFETY_PLAN, isPlanEmpty, normalizePlan } from './safetyPlan'

describe('lessons', () => {
  it('gives the same lesson all day and a different one the next day', () => {
    const morning = new Date(2026, 10, 9, 8)
    const night = new Date(2026, 10, 9, 23)
    const tomorrow = new Date(2026, 10, 10, 8)
    expect(lessonForDate(morning).id).toBe(lessonForDate(night).id)
    expect(lessonForDate(tomorrow).id).not.toBe(lessonForDate(morning).id)
  })

  it('cycles through every lesson with the offset', () => {
    const day = new Date(2026, 10, 9)
    const seen = new Set(LESSONS.map((_, i) => lessonForDate(day, i).id))
    expect(seen.size).toBe(LESSONS.length)
  })
})

describe('journal prompts', () => {
  it('puts tag-specific prompts first, then the prep phase', () => {
    const prompts = promptsFor({
      tags: ['mock test'],
      phase: 'final-sprint',
      seed: 0,
    })
    expect(prompts).toHaveLength(3)
    expect(prompts[0]).toMatch(/mock/i)
    expect(prompts[1]).toMatch(/rest/i)
    expect(new Set(prompts).size).toBe(3)
  })

  it('falls back to general prompts', () => {
    expect(promptsFor({ tags: [], seed: 3 })).toHaveLength(3)
  })
})

describe('focus coach rules', () => {
  const preset = FOCUS_PRESETS[0]

  it('alternates focus and breaks, with a long break every few blocks', () => {
    expect(nextPhase('focus', 1)).toBe('break')
    expect(nextPhase('focus', BLOCKS_PER_LONG_BREAK)).toBe('long-break')
    expect(nextPhase('break', 1)).toBe('focus')
    expect(nextPhase('long-break', 4)).toBe('focus')
  })

  it('sizes phases from the preset', () => {
    expect(phaseSeconds('focus', preset)).toBe(25 * 60)
    expect(phaseSeconds('break', preset)).toBe(5 * 60)
    expect(phaseSeconds('long-break', preset)).toBe(15 * 60)
  })

  it('nudges after three hours without a long break', () => {
    expect(shouldNudgeLongBreak(175)).toBe(false)
    expect(shouldNudgeLongBreak(180)).toBe(true)
  })

  it('formats the clock', () => {
    expect(formatClock(1500)).toBe('25:00')
    expect(formatClock(61)).toBe('01:01')
    expect(formatClock(-5)).toBe('00:00')
  })
})

describe('safety plan', () => {
  it('normalises stored data defensively', () => {
    expect(normalizePlan(null)).toEqual(EMPTY_SAFETY_PLAN)
    const plan = normalizePlan({
      coping: ['walk', '', 42, '  '],
      people: 'not a list',
      updatedAtISO: '2026-11-09T00:00:00Z',
    })
    expect(plan.coping).toEqual(['walk'])
    expect(plan.people).toEqual([])
    expect(plan.updatedAtISO).toBe('2026-11-09T00:00:00Z')
  })

  it('knows when a plan is empty', () => {
    expect(isPlanEmpty(EMPTY_SAFETY_PLAN)).toBe(true)
    expect(isPlanEmpty({ ...EMPTY_SAFETY_PLAN, reasons: ['my sister'] })).toBe(
      false,
    )
  })
})

describe('static guides', () => {
  it('ship non-empty content', () => {
    expect(EXAM_HALL_STEPS).toHaveLength(3)
    expect(PANIC_EXPLAINER.every((s) => s.points.length > 0)).toBe(true)
    expect(PARENT_GUIDE.some((s) => /warning signs/i.test(s.heading))).toBe(
      true,
    )
  })
})
