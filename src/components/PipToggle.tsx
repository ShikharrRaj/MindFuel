/**
 * PipToggle — opens or closes the pop-out timer window (see usePipWindow).
 * Renders nothing where the browser has no Document Picture-in-Picture.
 */

import type { PipControl } from '../hooks/usePipWindow'

interface Props {
  pip: PipControl
  /** "Pop out timer" in the coach, a shorter "Pop out" in the mini timer. */
  label?: string
  small?: boolean
}

export default function PipToggle({
  pip,
  label = 'Pop out timer',
  small = false,
}: Props) {
  if (!pip.supported) return null
  return (
    <button
      type="button"
      className={small ? 'btn btn--ghost btn--sm' : 'btn btn--ghost'}
      onClick={pip.win ? pip.close : pip.open}
    >
      {pip.win ? 'Close pop-out' : label}
    </button>
  )
}
