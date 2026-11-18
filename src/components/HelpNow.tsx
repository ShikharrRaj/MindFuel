/**
 * HelpNow — a compact, always-actionable helpline block. Shown whenever
 * distress is at the top of the scale or rises during an activity, when crisis
 * language appears in a free-text box, inside the SOS overlay, and in error
 * fallbacks. The full SafetyCard is used when a check-in is flagged.
 *
 * It lists the 24/7 lines (incl. 112 for emergencies) as large call buttons.
 */

import { HELPLINES } from '../lib/safety'

interface Props {
  title?: string
  /** Announce immediately (crisis language was just detected). */
  urgent?: boolean
  onOpenPlan?: () => void
}

/** 24/7 lines only (Tele-MANAS, 112 emergency, AASRA). */
const ALWAYS_OPEN = HELPLINES.filter((h) => h.alwaysOpen)

export default function HelpNow({
  title = 'If you feel unsafe, you do not have to handle this alone',
  urgent = false,
  onOpenPlan,
}: Props) {
  return (
    <div className="help-now" role={urgent ? 'alert' : undefined}>
      <p className="help-now__title">{title}</p>
      <ul className="help-now__list">
        {ALWAYS_OPEN.map((h) => (
          <li key={h.name}>
            <a href={h.href} className="call-btn">
              <span>
                Call {h.name.split(' (')[0]}: {h.contact}
              </span>
              <span className="call-btn__detail">{h.detail}</span>
            </a>
          </li>
        ))}
      </ul>
      {onOpenPlan && (
        <button type="button" className="btn btn--ghost" onClick={onOpenPlan}>
          Open my safety plan
        </button>
      )}
    </div>
  )
}
