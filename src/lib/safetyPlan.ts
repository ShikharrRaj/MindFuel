/**
 * Personal safety plan, based on the Stanley-Brown Safety Planning
 * Intervention: a short, written plan the student fills in while calm, so it
 * is ready during a crisis. It lives only on the device.
 *
 * Safety-critical: changes here need security-reviewer sign-off (CLAUDE.md).
 */

export interface SafetyPlan {
  warningSigns: string[]
  coping: string[]
  distractions: string[]
  people: string[]
  professionals: string[]
  safeSpace: string[]
  reasons: string[]
  updatedAtISO?: string
}

export type SafetyPlanKey = Exclude<keyof SafetyPlan, 'updatedAtISO'>

/** Limits keep the plan readable in a crisis and storage bounded. */
export const MAX_PLAN_ITEMS = 20
export const MAX_PLAN_ITEM_LENGTH = 200

export interface SafetyPlanSection {
  key: SafetyPlanKey
  title: string
  prompt: string
  example: string
}

/** The plan's steps, in the order they are used during a crisis. */
export const SAFETY_PLAN_SECTIONS: SafetyPlanSection[] = [
  {
    key: 'warningSigns',
    title: '1. My warning signs',
    prompt:
      'Thoughts, feelings or situations that tell me a crisis may be building.',
    example:
      'e.g. I stop replying to messages; I can’t stop thinking about results',
  },
  {
    key: 'coping',
    title: '2. Things I can do on my own',
    prompt:
      'Ways to calm down or take my mind off things, without contacting anyone.',
    example: 'e.g. cyclic sighing, a walk, a hot shower, music',
  },
  {
    key: 'distractions',
    title: '3. People and places that take my mind off things',
    prompt: 'Where I can go, or who I can be around, to feel a bit better.',
    example: 'e.g. the terrace, my cousin’s place, the library café',
  },
  {
    key: 'people',
    title: '4. People I can ask for help',
    prompt:
      'People I trust and could tell how I am feeling. Add a number if you like.',
    example: 'e.g. Didi, 98xxxxxxx',
  },
  {
    key: 'professionals',
    title: '5. Professionals I can contact',
    prompt:
      'A counsellor, doctor or teacher. The helplines below are always included.',
    example: 'e.g. School counsellor, Ms. Rao',
  },
  {
    key: 'safeSpace',
    title: '6. Making my space safer',
    prompt: 'Things I can do to keep myself safe when I feel at risk.',
    example: 'e.g. give my medicines to Mummy to keep',
  },
  {
    key: 'reasons',
    title: '7. My reasons to keep going',
    prompt: 'The people, hopes and things that matter most to me.',
    example: 'e.g. my little brother; becoming a doctor; my dog',
  },
]

export const EMPTY_SAFETY_PLAN: SafetyPlan = {
  warningSigns: [],
  coping: [],
  distractions: [],
  people: [],
  professionals: [],
  safeSpace: [],
  reasons: [],
}

export function isPlanEmpty(plan: SafetyPlan): boolean {
  return SAFETY_PLAN_SECTIONS.every((s) => plan[s.key].length === 0)
}

/** Defensive parse of a stored plan: unknown shapes become an empty plan. */
export function normalizePlan(raw: unknown): SafetyPlan {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_SAFETY_PLAN }
  const obj = raw as Record<string, unknown>
  const plan: SafetyPlan = { ...EMPTY_SAFETY_PLAN }
  for (const { key } of SAFETY_PLAN_SECTIONS) {
    const value = obj[key]
    plan[key] = Array.isArray(value)
      ? value
          .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
          .slice(0, MAX_PLAN_ITEMS)
          .map((v) => v.slice(0, MAX_PLAN_ITEM_LENGTH))
      : []
  }
  if (typeof obj.updatedAtISO === 'string') plan.updatedAtISO = obj.updatedAtISO
  return plan
}
