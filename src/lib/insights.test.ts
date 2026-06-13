import { describe, expect, it } from 'vitest'
import {
  averageMood,
  currentStreak,
  isMeaningfulTrigger,
  moodSeries,
  moodTrend,
  summarizeRecentMood,
  tagMoodImpact,
  topTriggers,
} from './insights'
import type { Analysis, JournalEntry, MoodLevel } from './types'

/** Build a complete, type-safe Analysis fixture from just the triggers. */
function analysisWith(triggers: string[]): Analysis {
  return {
    triggers,
    themes: [],
    tone: 'neutral',
    summary: 'summary',
    copingStrategy: { title: 'strategy', steps: ['step'] },
    encouragement: 'you’ve got this',
    reasoning: 'reasoning',
    severity: 'ok',
  }
}

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
        analysis: analysisWith(['Mock test', 'sleep']),
      }),
      entry({
        createdAtISO: '2026-06-02T10:00:00Z',
        mood: 3,
        analysis: analysisWith(['mock test']),
      }),
    ]
    const result = topTriggers(entries)
    expect(result[0]).toEqual({ trigger: 'mock test', count: 2 })
    expect(result.find((t) => t.trigger === 'sleep')?.count).toBe(1)
  })

  it('ignores entries without analysis', () => {
    expect(
      topTriggers([entry({ createdAtISO: '2026-06-01', mood: 3 })]),
    ).toEqual([])
  })

  it('filters out placeholder / non-triggers the model may emit', () => {
    const entries = [
      entry({
        createdAtISO: '2026-06-01T10:00:00Z',
        mood: 2,
        analysis: analysisWith(['None', 'Unspecified sadness', 'low sleep']),
      }),
    ]
    const result = topTriggers(entries)
    expect(result).toEqual([{ trigger: 'low sleep', count: 1 }])
  })
})

describe('isMeaningfulTrigger', () => {
  it('accepts real triggers and rejects placeholders', () => {
    expect(isMeaningfulTrigger('mock test')).toBe(true)
    expect(isMeaningfulTrigger('None')).toBe(false)
    expect(isMeaningfulTrigger('N/A')).toBe(false)
    expect(isMeaningfulTrigger('Unspecified positive experience')).toBe(false)
    expect(isMeaningfulTrigger('   ')).toBe(false)
  })
})

describe('moodSeries', () => {
  const entries = [
    entry({ createdAtISO: '2026-06-01T09:00:00Z', mood: 2 }),
    entry({ createdAtISO: '2026-06-01T18:00:00Z', mood: 4 }),
    entry({ createdAtISO: '2026-07-02T09:00:00Z', mood: 5 }),
  ]

  it('per-entry granularity keeps every check-in as its own point', () => {
    const series = moodSeries(entries, 'entry')
    expect(series).toHaveLength(3)
    expect(series.map((p) => p.mood)).toEqual([2, 4, 5])
    expect(series.every((p) => p.count === 1)).toBe(true)
  })

  it('daily granularity averages same-day check-ins', () => {
    const series = moodSeries(entries, 'daily')
    expect(series).toHaveLength(2)
    expect(series[0]).toMatchObject({ key: '2026-06-01', mood: 3, count: 2 })
  })

  it('monthly granularity groups by month', () => {
    const series = moodSeries(entries, 'monthly')
    expect(series.map((p) => p.key)).toEqual(['2026-06', '2026-07'])
    expect(series[0]).toMatchObject({ mood: 3, count: 2 })
  })

  it('returns points sorted oldest to newest', () => {
    const series = moodSeries(entries, 'entry')
    const keys = series.map((p) => p.key)
    expect([...keys].sort()).toEqual(keys)
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
