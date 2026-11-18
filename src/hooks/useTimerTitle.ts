/**
 * useTimerTitle — shows the focus countdown in the browser-tab title while a
 * session is under way, so it can be read from any other tab in any browser.
 *
 * Pages (privacy, parent guide) set their own titles too. Rather than fight
 * them, this hook notices when someone else changed the title since it last
 * wrote one, and treats that as the title to restore when the session ends.
 */

import { useEffect, useRef } from 'react'
import { focusTitle } from '../lib/focus'
import type { FocusSession } from './useFocusSession'

export function useTimerTitle(session: FocusSession): void {
  const base = useRef(document.title)
  const written = useRef<string | null>(null)
  const { active, phase, left, running, paused, awaitingStart, blocks } =
    session

  useEffect(() => {
    if (document.title !== written.current) base.current = document.title
    if (active) {
      const next = focusTitle({
        phase,
        left,
        running,
        paused,
        awaitingStart,
        blocks,
      })
      document.title = next
      written.current = next
    } else if (written.current !== null) {
      document.title = base.current
      written.current = null
    }
  }, [active, phase, left, running, paused, awaitingStart, blocks])

  useEffect(
    () => () => {
      if (written.current !== null) document.title = base.current
    },
    [],
  )
}
