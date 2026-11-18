import { describe, expect, it } from 'vitest'
import { ACTIVITIES, CALM_STATES } from './activities'
import {
  type CalmAnswers,
  type CalmContext,
  type CalmSession,
  calmWins,
  copingCard,
  DEFAULT_PREFS,
  effectiveness,
  entryNeedsHelp,
  normalizePrefs,
  normalizeSessions,
  ratingNeedsHelp,
  sessionDrop,
  intensityBand,
  intensityFromMood,
  prefillFromEntry,
  recommendActivities,
  signalsToStates,
} from './calm'

const NOW = new Date('2026-11-09T18:00:00Z')
const HOURS = (h: number) =>
  new Date(NOW.getTime() - h * 3_600_000).toISOString()

function ctx(overrides: Partial<CalmContext> = {}): CalmContext {
  return { sessions: [], prefs: DEFAULT_PREFS, now: NOW, ...overrides }
}

function answers(overrides: Partial<CalmAnswers> = {}): CalmAnswers {
  return { states: [], intensity: 5, minutes: 5, ...overrides }
}

function session(
  activityId: string,
  before: number | undefined,
  after: number | undefined,
  hoursAgo = 48,
  extra: Partial<CalmSession> = {},
): CalmSession {
  return {
    id: `${activityId}-${hoursAgo}-${before}`,
    activityId,
    atISO: HOURS(hoursAgo),
    states: ['panic'],
    before,
    after,
    source: 'calm',
    ...extra,
  }
}

describe('recommendActivities', () => {
  it('puts the body first when distress is high', () => {
    for (const { id } of CALM_STATES) {
      const rec = recommendActivities(
        answers({ states: [id], intensity: 8, minutes: 15 }),
        ctx(),
      )
      expect(rec.primary.mode, id).toBe('body')
    }
  })

  it('never suggests breath-hold techniques during panic', () => {
    const rec = recommendActivities(
      answers({ states: ['panic'], intensity: 5 }),
      ctx(),
    )
    for (const a of [rec.primary, ...rec.alternates]) {
      expect(a.avoidInPanic, a.id).toBeFalsy()
    }
  })

  it('only suggests discreet activities in the exam hall / library', () => {
    const rec = recommendActivities(
      answers({
        states: ['irritable'],
        intensity: 8,
        minutes: 15,
        setting: 'silent',
      }),
      ctx(),
    )
    for (const a of [rec.primary, ...rec.alternates]) {
      expect(a.discreet, a.id).toBe(true)
      expect(a.settings).toContain('silent')
    }
    expect(rec.reason).toMatch(/silent/i)
  })

  it('respects the time available', () => {
    const rec = recommendActivities(
      answers({ states: ['overwhelmed'], minutes: 1 }),
      ctx(),
    )
    for (const a of [rec.primary, ...rec.alternates]) {
      expect(a.minutes).toBeLessThanOrEqual(1)
    }
  })

  it('suits sleep problems when that is what is picked', () => {
    const rec = recommendActivities(
      answers({ states: ['cant-sleep'], setting: 'bed' }),
      ctx(),
    )
    expect(rec.primary.states).toContain('cant-sleep')
    expect(rec.primary.settings).toContain('bed')
  })

  it('favours phase-appropriate activities close to the exam', () => {
    const rec = recommendActivities(
      answers({ states: ['future-fear'] }),
      ctx({ phase: 'exam-day' }),
    )
    expect(rec.primary.phases).toContain('exam-day')
    expect(rec.reason).toMatch(/exam this close/i)
  })

  it('leans on thinking tools when distress is low', () => {
    const rec = recommendActivities(
      answers({ states: ['comparison'], intensity: 2, minutes: 15 }),
      ctx(),
    )
    expect(rec.primary.mode).toBe('mind')
  })

  it('skips activities marked "not for me"', () => {
    const rec = recommendActivities(
      answers({ states: ['panic'], intensity: 8, minutes: 1 }),
      ctx({ prefs: { ...DEFAULT_PREFS, notForMe: ['physiological-sigh'] } }),
    )
    expect(rec.primary.id).not.toBe('physiological-sigh')
    expect(rec.alternates.map((a) => a.id)).not.toContain('physiological-sigh')
  })

  it('learns from the student’s own before/after ratings', () => {
    const sessions = [
      session('grounding-333', 8, 2, 48),
      session('grounding-333', 8, 2, 72),
      session('grounding-333', 7, 3, 96),
    ]
    const rec = recommendActivities(
      answers({ states: ['panic'], intensity: 8, minutes: 1 }),
      ctx({ sessions }),
    )
    expect(rec.primary.id).toBe('grounding-333')
    expect(rec.reason).toMatch(/helped you before/i)
  })

  it('adds variety by down-ranking something used in the last 24 hours', () => {
    const base = recommendActivities(
      answers({ states: ['panic'], intensity: 8, minutes: 1 }),
      ctx(),
    )
    const rec = recommendActivities(
      answers({ states: ['panic'], intensity: 8, minutes: 1 }),
      ctx({ sessions: [session(base.primary.id, undefined, undefined, 1)] }),
    )
    expect(rec.primary.id).not.toBe(base.primary.id)
  })

  it('chains a thinking tool after a body activity at high distress', () => {
    const rec = recommendActivities(
      answers({ states: ['future-fear'], intensity: 8, minutes: 5 }),
      ctx(),
    )
    expect(rec.primary.mode).toBe('body')
    expect(rec.next?.mode).toBe('mind')
    expect(rec.next!.minutes).toBeLessThanOrEqual(5 - rec.primary.minutes)
    expect(rec.next!.states).toContain('future-fear')
  })

  it('shows helplines at the very top of the scale', () => {
    expect(recommendActivities(answers({ intensity: 9 }), ctx()).showHelp).toBe(
      true,
    )
    expect(recommendActivities(answers({ intensity: 8 }), ctx()).showHelp).toBe(
      false,
    )
  })

  it('always returns something, even when everything is excluded', () => {
    const rec = recommendActivities(
      answers({ states: ['lonely'] }),
      ctx({
        prefs: { ...DEFAULT_PREFS, notForMe: ACTIVITIES.map((a) => a.id) },
      }),
    )
    expect(rec.primary).toBeDefined()
  })

  it('explains the choice in the student’s own terms', () => {
    const rec = recommendActivities(
      answers({ states: ['panic'], intensity: 8, setting: 'silent' }),
      ctx(),
    )
    expect(rec.reason).toMatch(/panic/i)
    expect(rec.reason).toContain('8/10')
    expect(rec.reason).toMatch(/exam hall/i)
    expect(rec.reason).toMatch(/calming your body comes before/i)
  })
})

