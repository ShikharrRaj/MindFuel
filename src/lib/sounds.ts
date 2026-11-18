/**
 * Calming sounds — the catalogue of background sounds, the animated scene
 * that goes with each, and the student's remembered ambience preferences
 * (music, scenery, and whether the page may move). Pure data and validation
 * only: the audio is synthesised in device/soundscape and the scenes are
 * drawn in the browser (components/scenes), so nothing is downloaded.
 */

export type SoundId =
  | 'lake'
  | 'keys'
  | 'rain'
  | 'waves'
  | 'tanpura'
  | 'brown-noise'

/** The gently animated background for each sound (the park goes with the
 *  default sound, and also shows while nothing plays). */
export type SceneId = 'park' | 'valley' | 'rain' | 'ocean' | 'twilight' | 'mist'

/** Shown while no music is playing (the default sound's scene). */
export const DEFAULT_SCENE: SceneId = 'park'

export interface SoundInfo {
  id: SoundId
  label: string
  purpose: string
  scene: SceneId
  /** e.g. "Valley of flowers". */
  sceneLabel: string
}

export const SOUNDS: SoundInfo[] = [
  {
    id: 'lake',
    label: 'Sunset lake',
    purpose:
      'Warm, slow harp-like notes over lapping water, with the odd distant bird.',
    scene: 'park',
    sceneLabel: 'Sunset by the lake',
  },
  {
    id: 'keys',
    label: 'Gentle keys',
    purpose: 'Slow, soft piano-like notes that never repeat the same way.',
    scene: 'valley',
    sceneLabel: 'Valley of flowers',
  },
  {
    id: 'rain',
    label: 'Rain',
    purpose: 'Soft, steady rain for focus.',
    scene: 'rain',
    sceneLabel: 'Rain over the hills',
  },
  {
    id: 'waves',
    label: 'Ocean waves',
    purpose: 'Waves rolling in and out, about one every ten seconds.',
    scene: 'ocean',
    sceneLabel: 'A quiet shore',
  },
  {
    id: 'tanpura',
    label: 'Tanpura drone',
    purpose: 'A slow, warm drone for winding down.',
    scene: 'twilight',
    sceneLabel: 'Twilight lake',
  },
  {
    id: 'brown-noise',
    label: 'Brown noise',
    purpose: 'A deep, even hum that masks distracting sounds.',
    scene: 'mist',
    sceneLabel: 'Misty pines',
  },
]

/** What plays by default (and what the welcome prompt offers first). */
export const DEFAULT_SOUND: SoundId = 'lake'

export function isSoundId(value: unknown): value is SoundId {
  return SOUNDS.some((s) => s.id === value)
}

export function soundLabel(id: SoundId): string {
  return SOUNDS.find((s) => s.id === id)?.label ?? id
}

export function soundInfo(id: SoundId): SoundInfo {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0]
}

/** Remembered on the device, so the next visit can offer the same sound. */
export interface AmbientPrefs {
  /** The sound the student last chose to play. */
  last: SoundId | null
  /** 0 to 1. */
  volume: number
  /** Start soft music at the first tap or key press when MindFuel opens. */
  autoplay: boolean
  /** With autoplay off: offer music each time MindFuel opens. */
  ask: boolean
  /** Let the background, breathing circle and music bars move. */
  motion: boolean
  /** Show the calming scene behind the page (the music's, or the park). */
  scenery: boolean
}

export const DEFAULT_AMBIENT: AmbientPrefs = {
  last: null,
  volume: 0.4,
  autoplay: true,
  ask: true,
  motion: true,
  scenery: true,
}

export function normalizeAmbient(raw: unknown): AmbientPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AMBIENT }
  const p = raw as Record<string, unknown>
  const volume =
    typeof p.volume === 'number' && Number.isFinite(p.volume)
      ? Math.min(1, Math.max(0, p.volume))
      : DEFAULT_AMBIENT.volume
  return {
    last: isSoundId(p.last) ? p.last : null,
    volume,
    autoplay:
      typeof p.autoplay === 'boolean' ? p.autoplay : DEFAULT_AMBIENT.autoplay,
    ask: typeof p.ask === 'boolean' ? p.ask : DEFAULT_AMBIENT.ask,
    motion: typeof p.motion === 'boolean' ? p.motion : DEFAULT_AMBIENT.motion,
    scenery:
      typeof p.scenery === 'boolean' ? p.scenery : DEFAULT_AMBIENT.scenery,
  }
}
