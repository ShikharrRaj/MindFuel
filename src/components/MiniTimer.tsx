/**
 * MiniTimer — the compact focus-timer face shared by the floating timer and
 * the pop-out window: what phase it is, a progress ring, the time left, and
 * the one control that matters (start / pause / resume). Extra actions are
 * passed in as children.
 */

import type { ReactNode } from 'react'
import type { FocusSession } from '../hooks/useFocusSession'
import { phaseTone, timerStatus } from '../lib/focus'
import TimeLeft from './TimeLeft'

const RADIUS = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** A thin ring that fills as the phase runs. Decorative: the time is text. */
export function ProgressRing({ session }: { session: FocusSession }) {
  const elapsed = session.total > 0 ? 1 - session.left / session.total : 0
  return (
    <svg className="ring" viewBox="0 0 48 48" aria-hidden="true">
      <circle className="ring__track" cx="24" cy="24" r={RADIUS} />
      <circle
        className="ring__progress"
        cx="24"
        cy="24"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - elapsed)}
      />
    </svg>
  )
}

interface Props {
  session: FocusSession
  children?: ReactNode
}

export default function MiniTimer({ session, children }: Props) {
  return (
    <div className={`mini-timer mini-timer--${phaseTone(session.phase)}`}>
      <ProgressRing session={session} />
      <div>
        <p className="card__eyebrow">{timerStatus(session)}</p>
        <TimeLeft
          phase={session.phase}
          left={session.left}
          className="mini-timer__time"
        />
      </div>
      <div className="mini-timer__actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={session.startOrPause}
        >
          {session.startLabel}
        </button>
        {children}
      </div>
    </div>
  )
}
