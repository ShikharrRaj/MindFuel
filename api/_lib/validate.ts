/**
 * Request validation for the Edge functions. Everything the client sends is
 * untrusted: it is type-checked, length-capped and stripped of control
 * characters before any of it reaches a prompt. The model's output is checked
 * too (normalizeAnalysis), so a malformed reply never reaches the UI.
 */

import { EXAM_LABELS } from '../../src/lib/exams'
import { CONTROL_CHARS, isRecord } from '../../src/lib/guards'
import {
  MAX_HISTORY,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TEXT_LENGTH,
} from '../../src/lib/limits'
import type { ChatMessage, ExamType } from '../../src/lib/types'

/** Total characters of chat history sent to the model (oldest turns dropped). */
const MAX_HISTORY_CHARS = 30_000

/** Bytes, not characters: Devanagari is 3 bytes per character in UTF-8. */
export const MAX_ANALYZE_BYTES = 32 * 1024
export const MAX_CHAT_BYTES = 384 * 1024

const NO_HISTORY = 'no prior check-ins yet'

/**
 * The mood summary goes into the system prompt, so only the exact shape the
 * app produces (insights.ts summarizeRecentMood) is accepted; anything else,
 * e.g. an injected instruction, is replaced by the neutral default.
 */
const MOOD_SUMMARY =
  /^recent mood averaging [1-5]\.\d\/5 over [1-5] check-ins?(, trending (up|down))?$/

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string }

const fail = (status: number, error: string) =>
  ({ ok: false, status, error }) as const

function cleanText(value: string): string {
  return value.replace(CONTROL_CHARS, '').trim()
}

/** One line, collapsed whitespace: for short context strings. */
function cleanLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return cleanText(value).replace(/\s+/g, ' ').slice(0, max)
}

function parseContext(
  body: Record<string, unknown>,
): Parsed<{ exam: ExamType; examDateISO: string; recentMoodSummary: string }> {
  const exam = body.exam
  if (typeof exam !== 'string' || !Object.hasOwn(EXAM_LABELS, exam)) {
    return fail(400, 'Unknown exam.')
  }
  const examDateISO = body.examDateISO
  if (
    typeof examDateISO !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(examDateISO) ||
    Number.isNaN(Date.parse(examDateISO))
  ) {
    return fail(400, 'Exam date must be YYYY-MM-DD.')
  }
  const summary = cleanLine(body.recentMoodSummary, 120)
  return {
    ok: true,
    value: {
      exam: exam as ExamType,
      examDateISO,
      recentMoodSummary: MOOD_SUMMARY.test(summary) ? summary : NO_HISTORY,
    },
  }
}

export interface AnalyzeInput {
  exam: ExamType
  examDateISO: string
  recentMoodSummary: string
  mood: number
  text: string
  tags: string[]
}

export function parseAnalyzeBody(raw: unknown): Parsed<AnalyzeInput> {
  if (!isRecord(raw)) return fail(400, 'Invalid request.')
  const ctx = parseContext(raw)
  if (!ctx.ok) return ctx

  if (typeof raw.text !== 'string') {
    return fail(400, 'Journal text is required.')
  }
  // The prompt fences the entry in """ quotes; keep the entry inside them.
  const text = cleanText(raw.text).replace(/"{3,}/g, '"')
  if (!text) return fail(400, 'Journal text is required.')
  if (text.length > MAX_TEXT_LENGTH) {
    return fail(413, 'Journal entry is too long.')
  }

  const mood = raw.mood
  if (typeof mood !== 'number' || !Number.isInteger(mood)) {
    return fail(400, 'Mood must be between 1 and 5.')
  }
  if (mood < 1 || mood > 5) return fail(400, 'Mood must be between 1 and 5.')

  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .map((t) => cleanLine(t, MAX_TAG_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : []

  return { ok: true, value: { ...ctx.value, mood, text, tags } }
}

export interface ChatInput {
  exam: ExamType
  examDateISO: string
  recentMoodSummary: string
  messages: ChatMessage[]
}

export function parseChatBody(raw: unknown): Parsed<ChatInput> {
  if (!isRecord(raw)) return fail(400, 'Invalid request.')
  const ctx = parseContext(raw)
  if (!ctx.ok) return ctx
  if (!Array.isArray(raw.messages)) {
    return fail(400, 'A user message is required.')
  }

  const messages: ChatMessage[] = []
  for (const m of raw.messages.slice(-MAX_HISTORY)) {
    if (!isRecord(m) || typeof m.content !== 'string') {
      return fail(400, 'Invalid message.')
    }
    if (m.role !== 'user' && m.role !== 'assistant') {
      return fail(400, 'Invalid message.')
    }
    const content = cleanText(m.content)
    if (content.length > MAX_TEXT_LENGTH) {
      return fail(413, 'Message is too long.')
    }
    if (content) messages.push({ role: m.role, content })
  }

  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user') {
    return fail(400, 'A user message is required.')
  }
  // A long conversation is never refused: the oldest turns are dropped until
  // it fits, always keeping the latest message.
  let total = messages.reduce((n, m) => n + m.content.length, 0)
  while (total > MAX_HISTORY_CHARS && messages.length > 1) {
    total -= messages.shift()!.content.length
  }
  return { ok: true, value: { ...ctx.value, messages } }
}

/** The model reply is validated with the same rules as stored data. */
export { normalizeAnalysis } from '../../src/lib/normalize'
