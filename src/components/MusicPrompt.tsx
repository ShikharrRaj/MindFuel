/**
 * MusicPrompt — when the student enters MindFuel, gently offers calming
 * music: an ordinary card under the greeting, so it never covers the page,
 * blocks the "Calm now" button or takes focus. Nothing plays until the
 * student chooses. Browsers only let audio start from a tap, so choosing a
 * sound here is that tap.
 *
 * Returning students are offered the sound they picked last time.
 */

import { type KeyboardEvent, useRef } from 'react'
import type { AmbientPlayer } from '../hooks/useAmbientSound'
import { DEFAULT_SOUND, type SoundId, SOUNDS, soundLabel } from '../lib/sounds'
import { MUSIC_BUTTON_ID } from './MusicControl'

interface Props {
  ambient: AmbientPlayer
  /** The student answered: a sound, "Not now" or "Don't ask me again". */
  onDone: () => void
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export default function MusicPrompt({ ambient, onDone }: Props) {
  const ref = useRef<HTMLElement>(null)
  const suggested = ambient.prefs.last ?? DEFAULT_SOUND
  // Three alternatives keep the prompt short (all five are in the Music menu).
  const others = SOUNDS.filter((s) => s.id !== suggested).slice(0, 3)

  function finish() {
    // The prompt is about to disappear: keep keyboard focus somewhere useful.
    const hadFocus = ref.current?.contains(document.activeElement) ?? false
    onDone()
    if (hadFocus) {
      requestAnimationFrame(() =>
        document.getElementById(MUSIC_BUTTON_ID)?.focus(),
      )
    }
  }

  function choose(id: SoundId) {
    ambient.play(id)
    finish()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') finish()
  }

  return (
    <section
      ref={ref}
      className="card music-invite"
      aria-labelledby="music-prompt-title"
      onKeyDown={onKeyDown}
    >
      <p className="card__eyebrow">
        {ambient.prefs.last ? 'Welcome back' : 'A calm start'}
      </p>
      <h2 id="music-prompt-title" className="music-invite__title">
        Would you like some calming music?
      </h2>
      <p className="music-invite__lead">
        Soft sound with a gently moving scene to match, from a starlit meadow to
        a golden shore. It is all made on your device, so nothing downloads.
        Change or stop it any time from Music at the top.
      </p>
      <div className="tag-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => choose(suggested)}
        >
          Play {lowerFirst(soundLabel(suggested))}
        </button>
        <button type="button" className="btn btn--ghost" onClick={finish}>
          Not now
        </button>
      </div>
      <div className="music-invite__others">
        <p id="music-prompt-others" className="music-invite__or">
          Or choose:
        </p>
        <div
          className="tag-row"
          role="group"
          aria-labelledby="music-prompt-others"
        >
          {others.map((s) => (
            <button
              key={s.id}
              type="button"
              className="tag-chip"
              onClick={() => choose(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          ambient.setAsk(false)
          finish()
        }}
      >
        Don&rsquo;t ask me again
      </button>
    </section>
  )
}
