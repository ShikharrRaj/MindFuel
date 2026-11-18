/**
 * Scenery — the animated background that goes with the music: a starlit
 * meadow for gentle keys, a golden sea for ocean waves, rain on a lake,
 * diyas on a river, a misty dawn (scene per sound in lib/sounds, drawn live
 * by device/scenes). Changing the sound crossfades between scenes; when the
 * music stops the scene fades away.
 *
 * Decorative and lazy-loaded: hidden from screen readers, made on the
 * device (nothing downloads), and still for "Pause motion" or reduced motion.
 */

import { useEffect, useState } from 'react'
import type { SceneId } from '../lib/sounds'
import SceneCanvas from './SceneCanvas'

/** Matches --dur-scene in theme.css. */
const FADE_MS = 1600

interface Props {
  scene: SceneId | null
  /** Draw a single still frame instead of animating. */
  still: boolean
}

export default function Scenery({ scene, still }: Props) {
  const [shown, setShown] = useState(scene)
  const [leaving, setLeaving] = useState<SceneId | null>(null)

  // A new scene: the old one stays to fade out underneath it.
  if (scene !== shown) {
    setLeaving(shown)
    setShown(scene)
  }

  useEffect(() => {
    if (!leaving) return
    const id = setTimeout(() => setLeaving(null), FADE_MS)
    return () => clearTimeout(id)
  }, [leaving])

  const layers = [leaving, shown].filter(
    (id, i, all): id is SceneId => id !== null && all.indexOf(id) === i,
  )

  return (
    <div className="scenery" aria-hidden="true">
      {layers.map((id) => (
        <div
          key={id}
          className={id === shown ? 'scene' : 'scene scene--leaving'}
        >
          <SceneCanvas scene={id} still={still} />
        </div>
      ))}
    </div>
  )
}
