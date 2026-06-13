/**
 * Reset — the adaptive mindfulness surface. It recommends a technique based on
 * the student's most recent check-in (mood, severity, triggers, prep phase) and
 * shows *why*, while still letting them pick any technique manually. This is the
 * "adaptive mindfulness exercises" the brief calls for.
 */

import { useMemo, useState } from 'react'
import {
  recommendExercise,
  TECHNIQUES,
  type TechniqueId,
} from '../lib/exercises'
import type { PrepPhase } from '../lib/exams'
import type { JournalEntry } from '../lib/types'
import MindfulExercise from './MindfulExercise'

interface Props {
  latest: JournalEntry | null
  phase: PrepPhase | undefined
}

const ALL_IDS = Object.keys(TECHNIQUES) as TechniqueId[]

export default function Reset({ latest, phase }: Props) {
  const recommendation = useMemo(() => {
    const signals = [
      ...(latest?.tags ?? []),
      ...(latest?.analysis?.triggers ?? []),
      ...(latest?.analysis?.themes ?? []),
    ]
    return recommendExercise({
      mood: latest?.mood ?? 3,
      severity: latest?.analysis?.severity ?? 'ok',
      signals,
      phase,
    })
  }, [latest, phase])

  const [selectedId, setSelectedId] = useState<TechniqueId>(
    recommendation.technique.id,
  )
  const technique = TECHNIQUES[selectedId]
  const isRecommended = selectedId === recommendation.technique.id

  return (
    <section className="card" aria-labelledby="reset-title">
      <p className="card__eyebrow">A moment for you</p>
      <h2 id="reset-title">{technique.name}</h2>

      {isRecommended && (
        <p className="reasoning">
          <strong>Suggested for you: </strong>
          {recommendation.reason}
        </p>
      )}

      <div
        className="technique-picker"
        role="group"
        aria-label="Choose a technique"
      >
        {ALL_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="tag-chip"
            aria-pressed={selectedId === id}
            onClick={() => setSelectedId(id)}
          >
            {TECHNIQUES[id].name}
            {id === recommendation.technique.id ? ' ★' : ''}
          </button>
        ))}
      </div>

      <MindfulExercise key={selectedId} technique={technique} />
    </section>
  )
}
