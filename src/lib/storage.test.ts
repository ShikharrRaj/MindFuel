import { type AmbientPrefs, DEFAULT_AMBIENT } from './sounds'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CalmSession } from './calm'
import {
  AI_CONSENT_VERSION,
  clearAll,
  loadAmbient,
  saveAmbient,
  clearConsent,
  exportBackup,
  importBackup,
  loadCalmPrefs,
  loadCalmSessions,
  loadConsent,
  loadEntries,
  loadProfile,
  loadSafetyPlan,
  MAX_CALM_SESSIONS,
  saveCalmPrefs,
  saveCalmSessions,
  saveConsent,
  saveEntries,
  saveProfile,
  saveSafetyPlan,
} from './storage'
import { EMPTY_SAFETY_PLAN } from './safetyPlan'

function sessions(n: number): CalmSession[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    activityId: 'box-breathing',
    atISO: new Date(2026, 0, 1, 0, i).toISOString(),
    states: [],
    source: 'calm' as const,
  }))
}

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('"Delete my data" removes every key MindFuel wrote', () => {
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    saveEntries([
      {
        id: '1',
        createdAtISO: '2026-11-10T10:00:00.000Z',
        mood: 3,
        text: 'ok',
        tags: [],
      },
    ])
    saveCalmSessions(sessions(2))
    saveCalmPrefs({ notForMe: ['box-breathing'], haptics: false })
    saveSafetyPlan({ ...EMPTY_SAFETY_PLAN, reasons: ['my sister'] })
    saveAmbient({ ...DEFAULT_AMBIENT, last: 'rain', volume: 0.3 })
    expect(localStorage.length).toBeGreaterThanOrEqual(6)

    clearAll()

    const left: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('mindfuel.')) left.push(key)
    }
    expect(left).toEqual([])
  })

  it('remembers the music preferences, validated on the way back', () => {
    const prefs: AmbientPrefs = {
      ...DEFAULT_AMBIENT,
      last: 'waves',
      volume: 0.6,
      ask: false,
      motion: false,
      scenery: false,
    }
    saveAmbient(prefs)
    expect(loadAmbient()).toEqual(prefs)
    localStorage.setItem('mindfuel.ambient.v1', '{"last":"disco"}')
    expect(loadAmbient().last).toBeNull()
  })

  it('keeps only the most recent calm sessions', () => {
    saveCalmSessions(sessions(MAX_CALM_SESSIONS + 10))
    const loaded = loadCalmSessions()
    expect(loaded).toHaveLength(MAX_CALM_SESSIONS)
    expect(loaded[0].id).toBe('10')
  })

  it('stores no entries key for an empty journal, so deleted data stays gone', () => {
    saveEntries([])
    expect(localStorage.getItem('mindfuel.entries.v1')).toBeNull()
  })

  it('fails soft on corrupted data', () => {
    localStorage.setItem('mindfuel.calm-prefs.v1', '{oops')
    localStorage.setItem('mindfuel.safety-plan.v1', '"nope"')
    expect(loadCalmPrefs()).toEqual({ notForMe: [], haptics: true })
    expect(loadSafetyPlan()).toEqual(EMPTY_SAFETY_PLAN)
  })
})

describe('AI consent', () => {
  beforeEach(() => localStorage.clear())

  it('is remembered, versioned, and cleared by "Delete my data"', () => {
    expect(loadConsent()).toBeNull()
    saveConsent(new Date('2026-11-11T09:00:00Z'))
    expect(loadConsent()).toEqual({
      version: AI_CONSENT_VERSION,
      atISO: '2026-11-11T09:00:00.000Z',
    })
    clearAll()
    expect(loadConsent()).toBeNull()
  })

  it('asks again when the consent version changes', () => {
    localStorage.setItem(
      'mindfuel.consent.v1',
      JSON.stringify({ version: AI_CONSENT_VERSION - 1, atISO: 'x' }),
    )
    expect(loadConsent()).toBeNull()
  })

  it('can be withdrawn on its own', () => {
    saveConsent()
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    clearConsent()
    expect(loadConsent()).toBeNull()
    expect(loadProfile()).not.toBeNull()
  })
})

describe('backup', () => {
  beforeEach(() => localStorage.clear())

  const entry = {
    id: 'e1',
    createdAtISO: '2026-11-10T10:00:00.000Z',
    mood: 3 as const,
    text: 'calmer today',
    tags: [],
  }

  it('round-trips everything except consent', () => {
    saveProfile({ exam: 'CAT', examDateISO: '2026-11-29' })
    saveEntries([entry])
    saveSafetyPlan({ ...EMPTY_SAFETY_PLAN, reasons: ['my sister'] })
    saveConsent()
    const file = exportBackup()
    expect(file).not.toContain('mindfuel.consent')

    clearAll()
    expect(importBackup(file)).toEqual({ ok: true, restored: 3 })
    expect(loadProfile()).toEqual({ exam: 'CAT', examDateISO: '2026-11-29' })
    expect(loadEntries()).toEqual([entry])
    expect(loadSafetyPlan().reasons).toEqual(['my sister'])
    expect(loadConsent()).toBeNull()
  })

  it('rejects prototype keys instead of treating them as data', () => {
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    for (const key of ['constructor', '__proto__', 'toString']) {
      const text = `{"app":"mindfuel","version":1,"data":{"${key}":1}}`
      expect(importBackup(text).ok).toBe(false)
    }
    expect(loadProfile()).not.toBeNull()
  })

  it('rejects files that are not MindFuel backups, and writes nothing', () => {
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    const wrap = (data: unknown, extra = {}) =>
      JSON.stringify({ app: 'mindfuel', version: 1, data, ...extra })
    const cases = [
      'not json',
      JSON.stringify({ app: 'other', version: 1, data: {} }),
      wrap({ 'mindfuel.consent.v1': { version: 1, atISO: 'x' } }),
      wrap({ 'evil.key': 'x' }),
      wrap({ 'mindfuel.entries.v1': [entry] }, { version: 99 }),
      wrap({}),
    ]
    for (const text of cases) {
      expect(importBackup(text).ok).toBe(false)
    }
    expect(loadProfile()).toEqual({ exam: 'JEE', examDateISO: '2027-01-22' })
    expect(localStorage.getItem('evil.key')).toBeNull()
  })

  it('validates restored values instead of trusting them', () => {
    const text = JSON.stringify({
      app: 'mindfuel',
      version: 1,
      data: {
        'mindfuel.entries.v1': [entry, { id: 'bad', mood: 'x' }],
        'mindfuel.calm-prefs.v1': 'garbage',
      },
    })
    expect(importBackup(text).ok).toBe(true)
    expect(loadEntries()).toEqual([entry])
    expect(loadCalmPrefs()).toEqual({ notForMe: [], haptics: true })
  })
})
