/**
 * FloatingTimer — follows the student around MindFuel while a focus session
 * is under way on another tab, so the countdown is always in view. It starts
 * as a small pill (ring + time) that sits in the margin without covering the
 * page; on wide screens, where there is room beside the content, it opens
 * fully. Expanded, it can pause, jump back to the Focus tab, or pop the timer
 * out over other windows where the browser supports it.
 *
 * Phase changes are announced by the app (outside the dock), since the
 * Focus panel's own live region is hidden while this shows and the dock
 * itself tucks away when it would cover the header.
 */

import { useEffect, useRef, useState } from 'react'
import type { FocusSession } from '../hooks/useFocusSession'
import type { PipControl } from '../hooks/usePipWindow'
import { formatClock, phaseTone, timerStatus } from '../lib/focus'
import MiniTimer, { ProgressRing } from './MiniTimer'
import PipToggle from './PipToggle'

/** Wide enough for the open timer to sit beside the 760px column. */
const ROOMY = '(min-width: 1520px)'

function startCollapsed(): boolean {
  return !window.matchMedia(ROOMY).matches
}

interface Props {
  session: FocusSession
  pip: PipControl
  onOpenFocus: () => void
  /** "Done for now" once a break is over: end the session. */
  onEnd: () => void
}

export default function FloatingTimer({
  session,
  pip,
  onOpenFocus,
  onEnd,
}: Props) {
  const [collapsed, setCollapsed] = useState(startCollapsed)
  const toggled = useRef(false)
  const showRef = useRef<HTMLButtonElement>(null)
  const hideRef = useRef<HTMLButtonElement>(null)

  // Keep keyboard focus on the control that replaced the one just pressed.
  useEffect(() => {
    if (!toggled.current) return
    ;(collapsed ? showRef : hideRef).current?.focus()
  }, [collapsed])

  function toggle(next: boolean) {
    toggled.current = true
    setCollapsed(next)
  }

  const tone = `mini-timer--${phaseTone(session.phase)}`

  return (
    <aside
      className={
        collapsed
          ? 'float-timer float-timer--collapsed'
          : 'card card--float float-timer'
      }
      aria-label="Focus timer"
    >
      {collapsed ? (
        <button
          ref={showRef}
          type="button"
          className={`float-timer__pill ${tone}`}
          aria-expanded="false"
          onClick={() => toggle(false)}
        >
          <ProgressRing session={session} />
          {formatClock(session.left)}
          <span className="sr-only">
            {` left · ${timerStatus(session)}. Show focus timer`}
          </span>
        </button>
      ) : (
        <>
          <h2 className="sr-only">Focus timer</h2>
          <button
            ref={hideRef}
            type="button"
            className="link-btn float-timer__hide"
            aria-expanded="true"
            onClick={() => toggle(true)}
          >
            Hide<span className="sr-only"> focus timer</span>
          </button>
          <MiniTimer session={session}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onOpenFocus}
            >
              Open Focus
            </button>
            <PipToggle pip={pip} label="Pop out" small />
          </MiniTimer>
          {session.awaitingStart && !session.running && (
            <button type="button" className="link-btn" onClick={onEnd}>
              Done for now
            </button>
          )}
        </>
      )}
    </aside>
  )
}
