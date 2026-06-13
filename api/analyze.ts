/**
 * POST /api/analyze — server-side Gemini journal analysis.
 *
 * Runs on Vercel's Edge runtime. The GEMINI_API_KEY lives only in the server
 * environment and is NEVER shipped to the browser — this is the core of the
 * app's security posture. Input is validated and length-capped before it ever
 * reaches the model, and a local crisis check overrides the AI severity as a
 * fail-safe (defence in depth).
 */

import { GoogleGenAI, Type } from '@google/genai'
import { classifyAiError, withTransientRetry } from '../src/lib/aiError'
import { buildPromptContext } from '../src/lib/context'
import {
  buildAnalyzeSystemInstruction,
  buildAnalyzeUserContent,
} from '../src/lib/prompts'
import { detectCrisis } from '../src/lib/safety'
import type { Analysis, ExamType } from '../src/lib/types'

export const config = { runtime: 'edge' }

const MODEL = 'gemini-2.5-flash'
const MAX_TEXT_LENGTH = 4000

/** JSON schema forcing Gemini to return a well-formed {@link Analysis}. */
const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
    themes: { type: Type.ARRAY, items: { type: Type.STRING } },
    tone: { type: Type.STRING },
    summary: { type: Type.STRING },
    copingStrategy: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['title', 'steps'],
    },
    encouragement: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    severity: { type: Type.STRING, enum: ['ok', 'elevated', 'crisis'] },
  },
  required: [
    'triggers',
    'themes',
    'tone',
    'summary',
    'copingStrategy',
    'encouragement',
    'reasoning',
    'severity',
  ],
}

interface AnalyzeBody {
  exam: ExamType
  examDateISO: string
  mood: number
  text: string
  tags: string[]
  recentMoodSummary: string
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return json({ error: 'Server is not configured.' }, 500)

  let body: AnalyzeBody
  try {
    body = (await req.json()) as AnalyzeBody
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const text = (body.text ?? '').trim()
  if (!text) return json({ error: 'Journal text is required.' }, 400)
  if (text.length > MAX_TEXT_LENGTH) {
    return json({ error: 'Journal entry is too long.' }, 413)
  }
  const mood = Number(body.mood)
  if (!Number.isFinite(mood) || mood < 1 || mood > 5) {
    return json({ error: 'Mood must be between 1 and 5.' }, 400)
  }

  const ctx = buildPromptContext(
    {
      exam: body.exam,
      examDateISO: body.examDateISO,
      recentMoodSummary: body.recentMoodSummary || 'no prior check-ins yet',
    },
    new Date(),
  )

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await withTransientRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents: buildAnalyzeUserContent(mood, text, body.tags ?? []),
        config: {
          systemInstruction: buildAnalyzeSystemInstruction(ctx),
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_SCHEMA,
          temperature: 0.7,
          // gemini-2.5-flash is a "thinking" model whose reasoning tokens count
          // against the output budget. This task needs no extended reasoning, so
          // we disable thinking — it makes responses faster, cheaper, and ensures
          // the full structured JSON fits within the output budget.
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 1200,
        },
      }),
    )

    const analysis = JSON.parse(response.text ?? '{}') as Analysis

    // Fail-safe: a local crisis match always wins, even if the model under-rates.
    if (detectCrisis(text).isCrisis) analysis.severity = 'crisis'

    return json({ analysis })
  } catch (err) {
    console.error('analyze error:', err)
    const { status, message } = classifyAiError(
      err,
      'Could not analyse the entry right now. Please try again.',
    )
    return json({ error: message }, status)
  }
}
