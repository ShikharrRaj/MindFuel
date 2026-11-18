// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkRateLimit,
  clientBucket,
  limiterMode,
  limitMessage,
  resetMemoryLimiter,
  ROUTE_LIMITS,
} from './rateLimit'

const NOW = Date.UTC(2026, 10, 11, 10, 0, 30)

function req(ip = '203.0.113.7'): Request {
  return new Request('https://mindfuel.test/api/chat', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  })
}

beforeEach(() => {
  resetMemoryLimiter()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('limiter mode', () => {
  const redis = { UPSTASH_REDIS_REST_URL: 'u', UPSTASH_REDIS_REST_TOKEN: 't' }

  it.each([
    ['local dev, no Redis', {}, 'memory'],
    ['local dev with Redis', redis, 'redis'],
    [
      'production, Redis + salt',
      { ...redis, VERCEL_ENV: 'production', RATE_LIMIT_SALT: 's' },
      'redis',
    ],
    [
      'production, Redis but no salt',
      { ...redis, VERCEL_ENV: 'production' },
      'off',
    ],
    ['production, nothing', { VERCEL_ENV: 'production' }, 'off'],
    ['preview, nothing', { VERCEL_ENV: 'preview' }, 'off'],
    [
      'production, memory allowed',
      { VERCEL_ENV: 'production', RATE_LIMIT_ALLOW_MEMORY: '1' },
      'memory',
    ],
  ])('%s → %s', (_label, env, mode) => {
    expect(limiterMode(env)).toBe(mode)
  })

  it('fails closed for AI routes when deployed without a shared store', async () => {
    const env = { VERCEL_ENV: 'production' }
    const r = await checkRateLimit(req(), 'analyze', env, NOW)
    expect(r).toMatchObject({ ok: false, reason: 'unavailable' })
    // Error reports cost nothing, so they still go through.
    expect((await checkRateLimit(req(), 'report', env, NOW)).ok).toBe(true)
  })
})

describe('per-client limits (in-memory)', () => {
  it('allows up to the per-minute limit, then refuses until the next minute', async () => {
    const max = ROUTE_LIMITS.analyze.perMinute
    for (let i = 0; i < max; i++) {
      expect((await checkRateLimit(req(), 'analyze', {}, NOW)).ok).toBe(true)
    }
    const limited = await checkRateLimit(req(), 'analyze', {}, NOW)
    expect(limited).toEqual({ ok: false, reason: 'minute', retryAfterSec: 30 })
    expect((await checkRateLimit(req(), 'analyze', {}, NOW + 30_000)).ok).toBe(
      true,
    )
  })

  it('enforces the per-day limit across minutes', async () => {
    const { perDay } = ROUTE_LIMITS.analyze
    for (let i = 0; i < perDay; i++) {
      const t = NOW + i * 60_000
      expect((await checkRateLimit(req(), 'analyze', {}, t)).ok).toBe(true)
    }
    const limited = await checkRateLimit(
      req(),
      'analyze',
      {},
      NOW + perDay * 60_000,
    )
    expect(limited).toMatchObject({ ok: false, reason: 'day' })
  })

  it('keeps clients and routes separate', async () => {
    const max = ROUTE_LIMITS.analyze.perMinute
    for (let i = 0; i < max; i++)
      await checkRateLimit(req(), 'analyze', {}, NOW)
    expect((await checkRateLimit(req(), 'analyze', {}, NOW)).ok).toBe(false)
    expect(
      (await checkRateLimit(req('198.51.100.2'), 'analyze', {}, NOW)).ok,
    ).toBe(true)
    expect((await checkRateLimit(req(), 'chat', {}, NOW)).ok).toBe(true)
  })

  it('groups IPv6 clients by /64', () => {
    expect(clientBucket('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64')
    expect(clientBucket('2001:0db8:0001:0002:ffff:ffff:ffff:ffff')).toBe(
      '2001:db8:1:2::/64',
    )
    expect(clientBucket('2001:db8::5')).toBe('2001:db8:0:0::/64')
    expect(clientBucket('::ffff:198.51.100.7')).toBe('198.51.100.7')
    expect(clientBucket('203.0.113.7')).toBe('203.0.113.7')
  })
})

describe('global AI budgets', () => {
  it('caps each AI route, without counting refused requests', async () => {
    const env = { AI_DAILY_LIMIT_ANALYZE: '10' }
    const perMinute = ROUTE_LIMITS.analyze.perMinute // 6
    // Client A hammers: only its first 6 pass its own limit and use budget.
    for (let i = 0; i < 20; i++) {
      await checkRateLimit(req('10.0.0.1'), 'analyze', env, NOW)
    }
    // So client B still has 10 - 6 = 4 calls of shared budget left.
    const b = []
    for (let i = 0; i < 10 - perMinute + 1; i++) {
      b.push(await checkRateLimit(req('10.0.0.2'), 'analyze', env, NOW))
    }
    expect(b.slice(0, -1).every((r) => r.ok)).toBe(true)
    expect(b.at(-1)).toMatchObject({ ok: false, reason: 'global' })
    // Chat has its own budget, so an analyze flood can't switch it off.
    expect((await checkRateLimit(req('10.0.0.3'), 'chat', env, NOW)).ok).toBe(
      true,
    )
  })

  it('never applies an AI budget to error reports', async () => {
    const env = { AI_DAILY_LIMIT_CHAT: '1' }
    expect((await checkRateLimit(req('10.0.0.9'), 'chat', env, NOW)).ok).toBe(
      true,
    )
    expect((await checkRateLimit(req('10.0.0.8'), 'report', env, NOW)).ok).toBe(
      true,
    )
  })

  it('words limits calmly', () => {
    expect(limitMessage('analyze', 'day')).toMatch(/saved on your device/i)
    expect(limitMessage('analyze', 'unavailable')).toMatch(/paused/i)
    expect(limitMessage('chat', 'minute')).toMatch(/wait a minute/i)
  })
})

describe('Upstash Redis', () => {
  const env = {
    UPSTASH_REDIS_REST_URL: 'https://redis.example/',
    UPSTASH_REDIS_REST_TOKEN: 'token-123',
    RATE_LIMIT_SALT: 'pepper',
    VERCEL_ENV: 'production',
  }

  it('sends one EVAL with HMAC-hashed keys and maps the result', async () => {
    const fetchMock = vi.fn(async () => Response.json({ result: 2 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkRateLimit(req(), 'chat', env, NOW)
    expect(result).toMatchObject({ ok: false, reason: 'day' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('https://redis.example')
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer token-123',
    )
    const command = JSON.parse(init.body as string) as string[]
    expect(command[0]).toBe('EVAL')
    expect(command[2]).toBe('3') // minute, day, route budget
    const keys = command.slice(3, 6)
    expect(keys.join(' ')).not.toContain('203.0.113.7')
    expect(keys[2]).toMatch(/^mf:rl:chat:g:/)
  })

  it('refuses a client it just refused without spending a Redis command', async () => {
    const fetchMock = vi.fn(async () => Response.json({ result: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await checkRateLimit(req(), 'chat', env, NOW)).ok).toBe(false)
    for (let i = 0; i < 50; i++) {
      expect((await checkRateLimit(req(), 'chat', env, NOW + i)).ok).toBe(false)
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to memory, with a small AI budget, while Redis is down', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network down')
    })
    vi.stubGlobal('fetch', fetchMock)
    const results = []
    // Many clients, one request each: only the degraded budget limits them.
    for (let i = 0; i < 260; i++) {
      results.push(
        await checkRateLimit(
          req(`10.1.${i >> 8}.${i & 255}`),
          'chat',
          env,
          NOW,
        ),
      )
    }
    expect(results.filter((r) => r.ok)).toHaveLength(200)
    expect(results.at(-1)).toMatchObject({ ok: false, reason: 'global' })
    expect(fetchMock).toHaveBeenCalledTimes(1) // then backs off for 30 s
  })
})

describe('second-pass hardening', () => {
  const env = {
    UPSTASH_REDIS_REST_URL: 'https://redis.example',
    UPSTASH_REDIS_REST_TOKEN: 't',
    RATE_LIMIT_SALT: 's',
    VERCEL_ENV: 'production',
  }

  it('limits a block of IPv6 /64s through its /48', async () => {
    const { perDay } = ROUTE_LIMITS.analyze
    let refused = 0
    // 300 different /64s inside one /48, one request each per minute-slot.
    for (let i = 0; i < 300; i++) {
      const ip = `2001:db8:abcd:${i.toString(16)}::1`
      const r = await checkRateLimit(req(ip), 'analyze', {}, NOW + i * 60_000)
      if (!r.ok) refused += 1
    }
    expect(300 - refused).toBe(perDay * 5)
    expect(clientBucket('2001:db8:abcd:12::1', 48)).toBe('2001:db8:abcd::/48')
  })

  it('pauses AI routes when Redis is out of quota, instead of opening up', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { error: 'ERR max requests limit exceeded' },
        { status: 400 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const r = await checkRateLimit(req(), 'chat', env, NOW)
    expect(r).toMatchObject({ ok: false, reason: 'unavailable' })
    // ... and stops spending commands for a while.
    await checkRateLimit(req('10.9.9.9'), 'chat', env, NOW + 1000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never spends Redis commands on error reports', async () => {
    const fetchMock = vi.fn(async () => Response.json({ result: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    for (let i = 0; i < 5; i++) await checkRateLimit(req(), 'report', env, NOW)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
