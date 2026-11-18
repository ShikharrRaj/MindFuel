import { describe, expect, it } from 'vitest'
import {
  buildReport,
  isNoise,
  MAX_MESSAGE,
  sanitizeReport,
  scrub,
} from './errorReport'

describe('error reports', () => {
  it('redacts emails, long numbers and URL query/hash', () => {
    const out = scrub(
      'call 98765 43210 or mail priya@example.com at https://x.app/a.js?k=1#entry',
      500,
    )
    expect(out).not.toMatch(/98765|priya@|k=1|#entry/)
    expect(out).toContain('https://x.app/a.js')
  })

  it('builds a short report with only the path', () => {
    const r = buildReport(new TypeError('x'.repeat(1000)), 'error', {
      path: '/some/page?q=secret#journal',
      release: 'abc1234',
    })
    expect(r.kind).toBe('error')
    expect(r.message.length).toBe(MAX_MESSAGE)
    expect(r.path).toBe('/some/page')
    expect(r.release).toBe('abc1234')
  })

  it('handles non-errors and bad context safely', () => {
    const r = buildReport({ weird: true }, 'unhandledrejection', {
      path: 'javascript:alert(1)',
      release: '<script>',
    })
    expect(r.message).toBe('Non-error value thrown')
    expect(r.path).toBe('/')
    expect(r.release).toBe('unknown')
  })

  it('re-validates on the server', () => {
    expect(sanitizeReport({ kind: 'nope', message: 'x' })).toBeNull()
    expect(sanitizeReport({ kind: 'error', message: '' })).toBeNull()
    expect(
      sanitizeReport({ kind: 'boundary', message: 'Boom', path: '/' }),
    ).toEqual({
      kind: 'boundary',
      message: 'Boom',
      path: '/',
      release: 'unknown',
    })
  })

  it('ignores extension and cross-origin noise', () => {
    expect(isNoise('Script error.')).toBe(true)
    expect(isNoise('x', 'at chrome-extension://abc/content.js')).toBe(true)
    expect(isNoise('TypeError: real bug')).toBe(false)
  })
})
