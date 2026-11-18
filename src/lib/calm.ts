/**
 * Calm Toolkit — the selection engine.
 *
 * A PURE function picks the most fitting activity from three quick answers
 * (what it feels like, how strong, how much time) plus the student's own
 * history. No AI call is made: the decision is deterministic, explainable and
 * unit-tested, and it works offline.
 *
 * Guiding rule: body first when the alarm is loud, mind when it is quieter.
 * At high distress the primary pick is always a bottom-up (body) activity; a
 * thinking tool can follow as a second step once things have settled.
 *
 * The engine also learns, still without AI: every session records distress
 * before and after, and activities that work for *this* student rank higher.
 */

import {
  ACTIVITIES,
  type Activity,
  type CalmState,
  getActivity,
  type IntensityBand,
  type Setting,
  SETTINGS,
  stateLabel,
} from './activities'
import type { PrepPhase } from './exams'
import { detectCrisis } from './safety'
import type { JournalEntry } from './types'

/** Time the student has, from the "How much time?" step. */
export type TimeBudget = 1 | 5 | 15

export interface CalmAnswers {
  states: CalmState[]
  /** Self-rated distress, 0 (calm) to 10 (worst). */
  intensity: number
  minutes: TimeBudget
  setting?: Setting
}

export type SessionOutcome = 'helped' | 'not-really' | 'not-for-me'
export type SessionSource = 'calm' | 'library' | 'sos' | 'focus'

/** One completed (or rated) activity, stored on-device. */
export interface CalmSession {
  id: string
  activityId: string
  atISO: string
  states: CalmState[]
  before?: number
  after?: number
  outcome?: SessionOutcome
  source: SessionSource
}

/** Remembered, per-student preferences. */
export interface CalmPrefs {
  notForMe: string[]
  setting?: Setting
  haptics: boolean
}

export const DEFAULT_PREFS: CalmPrefs = { notForMe: [], haptics: true }

export interface CalmContext {
  phase?: PrepPhase
  sessions: CalmSession[]
  prefs: CalmPrefs
  now: Date
}

export interface CalmRecommendation {
  primary: Activity
  alternates: Activity[]
  /** At high distress with time to spare: a thinking tool to do next. */
  next?: Activity
  /** Student-facing explanation of the choice. */
  reason: string
  /** Distress is at the very top of the scale: show helplines alongside. */
  showHelp: boolean
}

/** At or above this rating, helplines are shown next to any activity. */
export const HELP_THRESHOLD = 9

export function intensityBand(intensity: number): IntensityBand {
  if (intensity >= 7) return 'high'
  if (intensity >= 4) return 'mid'
  return 'low'
}

export function intensityWord(intensity: number): string {
  if (intensity >= 9) return 'very strong'
  if (intensity >= 7) return 'strong'
  if (intensity >= 4) return 'noticeable'
  return 'mild'
}

// --------------------------------------------------------------- signals

/**
 * Keyword map from check-in tags and AI-detected triggers to calm states, so a
 * recent check-in can pre-fill the flow. Order matters: specific first.
 */
const SIGNAL_MAP: [RegExp, CalmState][] = [
  [/sleep|insomnia|tired|awake/i, 'cant-sleep'],
  [/mock|score|marks|test result/i, 'bad-mock'],
  [/peer|compar|batch ?mates?|rank list/i, 'comparison'],
  [/family|parent|mother|father|relatives/i, 'family-pressure'],
  [/distract|focus|procrastinat|concentrat/i, 'cant-focus'],
  [/panic|chest|breathless/i, 'panic'],
  [/overwhelm|syllabus|backlog|too much/i, 'overwhelmed'],
  [/anxi|racing|spiral|overthink|worr/i, 'racing-thoughts'],
  [/result|future|fail|rank/i, 'future-fear'],
  [/lonely|alone|isolat/i, 'lonely'],
  [/angry|anger|irritab|frustrat/i, 'irritable'],
  [/sad|exhaust|burn ?out|unmotivat|drained|low mood|no energy/i, 'low-energy'],
]

/** Map free-form signals to at most `limit` distinct calm states. */
export function signalsToStates(signals: string[], limit = 2): CalmState[] {
  const out: CalmState[] = []
  for (const signal of signals) {
    for (const [pattern, state] of SIGNAL_MAP) {
      if (pattern.test(signal) && !out.includes(state)) {
        out.push(state)
        break
      }
    }
    if (out.length >= limit) break
  }
  return out
}

