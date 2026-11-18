/**
 * Small HTTP helpers shared by the Edge functions. Files under api/_lib are
 * not deployed as functions (Vercel skips `_`-prefixed paths).
 *
 * Every API response is `no-store`: replies are derived from a student's
 * journal and must never sit in a shared cache.
 */

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...BASE_HEADERS,
      'content-type': 'application/json',
      ...headers,
    },
  })
}

/** A plain-text body sent as a stream, so the client reads it like a reply. */
export function textStream(text: string): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text))
        controller.close()
      },
    }),
    { headers: streamHeaders() },
  )
}

export function streamHeaders(): Record<string, string> {
  return { ...BASE_HEADERS, 'content-type': 'text/plain; charset=utf-8' }
}

export type ReadResult =
  | { ok: true; value: unknown }
  | { ok: false; status: number; error: string }

/**
 * Read a JSON body with a hard byte cap, so an oversized payload is refused
 * before it is parsed (or reaches the model).
 */
export async function readJson(
  req: Request,
  maxBytes: number,
): Promise<ReadResult> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: 'Request is too large.' }
  }
  let bytes: ArrayBuffer
  try {
    bytes = await req.arrayBuffer()
  } catch {
    return { ok: false, status: 400, error: 'Could not read the request.' }
  }
  if (bytes.byteLength > maxBytes) {
    return { ok: false, status: 413, error: 'Request is too large.' }
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body.' }
  }
}

/**
 * The client's IP as Vercel reports it. Vercel overwrites these headers at
 * its edge, so a client cannot spoof them. Only ever stored hashed.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}
