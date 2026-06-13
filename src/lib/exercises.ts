/**
 * Adaptive mindfulness engine.
 *
 * The brief explicitly asks for "adaptive mindfulness exercises". This module
 * defines a small library of evidence-based techniques and a PURE function that
 * chooses the most fitting one from the student's current context (mood,
 * severity, what they flagged, and prep phase). Keeping the choice logic pure
 * makes the "adaptive" decision transparent and unit-testable — and gives the
 * student a visible reason for the suggestion, just like the journal insights.
 */

import type { MoodLevel, Severity } from './types'
import type { PrepPhase } from './exams'

export type TechniqueId =
  | 'box-breathing'
  | 'four-seven-eight'
  | 'grounding-54321'

export type ExerciseKind = 'breathing' | 'grounding'

/** A single breathing phase, e.g. "Breathe in" for 4 seconds. */
export interface BreathPhase {
  label: string
  seconds: number
}

export interface Technique {
  id: TechniqueId
  kind: ExerciseKind
  name: string
  /** One line on what it helps with. */
  purpose: string
  /** Breathing techniques: the repeating phase cycle. */
  phases?: BreathPhase[]
  /** How many cycles make a complete, effective round. */
  rounds?: number
  /** Grounding techniques: ordered sensory prompts. */
  steps?: string[]
}

export const TECHNIQUES: Record<TechniqueId, Technique> = {
  'box-breathing': {
    id: 'box-breathing',
    kind: 'breathing',
    name: 'Box breathing',
    purpose: 'Steadies a racing mind and calms exam-day nerves.',
    phases: [
      { label: 'Breathe in', seconds: 4 },
      { label: 'Hold', seconds: 4 },
      { label: 'Breathe out', seconds: 4 },
      { label: 'Hold', seconds: 4 },
    ],
    rounds: 4,
  },
  'four-seven-eight': {
    id: 'four-seven-eight',
    kind: 'breathing',
    name: '4-7-8 breathing',
    purpose: 'Winds the body down — helpful when sleep or rest is hard.',
    phases: [
      { label: 'Breathe in', seconds: 4 },
      { label: 'Hold', seconds: 7 },
      { label: 'Breathe out', seconds: 8 },
    ],
    rounds: 4,
  },
  'grounding-54321': {
    id: 'grounding-54321',
    kind: 'grounding',
    name: '5-4-3-2-1 grounding',
    purpose: 'Pulls you out of spiralling thoughts and back into the present.',
    steps: [
      'Name 5 things you can see around you.',
      'Notice 4 things you can physically feel.',
      'Listen for 3 things you can hear.',
      'Find 2 things you can smell.',
      'Acknowledge 1 thing you can taste.',
    ],
  },
}

export interface ExerciseContext {
  mood: MoodLevel
  severity: Severity
  /** Lower-cased tags/triggers the student flagged or the AI detected. */
  signals: string[]
  phase?: PrepPhase
}

export interface ExerciseRecommendation {
  technique: Technique
  /** Student-facing explanation of why this technique was chosen. */
  reason: string
}

const OVERWHELM_SIGNALS = [
  'panic',
  'overwhelm',
  'overwhelmed',
  'spiral',
  'distracted',
  'anxious',
  'anxiety',
  'racing thoughts',
]
const SLEEP_SIGNALS = [
  'low sleep',
  'sleep',
  'tired',
  'exhausted',
  'restless',
  'insomnia',
]

function hasSignal(signals: string[], needles: string[]): boolean {
  return signals.some((s) => needles.some((n) => s.includes(n)))
}

/**
 * Choose the most fitting technique for the moment. Order of precedence:
 *  1. Overwhelm / panic / very low mood → grounding (gets them present first).
 *  2. Sleep difficulty, or wind-down phases (final sprint / exam day) → 4-7-8.
 *  3. Otherwise → box breathing as a reliable default.
 */
export function recommendExercise(
  ctx: ExerciseContext,
): ExerciseRecommendation {
  const signals = ctx.signals.map((s) => s.toLowerCase())

  if (ctx.mood <= 2 || hasSignal(signals, OVERWHELM_SIGNALS)) {
    return {
      technique: TECHNIQUES['grounding-54321'],
      reason:
        'Because things feel overwhelming right now, this grounding exercise can gently bring you back to the present before anything else.',
    }
  }

  const windDownPhase = ctx.phase === 'final-sprint' || ctx.phase === 'exam-day'
  if (hasSignal(signals, SLEEP_SIGNALS) || windDownPhase) {
    return {
      technique: TECHNIQUES['four-seven-eight'],
      reason: windDownPhase
        ? 'With the exam so close, rest matters more than cramming — this longer exhale helps your body wind down.'
        : 'Since rest has been hard, this longer exhale signals your body that it is safe to relax.',
    }
  }

  return {
    technique: TECHNIQUES['box-breathing'],
    reason:
      'A short, even breathing round to steady your focus and release some of the day’s tension.',
  }
}

/** Total seconds for one full round of a breathing technique. */
export function roundDuration(technique: Technique): number {
  return (technique.phases ?? []).reduce((sum, p) => sum + p.seconds, 0)
}
