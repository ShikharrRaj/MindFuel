/**
 * BreathPacer — a guided, paced breathing timer with an expanding/contracting
 * circle. Used by breathing activities and the SOS overlay.
 *
 * Timing is wall-clock based (useCountdown), so pause/resume continue where
 * they left off. Callers usually move on in `onComplete`; if they do not, the
 * pacer shows a short "done" message and offers another go.
 *
 * Accessibility: respects `prefers-reduced-motion` (no scaling — text cues and
 * the countdown carry the guidance). Only phase changes are announced, not
 * every second, and vibration cues make it usable with eyes closed.
 */

import { useEffect, useState } from 'react'
import { vibrateFor } from '../device/haptics'
import {
  type BreathPhase,
  breathPosition,
  roundSeconds,
} from '../lib/activities'
import { useCountdown } from '../hooks/useCountdown'

interface Props {
  name: string
  phases: BreathPhase[]
  rounds: number
  /** Start immediately (SOS: no decisions needed mid-panic). */
  autoStart?: boolean
  haptics?: boolean
  onComplete?: () => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const SCALE: Record<BreathPhase['motion'], number> = {
  in: 1,
  hold: 0.82,
  out: 0.55,
}

export default function BreathPacer({
  name,
  phases,
  rounds,
  autoStart = false,
  haptics = false,
  onComplete,
}: Props) {
  const reduced = prefersReducedMotion()
  const total = roundSeconds(phases) * rounds
  const [done, setDone] = useState(false)
  const timer = useCountdown(
    total,
    () => {
      setDone(true)
      onComplete?.()
    },
    autoStart,
  )

  const elapsed = total - timer.left
  const pos = breathPosition(phases, Math.min(elapsed, total - 1))
  const phase = phases[pos.phaseIndex]
  const started = elapsed > 0 || timer.running

  // A cue at the start of each phase.
  useEffect(() => {
    if (timer.running && haptics && pos.intoPhase === 0) {
      vibrateFor(phase.motion)
    }
  }, [timer.running, haptics, pos.intoPhase, pos.phaseIndex, phase.motion])

  function again() {
    setDone(false)
    timer.reset(total)
    timer.start()
  }

  const scale = timer.running ? SCALE[phase.motion] : 0.7
  const phaseText = `${phase.label}, round ${pos.round} of ${rounds}`

  return (
    <div className="pacer">
      <div className="breath" aria-hidden="true">
        <div
          className="breath__circle"
          style={
            reduced
              ? undefined
              : {
                  transform: `scale(${scale})`,
                  transitionDuration: `${timer.running ? phase.seconds : 0.3}s`,
                }
          }
        >
          {timer.running ? pos.secondsLeft : ''}
        </div>
      </div>

      <p className="breath__label" aria-hidden="true">
        {done
          ? 'Nicely done. Notice how your body feels now.'
          : started
            ? `${phase.label} · ${pos.secondsLeft}s · round ${pos.round} of ${rounds}`
            : `${name}: ${rounds} rounds, about ${Math.max(1, Math.round(total / 60))} min.`}
      </p>
      {/* Screen readers hear each phase once, not a per-second countdown. */}
      <p className="sr-only" role="status">
        {done
          ? 'Done. Notice how your body feels now.'
          : timer.running
            ? phaseText
            : ''}
      </p>

      <button
        type="button"
        className="btn btn--primary"
        onClick={done ? again : timer.running ? timer.pause : timer.start}
      >
        {done
          ? 'Go again'
          : timer.running
            ? 'Pause'
            : started
              ? 'Resume'
              : 'Begin'}
      </button>
    </div>
  )
}