describe('signals and pre-fill', () => {
  it('maps check-in tags and AI triggers to calm states', () => {
    expect(signalsToStates(['low sleep', 'peer comparison'])).toEqual([
      'cant-sleep',
      'comparison',
    ])
    expect(
      signalsToStates([
        'Mock test score drop',
        'parental pressure regarding ranks',
      ]),
    ).toEqual(['bad-mock', 'family-pressure'])
    expect(signalsToStates(['revision'])).toEqual([])
  })

  it('turns a lower mood into a higher starting rating', () => {
    const ratings = [1, 2, 3, 4, 5].map(intensityFromMood)
    expect(ratings[0]).toBeGreaterThanOrEqual(7)
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeLessThan(ratings[i - 1])
    }
  })

  it('pre-fills only from a check-in in the last 24 hours', () => {
    const entry = {
      createdAtISO: HOURS(2),
      mood: 2 as const,
      tags: ['low sleep'],
    }
    expect(prefillFromEntry(entry, NOW)).toEqual({
      states: ['cant-sleep'],
      intensity: intensityFromMood(2),
    })
    expect(
      prefillFromEntry({ ...entry, createdAtISO: HOURS(30) }, NOW),
    ).toBeNull()
    expect(prefillFromEntry(null, NOW)).toBeNull()
  })

  it('bands intensity', () => {
    expect(intensityBand(8)).toBe('high')
    expect(intensityBand(5)).toBe('mid')
    expect(intensityBand(2)).toBe('low')
  })
})

