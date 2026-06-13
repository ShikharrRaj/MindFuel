/**
 * Shared helpers for turning raw Gemini SDK failures into honest, user-facing
 * responses. The model is reached over the network on a free-tier key, so two
 * failure modes dominate: 429 RESOURCE_EXHAUSTED (quota/rate limit) and 503
 * UNAVAILABLE (transient overload). We classify these so the UI can show calm,
 * specific guidance instead of a scary "something went wrong" — and so callers
 * know which failures are worth a quick retry.
 */

export interface ClassifiedError {
  /** HTTP status to return to the browser. */
  status: number
  /** Friendly, on-brand message safe to show the user. */
  message: string
  /** True for transient errors (overload) that a short retry may clear. */
  retryable: boolean
}

/**
 * Map a thrown Gemini error to a status + message. We match on the error text
 * because the SDK surfaces the upstream code (e.g. "429", "RESOURCE_EXHAUSTED")
 * inside the message rather than a stable field.
 */
export function classifyAiError(
  err: unknown,
  fallback: string,
): ClassifiedError {
  const text = (err instanceof Error ? err.message : String(err)).toLowerCase()

  if (
    text.includes('429') ||
    text.includes('resource_exhausted') ||
    text.includes('quota') ||
    text.includes('rate limit')
  ) {
    return {
      status: 429,
      message:
        "I'm getting a lot of messages right now — give me a few seconds and try again.",
      retryable: false, // quota waits are far longer than a request can stay open
    }
  }

  if (
    text.includes('503') ||
    text.includes('unavailable') ||
    text.includes('overloaded')
  ) {
    return {
      status: 503,
      message:
        'The companion is briefly overloaded. Please try again in a moment.',
      retryable: true,
    }
  }

  return { status: 502, message: fallback, retryable: false }
}

/** Sleep helper for backoff between retries. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run `fn`, retrying once on a transient (overload) error after a short pause.
 * We deliberately do NOT retry quota errors: the model asks us to wait tens of
 * seconds, which outlives the request, so an immediate retry would only fail
 * again and waste the function's time budget.
 */
export async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!classifyAiError(err, '').retryable) throw err
    await delay(500)
    return fn()
  }
}