/** A sensible starting rating from a 1–5 mood (lower mood → higher distress). */
export function intensityFromMood(mood: number): number {
  return Math.max(0, Math.min(10, Math.round(9 - mood * 1.5)))
}

export interface CalmPrefill {
  states: CalmState[]
  intensity: number
}

/** How recent a check-in must be to pre-fill the calm flow. */
export const PREFILL_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Pre-fill the calm flow from a check-in made in the last 24 hours: its tags
 * and AI-detected triggers/themes become states, its mood a starting rating.
 */
export function prefillFromEntry(
  entry: Pick<
    JournalEntry,
    'createdAtISO' | 'mood' | 'tags' | 'analysis'
  > | null,
  now: Date,
): CalmPrefill | null {
  if (!entry) return null
  const age = now.getTime() - new Date(entry.createdAtISO).getTime()
  if (age < 0 || age > PREFILL_WINDOW_MS) return null
  const signals = [
    ...entry.tags,
    ...(entry.analysis?.triggers ?? []),
    ...(entry.analysis?.themes ?? []),
  ]
  return {
    states: signalsToStates(signals, 2),
    intensity: intensityFromMood(entry.mood),
  }
}

// ------------------------------------------------------------ safety gates

/**
 * A check-in from the last 24 hours that was flagged as a crisis, by the AI or
 * by the local detector. The Calm tab then leads with helplines, not activities.
 */
export function entryNeedsHelp(
  entry: Pick<JournalEntry, 'createdAtISO' | 'text' | 'analysis'> | null,
  now: Date,
): boolean {
  if (!entry) return false
  const age = now.getTime() - new Date(entry.createdAtISO).getTime()
  if (age < 0 || age > PREFILL_WINDOW_MS) return false
  // Stored data may be corrupted: never let a bad entry crash the app.
  const text = typeof entry.text === 'string' ? entry.text : ''
  return entry.analysis?.severity === 'crisis' || detectCrisis(text).isCrisis
}

/**
 * Show helplines when a rating is at the top of the scale, or when distress
 * went UP to a high level during an activity.
 */
export function ratingNeedsHelp(before?: number, after?: number): boolean {
  if (before !== undefined && before >= HELP_THRESHOLD) return true
  if (after === undefined) return false
  if (after >= HELP_THRESHOLD) return true
  return before !== undefined && after > before && after >= 7
}

// ---------------------------------------------------------- effectiveness

const PRIOR_DROP = 1.5
const PRIOR_WEIGHT = 2

export interface Effectiveness {
  uses: number
  measured: number
  /** Average distress drop, shrunk toward a neutral prior when data is thin. */
  meanDrop: number
  /** Plain average of measured drops (what the student is shown). */
  rawMean: number
}

/** Unrated "It helped" (e.g. from SOS) counts as a modest, positive drop. */
const UNRATED_HELPED_DROP = PRIOR_DROP + 1

/**
 * How much one session lowered distress. Unrated outcomes count
 * symmetrically ("helped" positive, "not really" zero); a contradictory
 * "helped" with no measured drop is ignored rather than counted against it.
 */
export function sessionDrop(s: CalmSession): number | null {
  if (s.before !== undefined && s.after !== undefined) {
    const drop = s.before - s.after
    return s.outcome === 'helped' && drop <= 0 ? null : drop
  }
  if (s.outcome === 'helped') return UNRATED_HELPED_DROP
  if (s.outcome === 'not-really') return 0
  return null
}

export function effectiveness(
  sessions: CalmSession[],
  activityId: string,
): Effectiveness {
  const mine = sessions.filter((s) => s.activityId === activityId)
  const drops = mine.map(sessionDrop).filter((d): d is number => d !== null)
  const sum = drops.reduce((a, b) => a + b, 0)
  return {
    uses: mine.length,
    measured: drops.length,
    meanDrop: (sum + PRIOR_DROP * PRIOR_WEIGHT) / (drops.length + PRIOR_WEIGHT),
    rawMean: drops.length ? sum / drops.length : 0,
  }
}

// ---------------------------------------------------------------- engine

const DAY_MS = 24 * 60 * 60 * 1000

function overlap(a: CalmState[], b: CalmState[]): number {
  return a.filter((s) => b.includes(s)).length
}

