/**
 * Browser error reporter: uncaught errors, unhandled promise rejections and
 * React error-boundary catches are sent, scrubbed, to /api/report, so a
 * production break shows up in the Vercel logs instead of going unnoticed.
 *
 * At most a handful of reports per page load, duplicates dropped, and nothing
 * is sent in development or tests.
 */

import { buildReport, isNoise, type ReportKind } from '../lib/errorReport'

const ENDPOINT = '/api/report'
const MAX_REPORTS_PER_PAGE = 5

let sent = 0
const seen = new Set<string>()

function enabled(): boolean {
  return import.meta.env.PROD && import.meta.env.MODE !== 'test'
}

export function reportError(error: unknown, kind: ReportKind): void {
  if (!enabled() || sent >= MAX_REPORTS_PER_PAGE) return
  try {
    const report = buildReport(error, kind, {
      path: window.location.pathname,
      release: __RELEASE__,
    })
    if (isNoise(report.message, report.stack)) return
    const key = `${kind}:${report.message}`
    if (seen.has(key)) return
    seen.add(key)
    sent += 1

    const body = JSON.stringify(report)
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon?.(ENDPOINT, blob)) return
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* reporting must never break the app */
  }
}

/** Listen for uncaught errors and rejections. Call once at startup. */
export function installErrorReporter(): void {
  window.addEventListener('error', (e) => {
    reportError(e.error ?? e.message, 'error')
  })
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason, 'unhandledrejection')
  })
}
