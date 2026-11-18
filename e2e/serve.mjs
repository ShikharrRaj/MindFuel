/**
 * Serves the production build (dist/) the way Vercel does for the smoke test:
 * the same response headers from vercel.json (so the CSP is exercised for
 * real), SPA fallback to index.html, and a stubbed /api so no AI is called.
 *
 *   node e2e/serve.mjs   →  http://localhost:4173
 */

import { createReadStream, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url))
const PORT = Number(process.env.PORT ?? 4173)
const vercel = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain',
}

/** vercel.json `source` patterns here are simple path regexes. */
function headersFor(path) {
  const out = {}
  for (const rule of vercel.headers ?? []) {
    if (new RegExp(`^${rule.source}$`).test(path)) {
      for (const h of rule.headers) out[h.key] = h.value
    }
  }
  return out
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  for (const [k, v] of Object.entries(headersFor(path))) res.setHeader(k, v)

  if (path.startsWith('/api/')) {
    res.statusCode = path === '/api/report' ? 204 : 503
    res.setHeader('content-type', 'application/json')
    res.end(path === '/api/report' ? '' : '{"error":"AI is off in tests."}')
    return
  }

  let file = normalize(join(ROOT, path))
  if (!file.startsWith(ROOT)) {
    res.statusCode = 403
    res.end()
    return
  }
  try {
    if (!statSync(file).isFile()) throw new Error('dir')
  } catch {
    file = join(ROOT, 'index.html')
  }
  res.setHeader(
    'content-type',
    TYPES[extname(file)] ?? 'application/octet-stream',
  )
  createReadStream(file).pipe(res)
}).listen(PORT, () => console.log(`serving dist on http://localhost:${PORT}`))
