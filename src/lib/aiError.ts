/**
 * Shared helpers for turning raw Gemini SDK failures into honest, user-facing
 * responses, and into log lines that never carry model or user text.
 *
 * The SDK's ApiError has a numeric `status`; we read that first and only fall
 * back to the message text (e.g. a network or stream error with no status).
 */

export interface ClassifiedError {
  /** HTTP status to return to the browser. */
  status: number
  /** Friendly, on-brand message safe to show the user. */
  message: string
}

/** Upstream HTTP status of a Gemini failure, if one can be found. */
export function upstreamStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status
  if (typeof status === 'number' && status >= 100 && status < 600) {
    return status
  }
  const text = err instanceof Error ? err.message : String(err)
  const code = /"code"\s*:\s*(\d{3})/.exec(text) ?? /^(\d{3})\b/.exec(text)
  return code ? Number(code[1]) : undefined
}

const GOOGLE_STATUS =
  /\b(RESOURCE_EXHAUSTED|UNAVAILABLE|INVALID_ARGUMENT|NOT_FOUND|PERMISSION_DENIED|DEADLINE_EXCEEDED|INTERNAL|FAILED_PRECONDITION)\b/

/**
 * What to log about a failure: its type and status codes only. The SDK's
 * messages can quote model output (e.g. a stream chunk it failed to parse),
 * and logs must never hold journal-derived text.
 */
export function describeError(err: unknown): {
  name: string
  upstream?: number
  code?: string
} {
  const name = err instanceof Error ? err.name : typeof err
  const text = err instanceof Error ? err.message : String(err)
  const upstream = upstreamStatus(err)
  const code = GOOGLE_STATUS.exec(text)?.[1]
  return {
    name,
    ...(upstream ? { upstream } : {}),
    ...(code ? { code } : {}),
  }
}

/** Map a thrown Gemini error to a status + calm message for the browser. */
export function classifyAiError(
  err: unknown,
  fallback: string,
): ClassifiedError {
  const upstream = upstreamStatus(err)
  const text = (err instanceof Error ? err.message : String(err)).toLowerCase()

  const quota =
    upstream === 429 ||
    (upstream === undefined &&
      (text.includes('resource_exhausted') || text.includes('rate limit')))
  if (quota) {
    return {
      status: 429,
      message:
        "I'm getting a lot of messages right now. Give me a few seconds and try again.",
    }
  }

  const overloaded =
    upstream === 500 ||
    upstream === 503 ||
    upstream === 504 ||
    (upstream === undefined &&
      (text.includes('unavailable') || text.includes('overloaded')))
  if (overloaded) {
    return {
      status: 503,
      message:
        'The companion is briefly overloaded. Please try again in a moment.',
    }
  }

  return { status: 502, message: fallback }
}
