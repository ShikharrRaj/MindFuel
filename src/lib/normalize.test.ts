import { describe, expect, it } from 'vitest'
import { normalizeEntries, normalizeProfile } from './normalize'

describe('stored-data validators', () => {
  it('accepts a valid profile and rejects a broken one', () => {
    expect(
      normalizeProfile({
        exam: 'NEET',
        examDateISO: '2027-05-02',
        name: ' Asha ',
      }),
    ).toEqual({ exam: 'NEET', examDateISO: '2027-05-02', name: 'Asha' })
    expect(normalizeProfile({ exam: 'NEET', examDateISO: 'soon' })).toBeNull()
    expect(
      normalizeProfile({ exam: 'MBA', examDateISO: '2027-05-02' }),
    ).toBeNull()
    expect(normalizeProfile('nope')).toBeNull()
  })

  it('keeps good entries, drops broken ones, and checks stored analyses', () => {
    const ok = {
      id: '1',
      createdAtISO: '2026-11-10T10:00:00.000Z',
      mood: 2,
      text: 'rough day',
      tags: ['mock test', 7],
      analysis: { summary: 'Hard day', severity: 'crisis' },
    }
    const entries = normalizeEntries([
      ok,
      { ...ok, id: '2', mood: 9 },
      { ...ok, id: '3', text: 42 },
      { ...ok, id: '4', createdAtISO: 'yesterday' },
      { ...ok, id: '5', analysis: { tone: 'only a tone' } },
      null,
    ])
    expect(entries.map((e) => e.id)).toEqual(['1', '5'])
    expect(entries[0].tags).toEqual(['mock test'])
    expect(entries[0].analysis?.severity).toBe('crisis')
    expect(entries[1].analysis).toBeUndefined()
    expect(normalizeEntries({ not: 'a list' })).toEqual([])
  })
})
