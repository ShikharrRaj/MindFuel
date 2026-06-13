/**
 * Insights engine — turns a history of check-ins into the patterns that
 * "standard trackers miss". All PURE functions over a list of entries, so the
 * dashboard is fully testable without a DOM or network.
 */

import type { JournalEntry } from './types'

export interface TriggerCount {
  trigger: string
  count: number
}

export interface MoodPoint {
  /** YYYY-MM-DD */
  date: string
  /** Average mood for that day (entries can be multiple per day). */
  mood: number
}

/** Group the most frequently AI-detected stress triggers, most common first. */
export function topTriggers(entries: JournalEntry[], limit = 6): TriggerCount[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const raw of entry.analysis?.triggers ?? []) {
      const trigger = raw.trim().toLowerCase()
      if (!trigger) continue
      counts.set(trigger, (counts.get(trigger) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count || a.trigger.localeCompare(b.trigger))
    .slice(0, limit)
}

/** Daily average mood series, oldest first — the trend line for the dashboard. */
export function moodTrend(entries: JournalEntry[]): MoodPoint[] {
  const byDay = new Map<string, number[]>()
  for (const entry of entries) {
    const day = entry.createdAtISO.slice(0, 10)
    const list = byDay.get(day) ?? []
    list.push(entry.mood)
    byDay.set(day, list)
  }
  return [...byDay.entries()]
    .map(([date, moods]) => ({
      date,
      mood: moods.reduce((sum, m) => sum + m, 0) / moods.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Average mood across all entries (0 if none). Used for the headline stat. */
export function averageMood(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0
  const total = entries.reduce((sum, e) => sum + e.mood, 0)
  return total / entries.length
}

/** Local calendar-day key (YYYY-MM-DD), avoiding the UTC shift `toISOString` causes. */
function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Count consecutive days (ending today) with at least one entry — the "streak".
 * A small, honest gamification nudge toward the daily habit the brief wants.
 */
export function currentStreak(entries: JournalEntry[], now: Date): number {
  const days = new Set(entries.map((e) => e.createdAtISO.slice(0, 10)))
  let streak = 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Allow the streak to start from today OR yesterday, so an evening check-in
  // pattern isn't punished for not having logged "today" yet.
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(localDayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * A short, privacy-preserving sentence summarising recent mood, sent to the AI
 * instead of the full journal history. Keeps the payload tiny and personal data
 * on-device while still giving the model useful context.
 */
export function summarizeRecentMood(entries: JournalEntry[]): string {
  if (entries.length === 0) return 'no prior check-ins yet'
  const recent = entries.slice(-5)
  const avg = averageMood(recent)
  const trend = moodTrend(recent)
  let direction = ''
  if (trend.length >= 2) {
    const delta = trend[trend.length - 1].mood - trend[0].mood
    if (delta >= 0.5) direction = ', trending up'
    else if (delta <= -0.5) direction = ', trending down'
  }
  return `recent mood averaging ${avg.toFixed(1)}/5 over ${recent.length} check-in${
    recent.length === 1 ? '' : 's'
  }${direction}`
}

/**
 * Compare average mood on days the student logged a given tag vs. days they did
 * not. This surfaces non-obvious correlations like "your mood dips on
 * mock-test days" — exactly the hidden pattern the brief asks for.
 * Returns null if there isn't enough data on both sides to be meaningful.
 */
export function tagMoodImpact(
  entries: JournalEntry[],
  tag: string,
): { withTag: number; withoutTag: number; delta: number } | null {
  const withTag: number[] = []
  const withoutTag: number[] = []
  for (const entry of entries) {
    if (entry.tags.includes(tag)) withTag.push(entry.mood)
    else withoutTag.push(entry.mood)
  }
  if (withTag.length === 0 || withoutTag.length === 0) return null
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const a = avg(withTag)
  const b = avg(withoutTag)
  return { withTag: a, withoutTag: b, delta: a - b }
}
