/**
 * useAutoplay — starts the default soft music with the student's first tap
 * or key press, since browsers only allow sound after a gesture. Once per
 * visit, and only while "Play soft music when MindFuel opens" is on; the
 * music fades in slowly. Returns whether it started the music.
 */

import { useEffect, useState } from 'react'
import type { AmbientPlayer } from './useAmbientSound'

export function useAutoplay(ambient: AmbientPlayer): boolean {
  const [started, setStarted] = useState(false)
  const { supported, played, playDefault } = ambient
  const enabled = supported && ambient.prefs.autoplay && !played

  useEffect(() => {
    if (!enabled) return
    function start() {
      playDefault()
      setStarted(true)
    }
    const options = { capture: true, once: true } as const
    window.addEventListener('pointerdown', start, options)
    window.addEventListener('keydown', start, options)
    return () => {
      window.removeEventListener('pointerdown', start, options)
      window.removeEventListener('keydown', start, options)
    }
  }, [enabled, playDefault])

  return started
}
