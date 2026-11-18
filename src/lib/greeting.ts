/**
 * Greeting — a warm, time-of-day welcome for the top of the app. Pure, so the
 * wording is testable. Late at night it gently says so rather than cheering
 * the student on: rest is part of exam prep, not a break from it.
 */

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'late'

export function partOfDay(date: Date): PartOfDay {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'late'
}

const SALUTATION: Record<PartOfDay, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  late: 'Still awake',
}

const LINES: Record<PartOfDay, string[]> = {
  morning: [
    'A fresh page. Begin wherever feels easiest.',
    'One unhurried breath before the books open.',
    'You do not have to win the whole day. Just the next hour.',
  ],
  afternoon: [
    'Halfway through the day. A short pause still counts as progress.',
    'If your focus is fading, that is your mind asking for a break, not a sign you are behind.',
    'Drink some water, roll your shoulders, then carry on.',
  ],
  evening: [
    'You showed up today. That matters more than a perfect day.',
    'Whatever got done today is enough to build on tomorrow.',
    'Let the day settle. There is room here to breathe out.',
  ],
  late: [
    'It is late. Sleep is part of the plan, not a break from it.',
    'Your memory files away today’s work while you sleep. Be gentle with yourself tonight.',
    'Nothing has to be solved tonight. A calm mind works better in the morning.',
  ],
}

export interface Greeting {
  part: PartOfDay
  /** e.g. "Good evening, Asha" or "Still awake?" */
  title: string
  line: string
}

/** Day of the year, so the line changes daily but stays put within a day. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000)
}

export function greetingFor(date: Date, name?: string): Greeting {
  const part = partOfDay(date)
  const who = name?.trim()
  const base = SALUTATION[part]
  const title =
    part === 'late'
      ? `${base}${who ? `, ${who}` : ''}?`
      : `${base}${who ? `, ${who}` : ''}`
  const lines = LINES[part]
  return { part, title, line: lines[dayOfYear(date) % lines.length] }
}
