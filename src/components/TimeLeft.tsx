/**
 * TimeLeft — the big "mm:ss" readout plus a calmer screen-reader version
 * ("Focus, 19 minutes left") that does not change every second.
 */

import { formatClock, type FocusPhase, PHASE_LABEL } from '../lib/focus'

interface Props {
  phase: FocusPhase
  left: number
  className: string
}

export default function TimeLeft({ phase, left, className }: Props) {
  return (
    <>
      <p className={className} aria-hidden="true">
        {formatClock(left)}
      </p>
      <p className="sr-only">
        {PHASE_LABEL[phase]}, {Math.ceil(left / 60)} minutes left
      </p>
    </>
  )
}
