/**
 * Per-client rate limits for the Edge functions, plus a global daily budget
 * per AI route so the Gemini bill has a ceiling.
 *
 * Store: Upstash Redis over its REST API (shared by every Edge instance).
 * - Local dev, or with RATE_LIMIT_ALLOW_MEMORY=1: an in-memory store that only
 *   limits within one instance.
 * - On Vercel without Redis + RATE_LIMIT_SALT: AI routes FAIL CLOSED (they
 *   answer "paused"), because per-instance limits cannot bound the bill.
 *   The chat crisis fast-path runs before this check and is unaffected.
 * - Redis out of quota: AI routes fail closed too (an attacker must not be
 *   able to exhaust it on purpose to switch the ceiling off).
 * - Redis unreachable: in-memory, with a small per-instance AI budget, until
 *   Redis answers again.
 * - Error reports cost no AI, so they are limited in memory only and never
 *   spend Redis commands.
 *
 * Privacy: the client IP is never stored. Keys use an HMAC of the IP and
 * expire within 24 hours.
 *
 * Buckets: one per IPv4 address or IPv6 /64 (one home or device network), and
 * for IPv6 a looser daily bucket per /48, so an attacker holding a block of
 * /64s gains only a few times one client's allowance. Per-client numbers are
 * generous on purpose: many students in India share one carrier IP (CGNAT).
 *
 * Order of checks matters: the global counter only moves when the client's
 * own limits pass, so one abusive client cannot use up everyone's budget; and
 * a client that was just refused is refused from memory, without spending a
 * Redis command.
 */

import { clientIp } from './http'

export type LimitedRoute = 'analyze' | 'chat' | 'report'
export type LimitReason = 'minute' | 'day' | 'global' | 'unavailable'
export type LimiterMode = 'redis' | 'memory' | 'off'

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: LimitReason; retryAfterSec: number }

interface RouteLimits {
  perMinute: number
  perDay: number
  /** Default global budget per UTC day; null for non-AI routes. */
  globalPerDay: number | null
  /** Env var that overrides the global budget. */
  globalEnv?: string
}

export const ROUTE_LIMITS: Record<LimitedRoute, RouteLimits> = {
  analyze: {
    perMinute: 6,
    perDay: 40,
    globalPerDay: 2000,
    globalEnv: 'AI_DAILY_LIMIT_ANALYZE',
  },
  chat: {
    perMinute: 12,
    perDay: 150,
    globalPerDay: 4000,
    globalEnv: 'AI_DAILY_LIMIT_CHAT',
  },
  report: { perMinute: 10, perDay: 200, globalPerDay: null },
}

/** An IPv6 /48 may use this many clients' daily allowance. */
const WIDE_FACTOR = 5
/** AI calls one instance may make per day while Redis is unreachable. */
const DEGRADED_GLOBAL_PER_DAY = 200

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
const REDIS_TIMEOUT_MS = 1000
/** After a Redis failure, skip it briefly instead of paying its timeout. */
const REDIS_BACKOFF_MS = 30_000
const DEV_SALT = 'mindfuel-dev-only-salt'

type Env = Record<string, string | undefined>

