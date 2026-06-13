/**
 * Disclaimer — the persistent reminder that MindFuel is supportive, not a
 * substitute for professional care, plus the privacy-respecting control to
 * erase all on-device data.
 */

import { SUPPORT_DISCLAIMER } from '../lib/safety'

interface Props {
  /** When provided, renders a "Delete my data" control. */
  onReset?: () => void
}

export default function Disclaimer({ onReset }: Props) {
  return (
    <p className="disclaimer">
      {SUPPORT_DISCLAIMER}
      {onReset && (
        <>
          {' '}
          <button
            type="button"
            className="btn btn--ghost"
            style={{
              marginTop: '0.75rem',
              display: 'inline-block',
              padding: '0.4rem 0.9rem',
            }}
            onClick={onReset}
          >
            Delete my data
          </button>
        </>
      )}
    </p>
  )
}
