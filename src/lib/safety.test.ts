import { describe, expect, it } from 'vitest'
import { detectCrisis, HELPLINES } from './safety'

describe('detectCrisis', () => {
  it('flags explicit self-harm language', () => {
    expect(detectCrisis('I want to kill myself').isCrisis).toBe(true)
    expect(detectCrisis("I can't go on like this").isCrisis).toBe(true)
    expect(detectCrisis('thinking about suicide').isCrisis).toBe(true)
    expect(detectCrisis('I feel like ending it all').isCrisis).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(detectCrisis('I WANT TO DIE').isCrisis).toBe(true)
  })

  it('does not false-positive on ordinary exam-stress text', () => {
    expect(detectCrisis('I studied all day and feel exhausted').isCrisis).toBe(
      false,
    )
    expect(detectCrisis('My diet has been terrible this week').isCrisis).toBe(
      false,
    )
    expect(
      detectCrisis('This physics chapter is killing my motivation').isCrisis,
    ).toBe(false)
  })

  it('returns the matched fragment for explainability', () => {
    const result = detectCrisis('honestly I want to die')
    expect(result.matches.length).toBeGreaterThan(0)
  })
})

describe('HELPLINES', () => {
  it('provides actionable tel links for each helpline', () => {
    expect(HELPLINES.length).toBeGreaterThan(0)
    for (const line of HELPLINES) {
      expect(line.href.startsWith('tel:')).toBe(true)
      expect(line.contact).toBeTruthy()
    }
  })
})