function fits(activity: Activity, answers: CalmAnswers, prefs: CalmPrefs) {
  if (prefs.notForMe.includes(activity.id)) return false
  if (answers.states.includes('panic') && activity.avoidInPanic) return false
  if (answers.setting && !activity.settings.includes(answers.setting)) {
    return false
  }
  if (answers.setting === 'silent' && !activity.discreet) return false
  return activity.minutes <= answers.minutes
}

function score(
  activity: Activity,
  answers: CalmAnswers,
  ctx: CalmContext,
): number {
  const band = intensityBand(answers.intensity)
  let s = 3 * overlap(activity.states, answers.states)
  if (activity.intensity.includes(band)) s += 2
  if (ctx.phase && activity.phases?.includes(ctx.phase)) s += 1
  if (band === 'low' && activity.mode === 'mind') s += 1

  const eff = effectiveness(ctx.sessions, activity.id)
  if (eff.measured > 0) {
    s += Math.max(-2, Math.min(3, eff.meanDrop - PRIOR_DROP))
  } else {
    s += 0.5 // small nudge to try new things, so the engine keeps learning
  }

  const usedRecently = ctx.sessions.some(
    (x) =>
      x.activityId === activity.id &&
      ctx.now.getTime() - new Date(x.atISO).getTime() < DAY_MS,
  )
  if (usedRecently) s -= 1.5
  return s
}

function rank(
  candidates: Activity[],
  answers: CalmAnswers,
  ctx: CalmContext,
): Activity[] {
  // Stable sort: equal scores keep catalogue order (deterministic, testable).
  return candidates
    .map((a, i) => ({ a, i, s: score(a, answers, ctx) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.a)
}

/** Universal fallback: cyclic sighing works anywhere, silently, in a minute. */
const FALLBACK_ID = 'physiological-sigh'

/**
 * Recommend activities for this moment. Order of operations:
 *  1. Hard filters: time, setting, discretion, "not for me", breath holds in panic.
 *  2. High distress: the primary pick must be a body activity.
 *  3. Score: state match, intensity fit, phase fit, personal history, variety.
 *  4. High distress with 5+ minutes: suggest a thinking tool as the next step.
 */
export function recommendActivities(
  answers: CalmAnswers,
  ctx: CalmContext,
): CalmRecommendation {
  const band = intensityBand(answers.intensity)
  let pool = ACTIVITIES.filter((a) => fits(a, answers, ctx.prefs))
  // If filters are too tight, relax the time budget before giving up.
  if (pool.length === 0) {
    pool = ACTIVITIES.filter((a) =>
      fits(a, { ...answers, minutes: 15 }, ctx.prefs),
    )
  }

  const primaryPool =
    band === 'high' ? pool.filter((a) => a.mode === 'body') : pool
  const ranked = rank(primaryPool.length ? primaryPool : pool, answers, ctx)
  const primary = ranked[0] ?? getActivity(FALLBACK_ID)!

  const alternates = rank(
    pool.filter((a) => a.id !== primary.id),
    answers,
    ctx,
  ).slice(0, 2)

  let next: Activity | undefined
  const remaining = answers.minutes - primary.minutes
  if (band === 'high' && remaining >= 2) {
    next = rank(
      pool.filter(
        (a) =>
          a.mode === 'mind' &&
          a.minutes <= remaining &&
          overlap(a.states, answers.states) > 0,
      ),
      answers,
      ctx,
    )[0]
  }

  return {
    primary,
    alternates,
    next,
    reason: explain(primary, answers, ctx, next),
    showHelp: answers.intensity >= HELP_THRESHOLD,
  }
}

function explain(
  primary: Activity,
  answers: CalmAnswers,
  ctx: CalmContext,
  next?: Activity,
): string {
  const band = intensityBand(answers.intensity)
  const parts: string[] = []

  const feelings = answers.states.map((s) => stateLabel(s).toLowerCase())
  const where = answers.setting
    ? SETTINGS.find((s) => s.id === answers.setting)?.label.toLowerCase()
    : undefined
  parts.push(
    `You said ${feelings.length ? feelings.join(' and ') : 'you need a reset'}, ${intensityWord(
      answers.intensity,
    )} (${answers.intensity}/10)${where ? `, ${where}` : ''}.`,
  )

  if (band === 'high') {
    parts.push(
      'When the alarm is this loud, calming your body comes before thinking it through.',
    )
  } else if (band === 'low' && primary.mode === 'mind') {
    parts.push('You are steady enough to work with the thought itself.')
  }

  const eff = effectiveness(ctx.sessions, primary.id)
  if (eff.measured >= 2 && eff.meanDrop >= 2) {
    parts.push(
      `It has helped you before, lowering things by about ${Math.round(eff.rawMean)} points.`,
    )
  }
  if (answers.setting === 'silent')
    parts.push('It is silent, so no one will notice.')
  if (ctx.phase === 'final-sprint' || ctx.phase === 'exam-day') {
    parts.push('With your exam this close, short and simple is best.')
  }
  if (next)
    parts.push(
      `Then, if you have a few more minutes: ${next.name.toLowerCase()}.`,
    )
  return parts.join(' ')
}

// ------------------------------------------------------- stored data

const SOURCES: SessionSource[] = ['calm', 'library', 'sos', 'focus']
const OUTCOMES: SessionOutcome[] = ['helped', 'not-really', 'not-for-me']
const isRating = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10

/** Defensive parse of stored sessions: malformed items are dropped. */
export function normalizeSessions(raw: unknown): CalmSession[] {
  if (!Array.isArray(raw)) return []
  const out: CalmSession[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    if (
      typeof s.id !== 'string' ||
      typeof s.activityId !== 'string' ||
      typeof s.atISO !== 'string' ||
      !Array.isArray(s.states) ||
      !SOURCES.includes(s.source as SessionSource)
    ) {
      continue
    }
    out.push({
      id: s.id,
      activityId: s.activityId,
      atISO: s.atISO,
      states: s.states.filter((x): x is CalmState => typeof x === 'string'),
      before: isRating(s.before) ? s.before : undefined,
      after: isRating(s.after) ? s.after : undefined,
      outcome: OUTCOMES.includes(s.outcome as SessionOutcome)
        ? (s.outcome as SessionOutcome)
        : undefined,
      source: s.source as SessionSource,
    })
  }
  return out
}

/** Defensive parse of stored preferences. */
export function normalizePrefs(raw: unknown): CalmPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS }
  const p = raw as Record<string, unknown>
  return {
    notForMe: Array.isArray(p.notForMe)
      ? p.notForMe.filter((x): x is string => typeof x === 'string')
      : [],
    setting: SETTINGS.some((s) => s.id === p.setting)
      ? (p.setting as Setting)
      : undefined,
    haptics: typeof p.haptics === 'boolean' ? p.haptics : DEFAULT_PREFS.haptics,
  }
}

