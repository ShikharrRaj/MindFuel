/**
 * ExamHallCard — a discreet 3-step routine for the exam hall. Works offline,
 * and prints as a small card (print styles hide the rest of the page).
 */

import { EXAM_HALL_REMINDER, EXAM_HALL_STEPS } from '../lib/guides'

export default function ExamHallCard() {
  return (
    <section className="card print-area" aria-labelledby="hall-title">
      <p className="card__eyebrow">Pocket card</p>
      <h2 id="hall-title">If panic hits in the exam hall</h2>
      <ol className="hall-steps">
        {EXAM_HALL_STEPS.map((s) => (
          <li key={s.title}>
            <strong>{s.title}.</strong> {s.detail}
          </li>
        ))}
      </ol>
      <p className="insight__tone">{EXAM_HALL_REMINDER}</p>
      <button
        type="button"
        className="btn btn--ghost no-print"
        onClick={() => window.print()}
      >
        Print this card
      </button>
    </section>
  )
}