function redisConfig(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

function isDeployed(env: Env): boolean {
  return env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview'
}

/** Which store this deployment uses (also shown by /api/health). */
export function limiterMode(env: Env = process.env): LimiterMode {
  const deployed = isDeployed(env)
  if (redisConfig(env) && (env.RATE_LIMIT_SALT || !deployed)) return 'redis'
  const allow = env.RATE_LIMIT_ALLOW_MEMORY
  if (!deployed || allow === '1' || allow === 'true') return 'memory'
  return 'off'
}

function globalLimit(limits: RouteLimits, env: Env): number | null {
  if (limits.globalPerDay === null) return null
  const n = Number(limits.globalEnv ? env[limits.globalEnv] : undefined)
  return Number.isInteger(n) && n > 0 ? n : limits.globalPerDay
}

/** Expand an IPv6 address to its eight groups (no leading zeros). */
function ipv6Groups(v: string): string[] {
  const [head, tail] = v.split('::')
  let groups: string[]
  if (tail === undefined) {
    groups = head.split(':')
  } else {
    const h = head ? head.split(':') : []
    const t = tail ? tail.split(':') : []
    groups = [
      ...h,
      ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'),
      ...t,
    ]
  }
  return groups.map((g) => g.replace(/^0+(?=.)/, '') || '0')
}

/**
 * The bucket an IP is counted in: the IPv4 address, or the IPv6 /64 (or /48
 * with `prefix` 48). IPv4-mapped IPv6 counts as its IPv4 address.
 */
export function clientBucket(ip: string, prefix: 64 | 48 = 64): string {
  const v = ip.trim().toLowerCase()
  if (!v.includes(':')) return v
  if (v.includes('.')) return v.slice(v.lastIndexOf(':') + 1) // ::ffff:1.2.3.4
  const groups = ipv6Groups(v).slice(0, prefix / 16)
  return `${groups.join(':')}::/${prefix}`
}

function isIpv6(ip: string): boolean {
  return ip.includes(':') && !ip.includes('.')
}

async function hmac(value: string, env: Env): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.RATE_LIMIT_SALT ?? DEV_SALT),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(value))
  return Array.from(new Uint8Array(mac).slice(0, 16), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

function windowEnd(reason: LimitReason, now: number): number {
  const window = reason === 'minute' ? MINUTE_MS : DAY_MS
  return now - (now % window) + window
}

interface Keys {
  minute: string
  day: string
  /** IPv6 only: the /48 daily bucket. */
  wide: string | null
  global: string | null
}

// ---------------------------------------------------------------------------
// Redis (Upstash REST). One round trip: a Lua script increments the client's
// counters and, only if they pass, the route's global one.

const SCRIPT = `
local function hit(key, ttl)
  local n = redis.call('INCR', key)
  if n == 1 then redis.call('EXPIRE', key, ttl) end
  return n
end
local m = hit(KEYS[1], 60)
local d = hit(KEYS[2], 86400)
if m > tonumber(ARGV[1]) then return 1 end
if d > tonumber(ARGV[2]) then return 2 end
local i = 3
if ARGV[5] == '1' then
  if hit(KEYS[i], 86400) > tonumber(ARGV[3]) then return 4 end
  i = i + 1
end
if ARGV[6] == '1' then
  if hit(KEYS[i], 86400) > tonumber(ARGV[4]) then return 3 end
end
return 0`

/** 4 = the IPv6 /48 bucket is over its daily limit (reported as "day"). */
const CODE_REASON: Record<number, LimitReason> = {
  1: 'minute',
  2: 'day',
  3: 'global',
  4: 'day',
}

class StoreQuotaError extends Error {
  name = 'StoreQuotaError'
}

async function redisCheck(
  cfg: { url: string; token: string },
  keys: Keys,
  limits: RouteLimits,
  global: number | null,
): Promise<number> {
  const keyList = [keys.minute, keys.day]
  if (keys.wide) keyList.push(keys.wide)
  if (keys.global) keyList.push(keys.global)
  const command = [
    'EVAL',
    SCRIPT,
    String(keyList.length),
    ...keyList,
    String(limits.perMinute),
    String(limits.perDay),
    String(limits.perDay * WIDE_FACTOR),
    String(global ?? 0),
    keys.wide ? '1' : '0',
    keys.global ? '1' : '0',
  ]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS)
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cfg.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => ({}))) as {
      result?: unknown
      error?: string
    }
    if (res.status === 429 || /limit|quota/i.test(data.error ?? '')) {
      throw new StoreQuotaError('redis quota exhausted')
    }
    if (!res.ok || typeof data.result !== 'number') {
      throw new Error(`redis status ${res.status}`)
    }
    return data.result
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// In-memory store: same windows, per Edge instance only. Also remembers who
// was just refused, so repeat requests cost nothing.

const MAX_MEMORY_KEYS = 10_000
const memory = new Map<string, { count: number; expiresAt: number }>()
const blocked = new Map<string, { reason: LimitReason; until: number }>()

function prune<V>(map: Map<string, V>, expired: (v: V) => boolean): void {
  if (map.size < MAX_MEMORY_KEYS) return
  for (const [k, v] of map) if (expired(v)) map.delete(k)
  if (map.size >= MAX_MEMORY_KEYS) map.clear()
}

function memoryIncr(key: string, ttlMs: number, now: number): number {
  const hit = memory.get(key)
  if (hit && hit.expiresAt > now) {
    hit.count += 1
    return hit.count
  }
  prune(memory, (v) => v.expiresAt <= now)
  memory.set(key, { count: 1, expiresAt: now + ttlMs })
  return 1
}

function memoryCheck(
  keys: Keys,
  limits: RouteLimits,
  global: number | null,
  now: number,
): number {
  const m = memoryIncr(keys.minute, MINUTE_MS, now)
  const d = memoryIncr(keys.day, DAY_MS, now)
  if (m > limits.perMinute) return 1
  if (d > limits.perDay) return 2
  if (keys.wide) {
    if (memoryIncr(keys.wide, DAY_MS, now) > limits.perDay * WIDE_FACTOR) {
      return 4
    }
  }
  if (keys.global && global !== null) {
    if (memoryIncr(keys.global, DAY_MS, now) > global) return 3
  }
  return 0
}

let redisDownUntil = 0
let quotaUntil = 0
let warnedRedis = false
let warnedOff = false
let warnedQuota = false

