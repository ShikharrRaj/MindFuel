/**
 * SoundPicker — the list of calming sounds plus a volume slider, driving the
 * one app-wide player. Used by the Focus tab's soundscapes card and the
 * header's music menu.
 */

import { useId } from 'react'
import type { AmbientPlayer } from '../hooks/useAmbientSound'
import { SOUNDS } from '../lib/sounds'

interface Props {
  ambient: AmbientPlayer
  /** Chips only, without each sound's description (the header menu). */
  compact?: boolean
}

export default function SoundPicker({ ambient, compact = false }: Props) {
  const volumeId = useId()
  const volume = ambient.prefs.volume
  return (
    <>
      <ul className={compact ? 'sound-list sound-list--compact' : 'sound-list'}>
        {SOUNDS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="tag-chip"
              aria-pressed={ambient.playing === s.id}
              onClick={() => ambient.toggle(s.id)}
            >
              {s.label}
            </button>
            {!compact && (
              <span className="muted">
                {' '}
                {s.purpose} Scene: {s.sceneLabel.toLowerCase()}.
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="field">
        <label htmlFor={volumeId}>Volume</label>
        <input
          id={volumeId}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-valuetext={`${Math.round(volume * 100)} percent`}
          onChange={(e) => ambient.setVolume(Number(e.target.value))}
        />
      </div>
    </>
  )
}
