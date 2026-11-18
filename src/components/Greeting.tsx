/**
 * Greeting — the first thing the student sees: a warm, time-of-day welcome
 * and a slowly breathing circle to settle with (about 5.5 seconds in, 5.5
 * out). The circle is decorative; it stays still for reduced-motion users,
 * and "Pause motion" stills it (and the drifting background) for anyone.
 * The wording comes from lib/greeting.
 */

import { useEffect, useState } from 'react'
import { greetingFor } from '../lib/greeting'

const REFRESH_MS = 10 * 60_000

interface Props {
  name?: string
  /** Whether the page's gentle motion is on (see AmbientPrefs.motion). */
  motion: boolean
  onMotionChange: (motion: boolean) => void
}

export default function Greeting({ name, motion, onMotionChange }: Props) {
  const [now, setNow] = useState(() => new Date())

  // Morning turns into afternoon while the app is open, or overnight in a
  // background tab: refresh now and then, and on coming back.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    const id = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const greeting = greetingFor(now, name)
  const date = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <section className="greet" aria-labelledby="greet-title">
      <div className="breath-orb" aria-hidden="true">
        <div className="breath-orb__circle">
          <span className="breath-orb__ring" />
          <span className="breath-orb__core" />
        </div>
        <p className="breath-orb__cue">
          <span className="breath-orb__in">breathe in</span>
          <span className="breath-orb__out">breathe out</span>
        </p>
      </div>
      <div>
        <p className="card__eyebrow eyebrow--muted">{date}</p>
        <h1 id="greet-title" className="greet__title">
          {greeting.title}
        </h1>
        <p className="greet__line">{greeting.line}</p>
        {/* Moving content needs an on-page way to stop it (WCAG 2.2.2). */}
        <button
          type="button"
          className="link-btn greet__motion"
          aria-pressed={!motion}
          onClick={() => onMotionChange(!motion)}
        >
          Pause motion
        </button>
      </div>
    </section>
  )
}
