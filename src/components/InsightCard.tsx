/**
 * InsightCard — renders the AI's structured analysis of a check-in. The
 * "reasoning" block is intentionally prominent: it makes the assistant's
 * context-based decision-making visible to the student (and to evaluators).
 */

import type { Analysis } from '../lib/types'

interface Props {
  analysis: Analysis
}

export default function InsightCard({ analysis }: Props) {
  return (
    <section
      className="card"
      aria-labelledby="insight-title"
      aria-live="polite"
    >
      <p className="card__eyebrow">What I'm noticing</p>
      <h2 id="insight-title" className="insight__tone">
        {analysis.tone}
      </h2>
      <p>{analysis.summary}</p>

      {analysis.triggers.length > 0 && (
        <>
          <h3>Possible stress triggers</h3>
          <div className="chips">
            {analysis.triggers.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      {analysis.themes.length > 0 && (
        <>
          <h3>Emotional patterns</h3>
          <div className="chips">
            {analysis.themes.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      <h3>{analysis.copingStrategy.title}</h3>
      <ol className="steps">
        {analysis.copingStrategy.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <p className="reasoning">
        <strong>Why this suggestion: </strong>
        {analysis.reasoning}
      </p>

      <p style={{ marginBottom: 0 }}>{analysis.encouragement}</p>
    </section>
  )
}
