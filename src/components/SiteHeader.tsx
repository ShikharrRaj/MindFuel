/**
 * SiteHeader — the brand bar, a context chip that surfaces the student's exam
 * and countdown, the music control, and the always-visible "Calm now" SOS
 * button.
 */

import type { ReactNode } from 'react'

interface Props {
  /** e.g. "JEE · 9 days to go". Omitted before onboarding. */
  context?: string
  /** e.g. "Final sprint". */
  phaseLabel?: string
  /** The music control (see MusicControl). */
  music?: ReactNode
  /** Opens the SOS calm overlay. */
  onSos?: () => void
}

export default function SiteHeader({
  context,
  phaseLabel,
  music,
  onSos,
}: Props) {
  return (
    <>
      {/* Moves focus without changing the URL hash, which drives the pages. */}
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <div>
            <span className="brand">
              MindFuel<span className="brand__dot">.</span>
            </span>
            <span className="brand__tag">Exam wellness companion</span>
          </div>
          <div className="site-header__right">
            {context && (
              <span className="context-chip">
                <strong>{context}</strong>
                {phaseLabel ? ` · ${phaseLabel}` : ''}
              </span>
            )}
            {music}
            {onSos && (
              <button
                type="button"
                className="sos-btn"
                onClick={onSos}
                aria-haspopup="dialog"
              >
                Calm now
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
