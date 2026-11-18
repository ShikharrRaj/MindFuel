/**
 * Validators for data that crosses a trust boundary: the AI model's reply
 * (server), and anything read back from storage or a restored backup file
 * (browser). Pure functions: they coerce what is usable and drop the rest, so
 * a corrupted or hand-edited value can never crash the app.
 */

import { EXAM_LABELS } from './exams'
import { isRecord } from './guards'
import { MAX_TAG_LENGTH, MAX_TAGS, MAX_TEXT_LENGTH } from './limits'
import type {
  Analysis,
  ExamType,
  JournalEntry,
  MoodLevel,
  Severity,
  UserProfile,
} from './types'

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function strList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => str(v, maxLen))
    .filter(Boolean)
    .slice(0, maxItems)
}

const SEVERITIES: Severity[] = ['ok', 'elevated', 'crisis']

/**
 * Coerce a model reply (or a stored one) into a complete {@link Analysis}, or
 * null if it is unusable (no summary and no coping steps). An unknown
 * severity becomes "elevated": unsure is never treated as fine.
 */
export function normalizeAnalysis(raw: unknown): Analysis | null {
  if (!isRecord(raw)) return null
  const coping = isRecord(raw.copingStrategy) ? raw.copingStrategy : {}
  const analysis: Analysis = {
    triggers: strList(raw.triggers, 6, 80),
    themes: strList(raw.themes, 6, 80),
    tone: str(raw.tone, 120),
    summary: str(raw.summary, 1200),
    copingStrategy: {
      title: str(coping.title, 120) || 'A small next step',
      steps: strList(coping.steps, 6, 400),
    },
    encouragement: str(raw.encouragement, 600),
    reasoning: str(raw.reasoning, 1200),
    severity: SEVERITIES.includes(raw.severity as Severity)
      ? (raw.severity as Severity)
      : 'elevated',
  }
  if (!analysis.summary && analysis.copingStrategy.steps.length === 0) {
    return null
  }
  return analysis
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeProfile(raw: unknown): UserProfile | null {
  if (!isRecord(raw)) return null
  const exam = raw.exam
  if (typeof exam !== 'string' || !Object.hasOwn(EXAM_LABELS, exam)) {
    return null
  }
  const date = raw.examDateISO
  if (typeof date !== 'string' || !ISO_DATE.test(date)) return null
  if (Number.isNaN(Date.parse(date))) return null
  const name = str(raw.name, 60)
  return {
    exam: exam as ExamType,
    examDateISO: date,
    ...(name ? { name } : {}),
  }
}

function normalizeEntry(raw: unknown): JournalEntry | null {
  if (!isRecord(raw)) return null
  const { id, createdAtISO, mood, text } = raw
  if (typeof id !== 'string' || !id) return null
  if (typeof createdAtISO !== 'string') return null
  if (Number.isNaN(Date.parse(createdAtISO))) return null
  if (typeof mood !== 'number' || !Number.isInteger(mood)) return null
  if (mood < 1 || mood > 5) return null
  if (typeof text !== 'string') return null
  const analysis =
    raw.analysis === undefined ? null : normalizeAnalysis(raw.analysis)
  return {
    id: id.slice(0, 64),
    createdAtISO,
    mood: mood as MoodLevel,
    text: text.slice(0, MAX_TEXT_LENGTH),
    tags: strList(raw.tags, MAX_TAGS, MAX_TAG_LENGTH),
    ...(analysis ? { analysis } : {}),
  }
}

/** Keep every well-formed entry, in order; drop the rest. */
export function normalizeEntries(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return []
  const out: JournalEntry[] = []
  for (const item of raw) {
    const entry = normalizeEntry(item)
    if (entry) out.push(entry)
  }
  return out
}
