/**
 * POST /api/analyze — server-side Gemini journal analysis.
 *
 * Runs on Vercel's Edge runtime. The GEMINI_API_KEY lives only in the server
 * environment and is NEVER shipped to the browser — this is the core of the
 * app's security posture. The request is size-capped, validated and rate
 * limited before it reaches the model; the reply is schema-checked; and a
 * local crisis check overrides the AI severity as a fail-safe (defence in
 * depth). The journal text is not stored or logged.
 */

import { GoogleGenAI, Type } from '@google/genai'
import { classifyAiError, describeError } from '../src/lib/aiError'
import { buildPromptContext } from '../src/lib/context'
import {
  buildAnalyzeSystemInstruction,
  buildAnalyzeUserContent,
} from '../src/lib/prompts'
import { detectCrisis } from '../src/lib/safety'
import { callWithFallback, modelChain, thinkingConfigFor } from './_lib/ai'
import { json, readJson } from './_lib/http'
import { checkRateLimit, limitMessage, limitStatus } from './_lib/rateLimit'
import { normalizeAnalysis } from '../src/lib/normalize'
import { MAX_ANALYZE_BYTES, parseAnalyzeBody } from './_lib/validate'

export const config = { runtime: 'edge' }

/** JSON schema forcing Gemini to return a well-formed Analysis. */
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

const FALLBACK_ERROR =
  'Could not analyse the entry right now. Please try again.'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return json({ error: 'Server is not configured.' }, 500)

  const raw = await readJson(req, MAX_ANALYZE_BYTES)
  if (!raw.ok) return json({ error: raw.error }, raw.status)
  const parsed = parseAnalyzeBody(raw.value)
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
  const body = parsed.value

  // The browser runs the same crisis check before it calls us, so a limited
  // request never hides helplines from a student in crisis.
  const limit = await checkRateLimit(req, 'analyze')
  if (!limit.ok) {
    return json(
      { error: limitMessage('analyze', limit.reason) },
      limitStatus(limit.reason),
      {
        'retry-after': String(limit.retryAfterSec),
      },
    )
  }

  const ctx = buildPromptContext(body, new Date())

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await callWithFallback(
      modelChain(),
      (model, signal) =>
        ai.models.generateContent({
          model,
          contents: buildAnalyzeUserContent(body.mood, body.text, body.tags),
          config: {
            systemInstruction: buildAnalyzeSystemInstruction(ctx),
            responseMimeType: 'application/json',
            responseSchema: ANALYSIS_SCHEMA,
            temperature: 0.7,
            // No extended thinking: faster, cheaper, and the whole JSON reply
            // fits in the output budget.
            thinkingConfig: thinkingConfigFor(model),
            maxOutputTokens: 1200,
            abortSignal: signal,
          },
        }),
      // A closed tab cancels the model call instead of paying for it.
      { signal: req.signal },
    )

    let modelJson: unknown = null
    try {
      modelJson = JSON.parse(response.text ?? '')
    } catch {
      /* handled below */
    }
    const analysis = normalizeAnalysis(modelJson)
    if (!analysis) {
      console.error(JSON.stringify({ type: 'analyze_bad_model_output' }))
      return json({ error: FALLBACK_ERROR }, 502)
    }

    // Fail-safe: a local crisis match always wins, even if the model under-rates.
    if (detectCrisis(body.text).isCrisis) analysis.severity = 'crisis'

    return json({ analysis })
  } catch (err) {
    const { status, message } = classifyAiError(err, FALLBACK_ERROR)
    console.error(
      JSON.stringify({ type: 'analyze_error', status, ...describeError(err) }),
    )
    return json({ error: message }, status)
  }
}
