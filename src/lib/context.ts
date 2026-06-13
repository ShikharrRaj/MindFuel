/**
 * Builds the {@link PromptContext} the AI reasons over, from the minimal,
 * privacy-preserving payload the client sends (exam + date + a precomputed mood
 * summary). The full journal history never leaves the device — only the single
 * entry being analysed plus a short aggregate string.
 */

import {
  EXAM_LABELS,
  countdownLabel,
  daysUntil,
  guidanceForDays,
} from './exams'
import type { ExamType } from './types'
import type { PromptContext } from './prompts'

export interface ContextInput {
  exam: ExamType
  examDateISO: string
  /** Precomputed on-device, e.g. "recent mood averaging 2.4/5 over 5 check-ins". */
  recentMoodSummary: string
}

export function buildPromptContext(
  input: ContextInput,
  now: Date,
): PromptContext {
  const days = daysUntil(input.examDateISO, now)
  const guidance = guidanceForDays(days)
  return {
    examLabel: EXAM_LABELS[input.exam] ?? 'their exam',
    phaseHint: guidance.promptHint,
    phaseLabel: guidance.label,
    countdown: countdownLabel(days),
    recentMoodSummary: input.recentMoodSummary,
  }
}
