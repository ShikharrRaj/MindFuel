/**
 * GET /api/health — liveness check for uptime monitoring. Reports only
 * whether the AI key is configured, which rate-limit store is in use ("off"
 * means AI features are paused until Upstash + RATE_LIMIT_SALT are set) and
 * which commit is live; never a secret.
 */

import { json } from './_lib/http'
import { limiterMode } from './_lib/rateLimit'

export const config = { runtime: 'edge' }

export default function handler(req: Request): Response {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, 405)
  }
  return json({
    status: 'ok',
    ai: Boolean(process.env.GEMINI_API_KEY),
    limiter: limiterMode(),
    release: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
  })
}
