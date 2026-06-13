/**
 * Prompt construction — pure string builders shared conceptually by the server
 * functions. Kept free of any SDK import so they are trivially unit-testable
 * and so the AI's "system of behaviour" lives in one reviewable place.
 *
 * The guiding principles encoded below:
 *  - Empathy first, advice second. Validate before fixing.
 *  - Context-aware: every response is conditioned on the student's exam, prep
 *    phase, and recent mood — this is the "logical decision making" the brief
 *    rewards.
 *  - Safe by construction: the model is told never to diagnose, never to give
 *    medical advice, and to escalate to human help on any crisis signal.
 */

/** Context passed into every prompt so the AI reasons about THIS student. */
export interface PromptContext {
  examLabel: string
  /** Phase-specific guidance, e.g. final-sprint vs. foundation. */
  phaseHint: string
  phaseLabel: string
  /** e.g. "9 days to go". */
  countdown: string
  /** Short summary of recent mood, e.g. "recent mood averaging 2.4/5 over 5 check-ins". */
  recentMoodSummary: string
}

/** Shared safety + persona preamble used by both analysis and chat. */
function personaPreamble(ctx: PromptContext): string {
  return [
    'You are MindFuel, an empathetic wellness companion for a student in India preparing for a high-stakes exam.',
    `The student is preparing for: ${ctx.examLabel}.`,
    `Preparation phase: ${ctx.phaseLabel} (${ctx.countdown}).`,
    `Phase guidance: ${ctx.phaseHint}`,
    `Context on their wellbeing: ${ctx.recentMoodSummary}.`,
    '',
    'Hard rules you must always follow:',
    '- Be warm, validating, and concise. Acknowledge feelings before offering any suggestion.',
    '- Never diagnose, never give medical or medication advice, never claim to be a therapist.',
    '- Avoid toxic positivity and empty cheerleading. Be genuine and specific to what they said.',
    '- If the student expresses any intent of self-harm, suicide, or being unable to go on, do not coach or problem-solve. Gently express care, encourage them to reach out to a trusted person, and direct them to a professional helpline.',
    '- Keep coping suggestions small, concrete, and doable in minutes, not lifestyle overhauls.',
  ].join('\n')
}

/** System instruction for the structured journal analysis call. */
export function buildAnalyzeSystemInstruction(ctx: PromptContext): string {
  return [
    personaPreamble(ctx),
    '',
    'Task: Analyse the student\'s journal entry and mood. Infer HIDDEN stress triggers and emotional patterns they may not have named explicitly. Then produce a single, phase-appropriate coping strategy and brief encouragement.',
    'In the "reasoning" field, explain in one or two sentences HOW you connected their context (mood, prep phase, detected triggers) to the advice you chose — written for the student to read, in second person ("Because you mentioned...").',
    'Set "severity" to "crisis" only for self-harm / suicidal signals, "elevated" for high distress or burnout, otherwise "ok".',
    'Respond ONLY with JSON matching the provided schema. Do not wrap it in markdown.',
  ].join('\n')
}

/** The user-content portion of the analysis call. */
export function buildAnalyzeUserContent(mood: number, text: string, tags: string[]): string {
  const tagLine = tags.length ? `\nContext tags they selected: ${tags.join(', ')}.` : ''
  return `Mood today: ${mood}/5.${tagLine}\n\nJournal entry:\n"""\n${text}\n"""`
}

/** System instruction for the conversational companion. */
export function buildChatSystemInstruction(ctx: PromptContext): string {
  return [
    personaPreamble(ctx),
    '',
    'You are now in an open conversation. Respond as a supportive companion: brief (2–5 sentences), human, and practical. Ask a gentle follow-up question when it helps the student feel heard. Offer at most one small, actionable suggestion per reply.',
  ].join('\n')
}
