/**
 * PipTimer — renders the mini timer into the pop-out window (see
 * device/pip), which floats over every other tab and app.
 *
 * A background tab's timers can be throttled to once a minute, but the
 * pop-out is always visible, so its own ticker keeps the clock live and the
 * phase changes on time.
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { FocusSession } from '../hooks/useFocusSession'
import MiniTimer from './MiniTimer'

interface Props {
  win: Window
  session: FocusSession
}

export default function PipTimer({ win, session }: Props) {
  const { sync } = session
  useEffect(() => {
    const id = win.setInterval(sync, 250)
    return () => win.clearInterval(id)
  }, [win, sync])

  return createPortal(
    <main className="pip-timer">
      <p className="pip-timer__brand" aria-hidden="true">
        MindFuel<span className="brand__dot">.</span>
      </p>
      <h1 className="sr-only">Focus timer</h1>
      <MiniTimer session={session} />
      <p role="status" className="sr-only">
        {session.announcement}
      </p>
    </main>,
    win.document.body,
  )
}
