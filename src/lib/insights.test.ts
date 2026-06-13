import { describe, expect, it } from 'vitest'
import {
  averageMood,
  currentStreak,
  moodTrend,
  summarizeRecentMood,
  tagMoodImpact,
  topTriggers,
} from './insights'
import type { JournalEntry, MoodLevel } from './types'

/** Test helper to build an entry with sensible defaults. */
function entry(
  partial: Partial<JournalEntry> & { createdAtISO: string; mood: MoodLevel },
): JournalEntry {
  return {
    id: partial.id ?? partial.createdAtISO,
    text: partial.text ?? 'note',
    tags: partial.tags ?? [],
    analysis: partial.analysis,
    ...partial,
  }
}

describe('topTriggers', () => {
  it('counts and ranks AI-detected triggers, case-normalised', () => {
    const entries = [
      entry({
        createdAtISO: '2026-06-01T10:00:00Z',
        mood: 2,
        analysis: { triggers: ['Mock test', 'sleep'] } as never,
      }),
      entry({
        createdAtISO: '2026-06-02T10:00:00Z',
        mood: 3,
        analysis: { triggers: ['mock test'] } as never,
      }),
    ]
    const result = topTriggers(entries)
    expect(result[0]).toEqual({ trigger: 'mock test', count: 2 })
    expect(result.find((t) => t.trigger === 'sleep')?.count).toBe(1)
  })

  it('ignores entries without analysis', () => {
    expect(topTriggers([entry({ createdAtISO: '2026-06-01', mood: 3 })])).toEqual(
      [],
    )
  })
})

describe('moodTrend', () => {
  it('averages multiple entries per day and sorts chronologically', () => {
    const entries = [
      entry({ createdAtISO: '2026-06-02T08:00:00Z', mood: 4 }),
      entry({ createdAtISO: '2026-06-01T08:00:00Z', mood: 2 }),
      entry({ createdAtISO: '2026-06-01T20:00:00Z', mood: 4 }),
    ]
    const trend = moodTrend(entries)
    expect(trend).toEqual([
      { date: '2026-06-01', mood: 3 },
      { date: '2026-06-02', mood: 4 },
    ])
  })
})

describe('averageMood', () => {
  it('returns 0 for no entries', () => {
    expect(averageMood([])).toBe(0)
  })
  it('averages mood values', () => {
    const entries = [
      entry({ createdAtISO: '2026-06-01', mood: 2 }),
      entry({ createdAtISO: '2026-06-02', mood: 4 }),
    ]
    expect(averageMood(entries)).toBe(3)
  })
})

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    const now = new Date('2026-06-13T21:00:00')
    const entries = [
      entry({ createdAtISO: '2026-06-11T10:00:00', mood: 3 }),
      entry({ createdAtISO: '2026-06-12T10:00:00', mood: 3 }),
      entry({ createdAtISO: '2026-06-13T10:00:00', mood: 3 }),
    ]
    expect(currentStreak(entries, now)).toBe(3)
  })

  it('still counts a streak ending yesterday (no entry yet today)', () => {
    const now = new Date('2026-06-13T09:00:00')
    const entries = [
      entry({ createdAtISO: '2026-06-11T10:00:00', mood: 3 }),
      entry({ createdAtISO: '2026-06-12T10:00:00', mood: 3 }),
    ]
    expect(currentStreak(entries, now)).toBe(2)
  })

  it('breaks the streak on a gap', () => {
    const now = new Date('2026-06-13T09:00:00')
    const entries = [
      entry({ createdAtISO: '2026-06-10T10:00:00', mood: 3 }),
      entry({ createdAtISO: '2026-06-13T10:00:00', mood: 3 }),
    ]
    expect(currentStreak(entries, now)).toBe(1)
  })
})

describe('tagMoodImpact', () => {
  it('measures mood delta for a tag vs. without it', () => {
    const entries = [
      entry({ createdAtISO: '2026-06-01', mood: 2, tags: ['mock test'] }),
      entry({ createdAtISO: '2026-06-02', mood: 2, tags: ['mock test'] }),
      entry({ createdAtISO: '2026-06-03', mood: 4, tags: [] }),
    ]
    const impact = tagMoodImpact(entries, 'mock test')
    expect(impact).not.toBeNull()
    expect(impact!.withTag).toBe(2)
    expect(impact!.withoutTag).toBe(4)
    expect(impact!.delta).toBe(-2)
  })

  it('returns null without data on both sides', () => {
    const entries = [
      entry({ createdAtISO: '2026-06-01', mood: 2, tags: ['mock test'] }),
    ]
    expect(tagMoodImpact(entries, 'mock test')).toBeNull()
  })
})

describe('summarizeRecentMood', () => {
  it('describes an empty history', () => {
    expect(summarizeRecentMood([])).toBe('no prior check-ins yet')
  })

  it('summarises average and direction', () => {
    const entries = [
      entry({ createdAtISO: '2026-06-01T10:00:00Z', mood: 1 }),
      entry({ createdAtISO: '2026-06-02T10:00:00Z', mood: 5 }),
    ]
    const summary = summarizeRecentMood(entries)
    expect(summary).toContain('/5')
    expect(summary).toContain('trending up')
  })
})
