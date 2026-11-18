/**
 * PanicExplainer — "What's happening in my body?" Knowing that panic symptoms
 * are uncomfortable but harmless reduces the fear of the fear.
 */

import { PANIC_EXPLAINER, PANIC_MEDICAL_NOTE } from '../lib/guides'

export default function PanicExplainer() {
  return (
    <section className="card" aria-labelledby="panic-title">
      <p className="card__eyebrow">30-second read</p>
      <h2 id="panic-title">What’s happening in my body?</h2>
      {PANIC_EXPLAINER.map((section) => (
        <div key={section.heading}>
          <h3>{section.heading}</h3>
          <ul className="steps">
            {section.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="caution">{PANIC_MEDICAL_NOTE}</p>
    </section>
  )
}
