/**
 * Privacy-scrubbed error reports. Pure: used by the browser reporter
 * (src/device/errorReporter.ts) to build a report and by /api/report to
 * re-check it, since the server never trusts the client.
 *
 * A report carries only what helps fix a bug: the error kind, a short message,
 * a trimmed stack, the page path and the release. Never journal text, never the
 * URL hash or query, and emails / long digit runs are redacted on both sides.
 */

import { CONTROL_CHARS } from './guards'

export type ReportKind = 'error' | 'unhandledrejection' | 'boundary'

export interface ErrorReport {
  kind: ReportKind
  message: string
  stack?: string
  path: string
  release: string
}

const KINDS: ReportKind[] = ['error', 'unhandledrejection', 'boundary']
export const MAX_MESSAGE = 300
const MAX_STACK = 2000

const EMAIL = /[^\s@"'<>()]+@[^\s@"'<>()]+\.[a-z]{2,}/gi
const LONG_DIGITS = /\d[\d\s-]{6,}\d/g
const URL_QUERY_OR_HASH = /([a-z][a-z0-9+.-]*:\/\/[^\s?#)]*)[?#][^\s)]*/gi

/** Redact anything that could identify a person, then cap the length. */
export function scrub(text: string, max: number): string {
  return text
    .replace(CONTROL_CHARS, '')
    .replace(URL_QUERY_OR_HASH, '$1')
    .replace(EMAIL, '[email]')
    .replace(LONG_DIGITS, '[number]')
    .slice(0, max)
}

/** Only the path: the hash and query never leave the device. */
function cleanPath(path: unknown): string {
  if (typeof path !== 'string') return '/'
  const p = path.split(/[?#]/)[0]
  return /^\/[\w\-./]*$/.test(p) ? p.slice(0, 200) : '/'
}

function cleanRelease(release: unknown): string {
  return typeof release === 'string' && /^[\w.-]{1,40}$/.test(release)
    ? release
    : 'unknown'
}

/** Errors from browser extensions or cross-origin scripts are not ours. */
export function isNoise(message: string, stack = ''): boolean {
  if (message === 'Script error.' || message === 'Script error') return true
  return /(chrome|moz|safari(-web)?)-extension:\/\//.test(stack + message)
}

/** Build a report from anything that was thrown. */
export function buildReport(
  error: unknown,
  kind: ReportKind,
  ctx: { path: string; release: string },
): ErrorReport {
  const isError = error instanceof Error
  const message = isError
    ? `${error.name}: ${error.message}`
    : typeof error === 'string'
      ? error
      : 'Non-error value thrown'
  const stack = isError && error.stack ? scrub(error.stack, MAX_STACK) : ''
  return {
    kind,
    message: scrub(message, MAX_MESSAGE),
    ...(stack ? { stack } : {}),
    path: cleanPath(ctx.path),
    release: cleanRelease(ctx.release),
  }
}

/** Server side: re-validate and re-scrub an incoming report. */
export function sanitizeReport(raw: unknown): ErrorReport | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!KINDS.includes(r.kind as ReportKind)) return null
  if (typeof r.message !== 'string' || !r.message.trim()) return null
  const stack = typeof r.stack === 'string' ? scrub(r.stack, MAX_STACK) : ''
  return {
    kind: r.kind as ReportKind,
    message: scrub(r.message, MAX_MESSAGE),
    ...(stack ? { stack } : {}),
    path: cleanPath(r.path),
    release: cleanRelease(r.release),
  }
}
