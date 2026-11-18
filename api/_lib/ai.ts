/**
 * Model selection and resilient calls for the Edge functions.
 *
 * The model ID comes from env (GEMINI_MODEL), so a Google deprecation is a
 * config change, not a code change. When the primary model is overloaded,
 * rate-limited or slow, one attempt goes to a fallback model
 * (GEMINI_FALLBACK_MODEL). Each attempt has its own timeout, so the whole call
 * stays inside Vercel's 25 s Edge response window.
 */

import { ThinkingLevel, type ThinkingConfig } from '@google/genai'
import { upstreamStatus } from '../../src/lib/aiError'

const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite'

/** Per-attempt timeout. Two attempts plus overhead must stay under 25 s. */
const ATTEMPT_TIMEOUT_MS = 11_000

interface CallOptions {
  timeoutMs?: number
  /** The request's lifetime: aborting it stops the current attempt. */
  signal?: AbortSignal
}

const MODEL_ID = /^[a-z0-9][a-z0-9.-]{1,63}$/i

type Env = Record<string, string | undefined>

function pick(value: string | undefined, fallback: string): string {
  const v = value?.trim()
  return v && MODEL_ID.test(v) ? v : fallback
}

/** Models to try, in order. GEMINI_FALLBACK_MODEL=none disables the fallback. */
export function modelChain(env: Env = process.env): string[] {
  const primary = pick(env.GEMINI_MODEL, DEFAULT_MODEL)
  const raw = env.GEMINI_FALLBACK_MODEL?.trim().toLowerCase()
  if (raw === 'none' || raw === 'off') return [primary]
  const fallback = pick(env.GEMINI_FALLBACK_MODEL, DEFAULT_FALLBACK_MODEL)
  return fallback === primary ? [primary] : [primary, fallback]
}

/**
 * Turn extended thinking off: these tasks need none, and thinking tokens cost
 * money and latency. Gemini 2.x takes a budget; 3.x takes a level and rejects
 * a zero budget on some models (verified 2026-11-11).
 */
export function thinkingConfigFor(model: string): ThinkingConfig {
  return /^gemini-2\./.test(model)
    ? { thinkingBudget: 0 }
    : { thinkingLevel: ThinkingLevel.MINIMAL }
}

/** Upstream statuses worth another attempt on the same model. */
const TRANSIENT = new Set([500, 503, 504])
/** Worth trying a *different* model: quota, or the model was retired. */
const MODEL_SPECIFIC = new Set([404, 429])

/**
 * Run `call` against the model chain. Each attempt gets its own timeout, and
 * `signal` (the request's lifetime) aborts whichever attempt is running, or
 * the stream it returned. Moves on only for a timeout, a transient upstream
 * error, or a quota / not-found error when the next attempt uses another
 * model. With a single model, a transient error gets one retry.
 */
export async function callWithFallback<T>(
  models: string[],
  call: (model: string, signal: AbortSignal) => Promise<T>,
  { timeoutMs = ATTEMPT_TIMEOUT_MS, signal }: CallOptions = {},
): Promise<T> {
  const attempts = models.length > 1 ? models : [models[0], models[0]]
  let lastError: unknown
  for (let i = 0; i < attempts.length; i++) {
    if (signal?.aborted) throw new Error('request was cancelled')
    const model = attempts[i]
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, timeoutMs)
    try {
      // The parent listener stays attached on success, so ending the request
      // also stops a stream this attempt returned.
      return await call(model, controller.signal)
    } catch (err) {
      signal?.removeEventListener('abort', abort)
      const timedOut = controller.signal.aborted && !signal?.aborted
      lastError = timedOut
        ? new Error('503 UNAVAILABLE: the model did not respond in time')
        : err
      const next = attempts[i + 1]
      if (next === undefined || signal?.aborted) break
      const upstream = upstreamStatus(lastError)
      const switching = next !== model
      const retry =
        timedOut ||
        (upstream !== undefined && TRANSIENT.has(upstream)) ||
        (switching && upstream !== undefined && MODEL_SPECIFIC.has(upstream))
      if (!retry) break
      console.warn(
        JSON.stringify({
          type: 'ai_retry',
          model,
          next,
          reason: timedOut ? 'timeout' : upstream,
        }),
      )
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}