describe('learning summaries', () => {
  it('shrinks effectiveness toward a neutral prior when data is thin', () => {
    expect(effectiveness([], 'box-breathing').meanDrop).toBe(1.5)
    const notReally = session('box-breathing', undefined, undefined, 48, {
      outcome: 'not-really',
    })
    expect(effectiveness([notReally], 'box-breathing').meanDrop).toBeLessThan(
      1.5,
    )
  })

  it('builds a coping card from activities that worked at least twice', () => {
    const rows = copingCard([
      session('grounding-333', 8, 3),
      session('grounding-333', 7, 3),
      session('palm-press', 8, 1), // only once: not enough evidence yet
    ])
    expect(rows).toEqual([
      { state: 'panic', activityId: 'grounding-333', meanDrop: 4.5, uses: 2 },
    ])
  })

  it('counts this month’s wins and the biggest drop', () => {
    const wins = calmWins(
      [
        session('grounding-333', 8, 4, 24),
        session('palm-press', 9, 3, 48),
        session('box-breathing', 5, 4, 48), // drop of 1: not a win
        session('grounding-333', 9, 1, 24 * 40), // older than 30 days
      ],
      NOW,
    )
    expect(wins).toEqual({ count: 2, best: { before: 9, after: 3 } })
  })
})

describe('safety gates', () => {
  it('flags a recent check-in that was marked as crisis', () => {
    const base = { createdAtISO: HOURS(3), text: 'rough day' }
    expect(entryNeedsHelp(base, NOW)).toBe(false)
    expect(entryNeedsHelp({ ...base, text: 'I want to die' }, NOW)).toBe(true)
    expect(
      entryNeedsHelp(
        { ...base, analysis: { severity: 'crisis' } as never },
        NOW,
      ),
    ).toBe(true)
    expect(
      entryNeedsHelp({ createdAtISO: HOURS(30), text: 'I want to die' }, NOW),
    ).toBe(false)
    // Corrupted storage must not throw.
    expect(() =>
      entryNeedsHelp({ createdAtISO: 'garbage' } as never, NOW),
    ).not.toThrow()
  })

  it('asks for help at the top of the scale or when distress rises', () => {
    expect(ratingNeedsHelp(9)).toBe(true)
    expect(ratingNeedsHelp(5, 9)).toBe(true)
    expect(ratingNeedsHelp(5, 7)).toBe(true)
    expect(ratingNeedsHelp(8, 7)).toBe(false)
    expect(ratingNeedsHelp(5, 5)).toBe(false)
    expect(ratingNeedsHelp(undefined, undefined)).toBe(false)
  })
})

describe('learning signals', () => {
  it('treats unrated outcomes symmetrically and ignores contradictions', () => {
    const s = (extra: Partial<CalmSession>) =>
      session('x', undefined, undefined, 48, extra)
    expect(sessionDrop(s({ outcome: 'helped' }))).toBeGreaterThan(1.5)
    expect(sessionDrop(s({ outcome: 'not-really' }))).toBe(0)
    expect(
      sessionDrop(session('x', 5, 5, 48, { outcome: 'helped' })),
    ).toBeNull()
    expect(sessionDrop(session('x', 8, 3))).toBe(5)
  })

  it('shows the raw average to the student', () => {
    const rec = recommendActivities(
      answers({ states: ['panic'], intensity: 8, minutes: 1 }),
      ctx({
        sessions: [
          session('grounding-333', 8, 4, 48),
          session('grounding-333', 8, 4, 72),
        ],
      }),
    )
    expect(rec.primary.id).toBe('grounding-333')
    expect(rec.reason).toMatch(/about 4 points/)
  })
})

describe('stored data', () => {
  it('drops malformed sessions instead of crashing later', () => {
    const good = session('box-breathing', 6, 3)
    const out = normalizeSessions([
      good,
      { id: 'no-states', activityId: 'x', atISO: HOURS(1), source: 'calm' },
      { ...good, id: 'bad-rating', before: 99, source: 'calm' },
      'nonsense',
      null,
    ])
    expect(out.map((s) => s.id)).toEqual([good.id, 'bad-rating'])
    expect(out[1].before).toBeUndefined()
    expect(normalizeSessions('nope')).toEqual([])
  })

  it('validates preferences', () => {
    expect(
      normalizePrefs({ notForMe: ['a', 3], setting: 'moon', haptics: 'yes' }),
    ).toEqual({ notForMe: ['a'], setting: undefined, haptics: true })
  })
})
