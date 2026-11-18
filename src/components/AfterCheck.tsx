/**
 * AfterCheck — "How strong is it now?" after an activity. The before/after
 * difference is how the Calm Toolkit learns what works for this student,
 * entirely on-device, and how it shows them their own progress.
 */

import { useId, useState } from 'react'
import type { SessionOutcome } from '../lib/calm'
import IntensitySlider from './IntensitySlider'

interface Props {
  before?: number
  /** `after` is undefined when the student did not move the slider. */
  onSubmit: (after: number | undefined, outcome: SessionOutcome) => void
}

const OUTCOMES: { id: SessionOutcome; label: string }[] = [
  { id: 'helped', label: 'It helped' },
  { id: 'not-really', label: 'Not really' },
  { id: 'not-for-me', label: 'Not for me' },
]

export default function AfterCheck({ before, onSubmit }: Props) {
  const id = useId()
  // Untouched slider = no rating, so "It helped" is not logged as "no change".
  const [after, setAfter] = useState<number | undefined>(undefined)
  return (
    <div className="after-check">
      <IntensitySlider
        id={id}
        label="How strong is it now?"
        value={after ?? before ?? 5}
        onChange={setAfter}
      />
      <p className="field__hint" id={`${id}-hint`}>
        “Not for me” hides it from future suggestions. You can still find it in
        Activities.
      </p>
      <div
        className="tag-row"
        role="group"
        aria-label="How was that activity?"
        aria-describedby={`${id}-hint`}
      >
        {OUTCOMES.map((o) => (
          <button
            key={o.id}
            type="button"
            className={
              o.id === 'helped' ? 'btn btn--primary' : 'btn btn--ghost'
            }
            onClick={() => onSubmit(after, o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
