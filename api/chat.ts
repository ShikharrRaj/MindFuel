/**
 * POST /api/chat — server-side streaming companion chat.
 *
 * Streams Gemini's reply token-by-token so the UI feels instant (real
 * streaming, not an artificial delay). Like /api/analyze, the API key stays
 * server-side and the request is size-capped, validated and rate limited
 * first. The crisis fast-path runs BEFORE the rate limit and never calls the
 * model, so a student in crisis always gets helplines.
 */

import { GoogleGenAI } from '@google/genai'
import { classifyAiError, describeError } from '../src/lib/aiError'
import { buildPromptContext } from '../src/lib/context'
import { buildChatSystemInstruction } from '../src/lib/prompts'
import { detectCrisis, HELPLINES, SUPPORT_DISCLAIMER } from '../src/lib/safety'
import { callWithFallback, modelChain, thinkingConfigFor } from './_lib/ai'
import { json, readJson, streamHeaders, textStream } from './_lib/http'
import { checkRateLimit, limitMessage, limitStatus } from './_lib/rateLimit'
import { MAX_CHAT_BYTES, parseChatBody } from './_lib/validate'

export const config = { runtime: 'edge' }

/** Appended when the model stream fails part-way, so the cut is visible. */
export const STREAM_CUT_NOTE =
  '\n\n(Sorry, my reply was cut off. Please send your message again.)'
export const EMPTY_REPLY =
  'Sorry, I could not reply just now. Please send your message again.'

/** Stop a reply that stalls between chunks, or runs too long overall. */
const STREAM_IDLE_MS = 15_000
const STREAM_DEADLINE_MS = 50_000

function crisisReply(): string {
  const lines = HELPLINES.map((h) => `• ${h.name}: ${h.contact} — ${h.detail}`)
  return `I'm really glad you told me, and I'm concerned about how much pain you're in right now. You deserve support from someone who can be fully present with you. Please consider reaching out right now:\n\n${lines.join(
    '\n',
  )}\n\nIf you might act on these feelings, please contact emergency services or go to the nearest hospital. ${SUPPORT_DISCLAIMER}`
}

const error = (message: string, status: number, headers = {}) =>
  json({ error: message }, status, headers)

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const raw = await readJson(req, MAX_CHAT_BYTES)
  if (!raw.ok) return error(raw.error, raw.status)
  const parsed = parseChatBody(raw.value)
  if (!parsed.ok) return error(parsed.error, parsed.status)
  const body = parsed.value
  const last = body.messages[body.messages.length - 1]

  // Crisis fast-path: care + helplines directly, no model call, no limit.
  if (detectCrisis(last.content).isCrisis) return textStream(crisisReply())

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return error('Server is not configured.', 500)

  const limit = await checkRateLimit(req, 'chat')
  if (!limit.ok) {
    return error(
      limitMessage('chat', limit.reason),
      limitStatus(limit.reason),
      {
        'retry-after': String(limit.retryAfterSec),
      },
    )
  }

  const ctx = buildPromptContext(body, new Date())

  // The request's lifetime: ends on client disconnect, an idle stream, or the
  // overall deadline, and stops the model call (and its token spend) with it.
  const life = new AbortController()
  const stop = () => life.abort()
  req.signal?.addEventListener('abort', stop, { once: true })

  let stream: AsyncIterable<{ text?: string }>
  try {
    const ai = new GoogleGenAI({ apiKey })
    stream = await callWithFallback(
      modelChain(),
      (model, signal) =>
        ai.models.generateContentStream({
          model,
          contents: body.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          config: {
            systemInstruction: buildChatSystemInstruction(ctx),
            temperature: 0.8,
            // No extended thinking: snappier, lower-latency streaming.
            thinkingConfig: thinkingConfigFor(model),
            maxOutputTokens: 600,
            abortSignal: signal,
          },
        }),
      { signal: life.signal },
    )
  } catch (err) {
    req.signal?.removeEventListener('abort', stop)
    const { status, message } = classifyAiError(
      err,
      'Could not reach the companion right now. Please try again.',
    )
    console.error(
      JSON.stringify({ type: 'chat_error', status, ...describeError(err) }),
    )
    return error(message, status)
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const push = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          /* the client has gone */
        }
      }
      // Rejects when the lifetime ends, so a stalled read can't hang forever.
      const ended = new Promise<never>((_, reject) => {
        life.signal.addEventListener(
          'abort',
          () => reject(new Error('stream stopped')),
          { once: true },
        )
      })
      ended.catch(() => {})
      let idle: ReturnType<typeof setTimeout> | undefined
      const arm = () => {
        clearTimeout(idle)
        idle = setTimeout(stop, STREAM_IDLE_MS)
      }
      const deadline = setTimeout(stop, STREAM_DEADLINE_MS)
      const it = stream[Symbol.asyncIterator]()
      let sent = false
      try {
        arm()
        for (;;) {
          const next = await Promise.race([it.next(), ended])
          if (next.done) break
          arm()
          const piece = next.value.text
          if (piece) {
            push(piece)
            sent = true
          }
        }
        if (!sent) push(EMPTY_REPLY)
      } catch (err) {
        if (!req.signal?.aborted) {
          console.error(
            JSON.stringify({
              type: 'chat_stream_error',
              stopped: life.signal.aborted,
              ...describeError(err),
            }),
          )
        }
        push(sent ? STREAM_CUT_NOTE : EMPTY_REPLY)
        void it.return?.().catch(() => {})
      } finally {
        clearTimeout(idle)
        clearTimeout(deadline)
        req.signal?.removeEventListener('abort', stop)
        stop() // release the model call either way
        try {
          controller.close()
        } catch {
          /* already closed by the client */
        }
      }
    },
    cancel() {
      stop()
    },
  })

  return new Response(readable, { headers: streamHeaders() })
}
