import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AMBIENT,
  DEFAULT_SCENE,
  DEFAULT_SOUND,
  isSoundId,
  normalizeAmbient,
  SOUNDS,
  soundInfo,
} from './sounds'

describe('sounds', () => {
  it('gives every sound its own scene; the default sound’s is the park', () => {
    expect(new Set(SOUNDS.map((s) => s.scene)).size).toBe(SOUNDS.length)
    expect(soundInfo(DEFAULT_SOUND).scene).toBe(DEFAULT_SCENE)
    expect(SOUNDS.every((s) => s.sceneLabel.length > 0)).toBe(true)
  })

  it('has unique ids, each with a label and a purpose', () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length)
    for (const s of SOUNDS) {
      expect(isSoundId(s.id)).toBe(true)
      expect(s.label && s.purpose).toBeTruthy()
    }
  })

  it('falls back to defaults for missing or corrupt preferences', () => {
    expect(normalizeAmbient(null)).toEqual(DEFAULT_AMBIENT)
    expect(normalizeAmbient('nope')).toEqual(DEFAULT_AMBIENT)
    expect(
      normalizeAmbient({ last: 'disco', volume: 'loud', ask: 'yes' }),
    ).toEqual(DEFAULT_AMBIENT)
  })

  it('keeps valid preferences and clamps the volume', () => {
    expect(normalizeAmbient({ last: 'rain', volume: 3, ask: false })).toEqual({
      last: 'rain',
      volume: 1,
      autoplay: true,
      ask: false,
      motion: true,
      scenery: true,
    })
    expect(normalizeAmbient({ volume: -1 }).volume).toBe(0)
  })
})
