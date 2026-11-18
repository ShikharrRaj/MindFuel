/**
 * useAmbientSound — one calming-sound player for the whole app, so music
 * started from the welcome prompt, the header or the Focus tab keeps playing
 * across tabs, and only one sound ever plays at a time. The chosen sound and
 * volume are remembered on the device (never sent anywhere), so the next
 * visit can offer the same sound again.
 *
 * Browsers only allow audio to start from a tap, so nothing plays until the
 * student picks a sound.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  audioSupported,
  type Soundscape,
  startSoundscape,
} from '../device/soundscape'
import {
  type AmbientPrefs,
  DEFAULT_AMBIENT,
  DEFAULT_SOUND,
  type SoundId,
} from '../lib/sounds'
import { isAppStorageEvent, loadAmbient, saveAmbient } from '../lib/storage'

export interface AmbientPlayer {
  supported: boolean
  /** The sound playing now, if any. */
  playing: SoundId | null
  /** Music was started at some point during this visit. */
  played: boolean
  prefs: AmbientPrefs
  play: (id: SoundId) => void
  /** The default (or last chosen) music, faded in slowly (see App). */
  playDefault: () => void
  stop: () => void
  /** Play `id`, or stop it if it is already playing. */
  toggle: (id: SoundId) => void
  setVolume: (volume: number) => void
  setAsk: (ask: boolean) => void
  setAutoplay: (autoplay: boolean) => void
  /** Pause or resume the page's gentle motion (WCAG 2.2.2). */
  setMotion: (motion: boolean) => void
  /** Show or hide the scene that goes with the music. */
  setScenery: (scenery: boolean) => void
  /** Forget preferences after "Delete my data" (playback continues). */
  reset: () => void
}

export function useAmbientSound(): AmbientPlayer {
  const [supported] = useState(audioSupported)
  const [prefs, setPrefs] = useState<AmbientPrefs>(() => loadAmbient())
  const [playing, setPlaying] = useState<SoundId | null>(null)
  const [played, setPlayed] = useState(false)
  const current = useRef<Soundscape | null>(null)
  const prefsRef = useRef(prefs)
  useEffect(() => {
    prefsRef.current = prefs
  })

  // Saved from the actions (not an effect), so "Delete my data" never has the
  // key written straight back.
  const update = useCallback((patch: Partial<AmbientPrefs>) => {
    const next = { ...prefsRef.current, ...patch }
    prefsRef.current = next
    setPrefs(next)
    saveAmbient(next)
  }, [])

  const stop = useCallback(() => {
    current.current?.stop()
    current.current = null
    setPlaying(null)
  }, [])

  const start = useCallback(
    (id: SoundId, fadeIn: number) => {
      current.current?.stop()
      current.current = startSoundscape(id, prefsRef.current.volume, fadeIn)
      setPlaying(current.current ? id : null)
      if (current.current) {
        setPlayed(true)
        update({ last: id })
      }
    },
    [update],
  )
  const play = useCallback((id: SoundId) => start(id, 1.5), [start])
  const playDefault = useCallback(
    () => start(prefsRef.current.last ?? DEFAULT_SOUND, 4),
    [start],
  )

  const toggle = useCallback(
    (id: SoundId) => {
      if (playing === id) stop()
      else play(id)
    },
    [playing, play, stop],
  )

  const setVolume = useCallback(
    (volume: number) => {
      current.current?.setVolume(volume)
      update({ volume })
    },
    [update],
  )

  const setAsk = useCallback((ask: boolean) => update({ ask }), [update])
  const setAutoplay = useCallback(
    (autoplay: boolean) => update({ autoplay }),
    [update],
  )
  const setMotion = useCallback(
    (motion: boolean) => update({ motion }),
    [update],
  )
  const setScenery = useCallback(
    (scenery: boolean) => update({ scenery }),
    [update],
  )

  const reset = useCallback(() => {
    prefsRef.current = { ...DEFAULT_AMBIENT }
    setPrefs({ ...DEFAULT_AMBIENT })
  }, [])

  // Another tab changed or cleared the preferences: follow it.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!isAppStorageEvent(e)) return
      const next = loadAmbient()
      // Keep what is heard in step with the slider.
      if (next.volume !== prefsRef.current.volume) {
        current.current?.setVolume(next.volume)
      }
      prefsRef.current = next
      setPrefs(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Fade out and release the audio when the app goes away.
  useEffect(() => () => current.current?.stop(), [])

  return {
    supported,
    playing,
    played,
    prefs,
    play,
    playDefault,
    stop,
    toggle,
    setVolume,
    setAsk,
    setAutoplay,
    setMotion,
    setScenery,
    reset,
  }
}