/** Test hook: forget all in-memory state. */
export function resetMemoryLimiter(): void {
  memory.clear()
  blocked.clear()
  redisDownUntil = 0
  quotaUntil = 0
  warnedRedis = false
  warnedOff = false
  warnedQuota = false
}

function refuse(reason: LimitReason, now: number): LimitResult {
  const until =
    reason === 'unavailable' ? now + MINUTE_MS : windowEnd(reason, now)
  return {
    ok: false,
    reason,
    retryAfterSec: Math.max(1, Math.ceil((until - now) / 1000)),
  }
}

/** Log a store problem once per instance; returns the new "warned" flag. */
function warnOnce(warned: boolean, entry: Record<string, unknown>): boolean {
  if (!warned) console.error(JSON.stringify(entry))
  return true
}

/** Count this request against its limits. */
export async function checkRateLimit(
  req: Request,
  route: LimitedRoute,
  env: Env = process.env,
  now = Date.now(),
): Promise<LimitResult> {
  const limits = ROUTE_LIMITS[route]
  const ai = limits.globalPerDay !== null
  const mode = limiterMode(env)

  if (ai && mode === 'off') {
    warnedOff = warnOnce(warnedOff, { type: 'rate_limit_store_missing' })
    return refuse('unavailable', now)
  }
  if (ai && mode === 'redis' && now < quotaUntil) {
    return refuse('unavailable', now)
  }

  const ip = clientIp(req)
  const id = await hmac(clientBucket(ip), env)
  const wideId = isIpv6(ip) ? await hmac(clientBucket(ip, 48), env) : null
  const keyFor = (k: string) => `${route}:${k}`
  const candidates = [keyFor(id), keyFor('global')]
  if (wideId) candidates.push(keyFor(wideId))
  for (const key of candidates) {
    const hit = blocked.get(key)
    if (hit && hit.until > now) return refuse(hit.reason, now)
  }

  const m = Math.floor(now / MINUTE_MS)
  const d = Math.floor(now / DAY_MS)
  const keys: Keys = {
    minute: `mf:rl:${route}:m:${m}:${id}`,
    day: `mf:rl:${route}:d:${d}:${id}`,
    wide: wideId ? `mf:rl:${route}:w:${d}:${wideId}` : null,
    global: ai ? `mf:rl:${route}:g:${d}` : null,
  }

  let code: number
  let global = globalLimit(limits, env)
  // Only AI routes use Redis: error reports must not be able to spend it.
  const cfg = ai && mode === 'redis' ? redisConfig(env) : null
  if (cfg && now >= redisDownUntil) {
    try {
      code = await redisCheck(cfg, keys, limits, global)
    } catch (err) {
      if (err instanceof StoreQuotaError) {
        quotaUntil = now + MINUTE_MS
        warnedQuota = warnOnce(warnedQuota, { type: 'rate_limit_store_quota' })
        return refuse('unavailable', now)
      }
      redisDownUntil = now + REDIS_BACKOFF_MS
      warnedRedis = warnOnce(warnedRedis, {
        type: 'rate_limit_store_unavailable',
        detail: err instanceof Error ? err.name : 'unknown',
      })
      if (global !== null) global = Math.min(global, DEGRADED_GLOBAL_PER_DAY)
      code = memoryCheck(keys, limits, global, now)
    }
  } else {
    if (cfg && global !== null) {
      global = Math.min(global, DEGRADED_GLOBAL_PER_DAY)
    }
    code = memoryCheck(keys, limits, global, now)
  }

  const reason = CODE_REASON[code]
  if (!reason) return { ok: true }
  const blockedKey =
    code === 3
      ? keyFor('global')
      : code === 4 && wideId
        ? keyFor(wideId)
        : keyFor(id)
  prune(blocked, (v) => v.until <= now)
  blocked.set(blockedKey, { reason, until: windowEnd(reason, now) })
  if (reason === 'global') {
    console.warn(
      JSON.stringify({ type: 'ai_daily_cap_reached', route, global }),
    )
  }
  return refuse(reason, now)
}

/** 503 while AI is paused (no shared store), else 429. */
export function limitStatus(reason: LimitReason): number {
  return reason === 'unavailable' ? 503 : 429
}

/** Calm, specific wording for a limited request. */
export function limitMessage(route: LimitedRoute, reason: LimitReason): string {
  if (reason === 'minute') {
    return 'That was a lot of requests in a short time. Please wait a minute and try again.'
  }
  const pausedNow = reason === 'unavailable'
  if (route === 'analyze') {
    return pausedNow
      ? 'Reflections are paused right now. Your entry is saved on your device, and the Calm tools still work.'
      : 'MindFuel has reached its reflection limit for today. Your entry is saved on your device, and the Calm tools still work.'
  }
  return pausedNow
    ? 'The companion is paused right now. The Calm tools still work.'
    : 'The companion has reached its limit for today. Please try again tomorrow. The Calm tools still work.'
}
