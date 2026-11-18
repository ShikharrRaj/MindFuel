/**
 * HelplineLine — one short line with the 24/7 helplines as tap-to-call links.
 * Shown next to anything that stands between a student and the AI (consent,
 * AI errors, limits): when the model can't run, its second-opinion crisis
 * check can't either, so a person is always one tap away.
 */

import { HELPLINES } from '../lib/safety'

const ALWAYS_OPEN = HELPLINES.filter((h) => h.alwaysOpen)

export default function HelplineLine({
  lead = 'Need a person right now?',
}: {
  lead?: string
}) {
  return (
    <p className="field__hint helpline-line">
      {lead}{' '}
      {ALWAYS_OPEN.map((h, i) => (
        <span key={h.name}>
          {i > 0 && ' · '}
          <a href={h.href}>
            {h.name.split(' (')[0]} {h.contact}
          </a>
        </span>
      ))}
    </p>
  )
}
