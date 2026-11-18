/**
 * MusicControl — the header's music button: shows what is playing (with
 * small moving bars) and opens a menu to switch sounds, change the volume,
 * stop, or choose whether MindFuel offers music when it opens.
 *
 * Disclosure pattern: the button toggles the menu; Escape, a click outside or
 * tabbing out closes it, and Escape from inside returns focus to the button.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { AmbientPlayer } from '../hooks/useAmbientSound'
import { DEFAULT_SOUND, soundInfo, soundLabel } from '../lib/sounds'
import SoundPicker from './SoundPicker'

/** The welcome prompt hands focus here once it is answered. */
export const MUSIC_BUTTON_ID = 'music-button'

export default function MusicControl({ ambient }: { ambient: AmbientPlayer }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const inside = wrapRef.current?.contains(document.activeElement) ?? false
      setOpen(false)
      if (inside) buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!ambient.supported) return null
  const { playing } = ambient

  return (
    <div
      className="music"
      ref={wrapRef}
      onBlur={(e) => {
        // Tabbing out closes the menu, so it never hides what is focused next.
        const next = e.relatedTarget as Node | null
        if (next && !e.currentTarget.contains(next)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        id={MUSIC_BUTTON_ID}
        type="button"
        className={playing ? 'music-btn is-playing' : 'music-btn'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="eq" viewBox="0 0 12 12" aria-hidden="true">
          <rect x="0" y="0" width="3" height="12" rx="1" />
          <rect x="4.5" y="0" width="3" height="12" rx="1" />
          <rect x="9" y="0" width="3" height="12" rx="1" />
        </svg>
        Music
        <span className="sr-only">
          {playing ? ` (${soundLabel(playing)} playing)` : ' (off)'}
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          className="card card--float music-pop"
          role="group"
          aria-labelledby={`${menuId}-title`}
        >
          <p id={`${menuId}-title`} className="music-pop__title">
            Calming music
          </p>
          <SoundPicker ambient={ambient} compact />
          {playing && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={ambient.stop}
            >
              Stop music
            </button>
          )}
          <label className="toggle">
            <input
              type="checkbox"
              checked={ambient.prefs.scenery}
              onChange={(e) => ambient.setScenery(e.target.checked)}
            />
            <span>
              Show a calming scene
              {ambient.prefs.scenery && (
                <span className="music-pop__scene">
                  {' '}
                  · {soundInfo(playing ?? DEFAULT_SOUND).sceneLabel}
                </span>
              )}
            </span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={ambient.prefs.autoplay}
              onChange={(e) => ambient.setAutoplay(e.target.checked)}
            />
            Play soft music when MindFuel opens
          </label>
          {!ambient.prefs.autoplay && (
            <label className="toggle">
              <input
                type="checkbox"
                checked={ambient.prefs.ask}
                onChange={(e) => ambient.setAsk(e.target.checked)}
              />
              Offer music when I open MindFuel
            </label>
          )}
        </div>
      )}
    </div>
  )
}
