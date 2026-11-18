import { describe, expect, it } from 'vitest'
import { greetingFor, partOfDay } from './greeting'

const at = (hour: number, day = 16) => new Date(2026, 10, day, hour, 30)

describe('greeting', () => {
  it.each([
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [21, 'evening'],
    [22, 'late'],
    [2, 'late'],
  ])('%i:30 is %s', (hour, part) => {
    expect(partOfDay(at(hour))).toBe(part)
  })

  it('greets by name, or warmly without one', () => {
    expect(greetingFor(at(9), 'Asha').title).toBe('Good morning, Asha')
    expect(greetingFor(at(19)).title).toBe('Good evening')
    expect(greetingFor(at(19), '  ').title).toBe('Good evening')
  })

  it('is gentle late at night instead of cheering the student on', () => {
    const g = greetingFor(at(1), 'Ravi')
    expect(g.title).toBe('Still awake, Ravi?')
    expect(g.line).toMatch(/sleep|tonight|morning/i)
  })

  it('keeps the same line all day and changes it day to day', () => {
    expect(greetingFor(at(8)).line).toBe(greetingFor(at(11)).line)
    const lines = new Set([16, 17, 18].map((d) => greetingFor(at(8, d)).line))
    expect(lines.size).toBe(3)
  })
})
