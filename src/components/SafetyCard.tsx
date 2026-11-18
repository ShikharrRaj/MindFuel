/**
 * SafetyCard — shown whenever crisis-level distress is detected (locally or by
 * the AI). It deliberately replaces coaching with care: validation, a nudge to
 * reach a trusted human, and verified helplines. This is the most important
 * surface in the app.
 */

import { HELPLINES, SUPPORT_DISCLAIMER } from '../lib/safety'

interface Props {
  /**
   * Announce as an alert. Pass false where the card is a persistent banner
   * (e.g. the Calm tab), so it is not re-announced on every tab switch.
   */
  alert?: boolean
}

export default function SafetyCard({ alert = true }: Props) {
  return (
    <section
      className="safety"
      role={alert ? 'alert' : 'region'}
      aria-labelledby="safety-title"
    >
      <h2 id="safety-title">You don't have to carry this alone</h2>
      <p>
        It sounds like you're going through something really heavy right now. An
        exam is never worth your wellbeing, and you deserve support from someone
        who can be there with you. Please consider reaching out to a trusted
        person, or to one of these free, confidential helplines:
      </p>
      <ul className="helpline-list">
        {HELPLINES.map((h) => (
          <li key={h.name} className="helpline">
            <div className="helpline__name">{h.name}</div>
            <a href={h.href} className="helpline__contact">
              {h.contact}
            </a>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {h.detail}
            </div>
          </li>
        ))}
      </ul>
      <p className="disclaimer">{SUPPORT_DISCLAIMER}</p>
    </section>
  )
}