// ------------------------------------------------------ learning summaries

export interface CopingRow {
  state: CalmState
  activityId: string
  meanDrop: number
  uses: number
}

/**
 * "When I feel X, I do Y": the best-proven activity per state, from the
 * student's own before/after ratings. Needs 2+ measured uses to count.
 */
export function copingCard(sessions: CalmSession[]): CopingRow[] {
  const rows: CopingRow[] = []
  const states = new Set(sessions.flatMap((s) => s.states))
  for (const state of states) {
    const relevant = sessions.filter((s) => s.states.includes(state))
    let best: CopingRow | null = null
    for (const activityId of new Set(relevant.map((s) => s.activityId))) {
      const drops = relevant
        .filter((s) => s.activityId === activityId)
        .map(sessionDrop)
        .filter((d): d is number => d !== null)
      if (drops.length < 2) continue
      const meanDrop = drops.reduce((a, b) => a + b, 0) / drops.length
      if (meanDrop >= 1.5 && (!best || meanDrop > best.meanDrop)) {
        best = { state, activityId, meanDrop, uses: drops.length }
      }
    }
    if (best) rows.push(best)
  }
  return rows.sort((a, b) => b.meanDrop - a.meanDrop)
}

export interface CalmWins {
  /** Sessions in the last 30 days that lowered distress by 2+ points. */
  count: number
  /** The biggest single drop in that window. */
  best?: { before: number; after: number }
}

export function calmWins(sessions: CalmSession[], now: Date): CalmWins {
  const since = now.getTime() - 30 * DAY_MS
  const wins = sessions.filter(
    (s) =>
      new Date(s.atISO).getTime() >= since &&
      s.before !== undefined &&
      s.after !== undefined &&
      s.before - s.after >= 2,
  )
  let best: CalmWins['best']
  for (const s of wins) {
    const drop = s.before! - s.after!
    if (!best || drop > best.before - best.after) {
      best = { before: s.before!, after: s.after! }
    }
  }
  return { count: wins.length, best }
}
