/**
 * Exam-context engine — the "logical decision making based on user context"
 * core of the app.
 *
 * Everything here is a PURE function of the user's profile and the current
 * date, so it is fully unit-testable and produces the same guidance the AI
 * prompt and the UI both rely on. No network, no clock side effects beyond the
 * `now` argument the caller passes in.
 */

import type { ExamType } from './types'

/** Human-friendly labels for each exam vertical. */
export const EXAM_LABELS: Record<ExamType, string> = {
  NEET: 'NEET (Medical)',
  JEE: 'JEE (Engineering)',
  CUET: 'CUET (University)',
  CAT: 'CAT (MBA)',
  GATE: 'GATE (Engineering PG)',
  UPSC: 'UPSC (Civil Services)',
  Boards: 'Board Exams',
  Other: 'Other Exam',
}

export type PrepPhase =
  | 'foundation'
  | 'momentum'
  | 'consolidation'
  | 'final-sprint'
  | 'exam-day'
  | 'post-exam'

export interface PhaseGuidance {
  phase: PrepPhase
  /** Short label shown in the UI. */
  label: string
  /** One-line framing of what this phase needs emotionally. */
  focus: string
  /**
   * Guidance injected into the AI prompt so coping advice matches the phase —
   * e.g. burnout-prevention months out vs. nerve-settling days before.
   */
  promptHint: string
}

/** Whole-day difference between two dates (exam date minus `now`). */
export function daysUntil(examDateISO: string, now: Date): number {
  const exam = new Date(examDateISO + 'T00:00:00')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.round((exam.getTime() - today.getTime()) / MS_PER_DAY)
}

/**
 * Map days-until-exam to a prep phase. The bands are deliberately coarse so the
 * emotional guidance shifts at meaningful milestones, not every day.
 */
export function phaseForDays(days: number): PrepPhase {
  if (days < 0) return 'post-exam'
  if (days === 0) return 'exam-day'
  if (days <= 7) return 'final-sprint'
  if (days <= 30) return 'consolidation'
  if (days <= 90) return 'momentum'
  return 'foundation'
}

const PHASE_GUIDANCE: Record<PrepPhase, Omit<PhaseGuidance, 'phase'>> = {
  foundation: {
    label: 'Foundation phase',
    focus: 'Building habits without burning out.',
    promptHint:
      'The exam is far away. Prioritise sustainable routines, preventing early burnout, and protecting motivation over the long haul. Avoid urgency or pressure.',
  },
  momentum: {
    label: 'Momentum phase',
    focus: 'Staying consistent and managing comparison.',
    promptHint:
      'There are a few months left. Focus on consistency, healthy pacing, and managing comparison with peers. Normalise plateaus.',
  },
  consolidation: {
    label: 'Consolidation phase',
    focus: 'Revision pressure and self-doubt.',
    promptHint:
      'A few weeks remain. Address revision overwhelm, rising self-doubt, and the urge to over-study. Encourage strategic rest and trust in preparation.',
  },
  'final-sprint': {
    label: 'Final sprint',
    focus: 'Calming nerves, protecting sleep.',
    promptHint:
      'The exam is days away. Prioritise nerve-settling, sleep protection, and confidence. Discourage cramming new material; reinforce that rest now improves recall.',
  },
  'exam-day': {
    label: 'Exam day',
    focus: 'Grounding and steadiness.',
    promptHint:
      'It is exam day. Keep guidance extremely short, calming, and grounding. Focus only on breathing, steadiness, and self-trust — nothing about studying.',
  },
  'post-exam': {
    label: 'After the exam',
    focus: 'Decompression and self-compassion.',
    promptHint:
      'The exam has passed. Focus on decompression, self-compassion regardless of perceived performance, and gently looking forward. Avoid rumination.',
  },
}

/** Resolve full phase guidance for a given days-until-exam value. */
export function guidanceForDays(days: number): PhaseGuidance {
  const phase = phaseForDays(days)
  return { phase, ...PHASE_GUIDANCE[phase] }
}

/** Convenience: phase guidance directly from an exam date + current time. */
export function guidanceForExam(examDateISO: string, now: Date): PhaseGuidance {
  return guidanceForDays(daysUntil(examDateISO, now))
}

/** Human-readable countdown string, e.g. "9 days to go" / "Exam day" / "2 days ago". */
export function countdownLabel(days: number): string {
  if (days === 0) return 'Exam day'
  if (days === 1) return '1 day to go'
  if (days > 1) return `${days} days to go`
  if (days === -1) return 'Exam was yesterday'
  return `Exam was ${Math.abs(days)} days ago`
}
