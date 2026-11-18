/**
 * POST /api/report — receives privacy-scrubbed browser error reports and
 * writes them to the Vercel runtime log as one JSON line each (filter on
 * `"type":"client_error"`). No third-party service, no journal text: the
 * report is re-scrubbed here because the server never trusts the client.
 */

import { isNoise, sanitizeReport } from '../src/lib/errorReport'
import { json, readJson } from './_lib/http'
import { checkRateLimit } from './_lib/rateLimit'

export const config = { runtime: 'edge' }

const MAX_REPORT_BYTES = 8 * 1024

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const raw = await readJson(req, MAX_REPORT_BYTES)
  if (!raw.ok) return json({ error: raw.error }, raw.status)
  const report = sanitizeReport(raw.value)
  if (!report) return json({ error: 'Invalid report.' }, 400)

  const limit = await checkRateLimit(req, 'report')
  if (!limit.ok) return new Response(null, { status: 429 })

  if (!isNoise(report.message, report.stack)) {
    console.error(JSON.stringify({ type: 'client_error', ...report }))
  }
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  })
}
