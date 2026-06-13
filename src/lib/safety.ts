/**
 * Safety layer — the most important responsibility of a mental-wellness tool.
 *
 * This is a PURE, local, deterministic first line of defence. It runs in the
 * browser the instant a student submits text, BEFORE any network call, so that
 * if someone expresses crisis-level distress we can surface real help even if
 * the AI is slow, rate-limited, or offline. The server-side AI provides a
 * second, smarter judgement (see /api/analyze) — defence in depth, never one
 * single point of failure.
 *
 * Design choices:
 * - We bias toward FALSE POSITIVES. Showing helpline resources to a student who
 *   isn't in crisis is a minor annoyance; missing a real crisis is unacceptable.
 * - Matching is word-boundary aware to avoid absurd false hits (e.g. "die" in
 *   "diet" or "studied").
 */

/**
 * Phrases that signal possible self-harm / crisis-level distress. Kept as
 * explicit multi-word phrases where possible to reduce noise. This list is
 * intentionally conservative and English-focused for the hackathon scope; a
 * production system would localise (Hindi + regional) and use a trained model.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bkilling myself\b/i,
  /\bend(ing)? my life\b/i,
  /\bend(ing)? it all\b/i,
  /\btake my (own )?life\b/i,
  /\bwant to die\b/i,
  /\bwanna die\b/i,
  /\bdon'?t want to (be alive|live)\b/i,
  /\bno reason to live\b/i,
  /\bbetter off dead\b/i,
  /\bcan'?t go on\b/i,
  /\bself[\s-]?harm\b/i,
  /\bhurt myself\b/i,
  /\bcut myself\b/i,
  /\bsuicid/i, // suicide, suicidal
]

export interface CrisisCheck {
  isCrisis: boolean
  /** The matched fragments, useful for tests and (optionally) logging counts. */
  matches: string[]
}

/**
 * Scan free text for crisis-level language.
 * Returns which patterns matched so the result is explainable and testable.
 */
export function detectCrisis(text: string): CrisisCheck {
  const matches: string[] = []
  for (const pattern of CRISIS_PATTERNS) {
    const m = text.match(pattern)
    if (m) matches.push(m[0])
  }
  return { isCrisis: matches.length > 0, matches }
}

/** A verified support resource shown during the safety flow. */
export interface Helpline {
  name: string
  contact: string
  detail: string
  /** Tel/URL for an actionable link where possible. */
  href: string
}

/**
 * Indian mental-health helplines. These are government / well-established
 * services so the guidance is actionable and trustworthy for the target users.
 */
export const HELPLINES: Helpline[] = [
  {
    name: 'Tele-MANAS (Govt. of India)',
    contact: '14416',
    detail: '24/7 national mental health support, multiple languages.',
    href: 'tel:14416',
  },
  {
    name: 'KIRAN Mental Health Helpline',
    contact: '1800-599-0019',
    detail: '24/7 toll-free, 13 languages.',
    href: 'tel:18005990019',
  },
  {
    name: 'iCall (TISS)',
    contact: '9152987821',
    detail: 'Counsellor support, Mon–Sat, 10am–8pm.',
    href: 'tel:9152987821',
  },
  {
    name: 'AASRA',
    contact: '+91-9820466726',
    detail: '24/7 crisis support and suicide prevention.',
    href: 'tel:+919820466726',
  },
]

/** Standard disclaimer shown across the app — MindFuel is support, not therapy. */
export const SUPPORT_DISCLAIMER =
  'MindFuel is a supportive companion, not a substitute for professional medical or mental-health care. If you are in distress, please reach out to a trusted person or one of the helplines below.'
