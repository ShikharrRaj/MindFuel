/**
 * Shared domain types for MindFuel.
 *
 * These types are the contract between the browser UI, the on-device store,
 * and the server-side Gemini functions in /api. Keeping them in one place
 * means a change to the AI response shape surfaces as a type error everywhere
 * it matters, rather than failing silently at runtime.
 */

/** Competitive / board exams this companion is designed around. */
export type ExamType =
  | 'NEET'
  | 'JEE'
  | 'CUET'
  | 'CAT'
  | 'GATE'
  | 'UPSC'
  | 'Boards'
  | 'Other'

/** The student's persona context — drives every contextual decision the AI makes. */
export interface UserProfile {
  /** Optional first name; used only to personalise copy, never sent for analytics. */
  name?: string
  exam: ExamType
  /** ISO date (YYYY-MM-DD) of the exam, used to derive the prep phase. */
  examDateISO: string
}

/** Self-reported mood on a 1 (very low) – 5 (great) scale. */
export type MoodLevel = 1 | 2 | 3 | 4 | 5

/**
 * Severity of the entry as judged by the AI + a local safety check.
 * `crisis` triggers the safety flow (helplines, grounding) instead of coaching.
 */
export type Severity = 'ok' | 'elevated' | 'crisis'

/** Structured insight returned by the /api/analyze function. */
export interface Analysis {
  /** Hidden stress triggers the AI inferred from free-text (e.g. "peer comparison"). */
  triggers: string[]
  /** Recurring emotional themes (e.g. "self-doubt", "sleep disruption"). */
  themes: string[]
  /** One-line emotional tone summary. */
  tone: string
  /** A short, plain-language reflection of what the student wrote. */
  summary: string
  /** A concrete, exam-context-aware coping strategy the student can act on now. */
  copingStrategy: {
    title: string
    steps: string[]
  }
  /** Brief, genuine motivational encouragement (not toxic positivity). */
  encouragement: string
  /**
   * The visible "why" — how the AI reached this advice from the student's
   * context (mood + prep phase + detected triggers). This is what makes the
   * assistant's decision-making transparent rather than a black box.
   */
  reasoning: string
  severity: Severity
}

/** A single daily check-in, stored on-device. */
export interface JournalEntry {
  id: string
  /** ISO timestamp when the entry was created. */
  createdAtISO: string
  mood: MoodLevel
  text: string
  /** Optional quick-pick context tags (e.g. "mock test", "low sleep"). */
  tags: string[]
  /** Populated once the AI analysis returns; absent while pending or if offline. */
  analysis?: Analysis
}

/** A message in the companion chat. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
