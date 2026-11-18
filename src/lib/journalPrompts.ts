/**
 * Journaling prompts — a static library, chosen from what the student tagged
 * and where they are in their prep. Helps on days when the blank box is the
 * hardest part, at no AI cost.
 */

import type { PrepPhase } from './exams'

const GENERAL = [
  'What took the most energy today, and what gave some back?',
  'What is one thing I am worried about, and how likely is it really?',
  'What did I do today that I am quietly proud of?',
  'If my best friend had my day, what would I tell them?',
  'What do I need more of this week, and what do I need less of?',
  'One moment from today I would like to remember is…',
]

const BY_PHASE: Record<PrepPhase, string> = {
  foundation:
    'What study rhythm is working for me, and what is starting to feel heavy?',
  momentum: 'Where am I improving, even slowly?',
  consolidation:
    'What do I need to let go of, so I can focus on what matters most now?',
  'final-sprint': 'What will help me rest and stay steady this week?',
  'exam-day':
    'How am I feeling right before the exam, and what do I want to remind myself?',
  'post-exam':
    'Now that it is done, what do I need: rest, celebration, or space to process?',
}

const BY_TAG: Record<string, string> = {
  'mock test': 'How did the mock feel, apart from the score?',
  'low sleep': 'What kept me up, and what might help tonight?',
  'long study day': 'How does my body feel after today?',
  'peer comparison':
    'Whose progress am I measuring myself against, and is that a fair comparison?',
  'family pressure': 'What do I wish my family understood right now?',
  revision: 'Which topic felt clearer today than it did before?',
  distracted: 'What pulled my attention away today?',
  'took a break': 'What did the break give me?',
}

export interface PromptInput {
  phase?: PrepPhase
  tags: string[]
  /** Rotates the general prompts so they do not repeat every day. */
  seed: number
}

/** Up to three prompts: tag-specific first, then phase, then general. */
export function promptsFor({ phase, tags, seed }: PromptInput): string[] {
  const out: string[] = []
  for (const tag of tags) {
    const p = BY_TAG[tag]
    if (p && !out.includes(p)) out.push(p)
  }
  if (phase) out.push(BY_PHASE[phase])
  for (let i = 0; out.length < 3 && i < GENERAL.length; i++) {
    const p = GENERAL[(seed + i) % GENERAL.length]
    if (!out.includes(p)) out.push(p)
  }
  return out.slice(0, 3)
}
