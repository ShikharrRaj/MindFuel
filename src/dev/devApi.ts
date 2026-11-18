/**
 * Local dev API bridge.
 *
 * In production the files in /api run as Vercel Edge functions. For local
 * development we want the very same handlers to work under `npm run dev` WITHOUT
 * requiring a Vercel account or `vercel dev`. This Vite plugin loads each Edge
 * handler through Vite's module runner and adapts Node's (req, res) to the Web
 * `Request`/`Response` the handlers expect — including streaming responses, so
 * the companion chat streams locally exactly as it does in production.
 *
 * It only runs in the dev server; it is never part of the client bundle.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin, type ViteDevServer } from 'vite'

/** Server-only settings the handlers read from process.env (see .env.example). */
const SERVER_ENV = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_FALLBACK_MODEL',
  'AI_DAILY_LIMIT_ANALYZE',
  'AI_DAILY_LIMIT_CHAT',
  'RATE_LIMIT_ALLOW_MEMORY',
  'RATE_LIMIT_SALT',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
]

/** Collect a Node request into a Web `Request`. */
function toWebRequest(req: IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('error', reject)
    req.on('end', () => {
      const method = req.method ?? 'GET'
      const hasBody = method !== 'GET' && method !== 'HEAD'
      resolve(
        new Request(`http://localhost${req.url ?? '/'}`, {
          method,
          headers: req.headers as Record<string, string>,
          body: hasBody ? Buffer.concat(chunks) : undefined,
        }),
      )
    })
  })
}

/** Pipe a Web `Response` (including a streaming body) back to Node's response. */
async function sendWebResponse(
  res: ServerResponse,
  web: Response,
): Promise<void> {
  res.statusCode = web.status
  web.headers.forEach((value, key) => res.setHeader(key, value))
  if (!web.body) {
    res.end()
    return
  }
  const reader = web.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(Buffer.from(value))
  }
  res.end()
}

/** Wire a single /api route to its Edge handler module. */
function route(
  server: ViteDevServer,
  path: string,
  modulePath: string,
  methods: string[] = ['POST'],
): void {
  server.middlewares.use(path, async (req, res, next) => {
    if (!methods.includes(req.method ?? '')) return next()
    try {
      const mod = await server.ssrLoadModule(modulePath)
      const handler = mod.default as (r: Request) => Promise<Response>
      const webReq = await toWebRequest(req as IncomingMessage)
      const webRes = await handler(webReq)
      await sendWebResponse(res as ServerResponse, webRes)
    } catch (err) {
      server.config.logger.error(`[devApi] ${path} failed: ${String(err)}`)
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Local dev API error.' }))
    }
  })
}

/** Vite plugin that serves /api/* locally during development. */
export function devApiPlugin(): Plugin {
  return {
    name: 'mindfuel-dev-api',
    apply: 'serve',
    configureServer(server) {
      // Make non-VITE_ env (e.g. GEMINI_API_KEY from .env.local) visible to the
      // handlers, which read process.env like they do on Vercel.
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const key of SERVER_ENV) {
        if (env[key] && !process.env[key]) process.env[key] = env[key]
      }
      route(server, '/api/analyze', '/api/analyze.ts')
      route(server, '/api/chat', '/api/chat.ts')
      route(server, '/api/report', '/api/report.ts')
      route(server, '/api/health', '/api/health.ts', ['GET', 'HEAD'])
    },
  }
}
