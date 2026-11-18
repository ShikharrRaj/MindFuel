# ADR-006: Self-hosted error reporting to Vercel logs instead of Sentry

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deviates from:** TS-07 (Sentry for errors), TS-33 · must satisfy: TS-34, CS-35, AR-43
- **Owner:** backend-lead (`api/report.ts`), frontend-lead (client) · security-reviewer signs off
- **Scope:** errors only; not TS-07's Langfuse or PostHog clauses.

## Context

Screens hold journal text, chat turns and safety plans. Sentry's error messages, breadcrumbs and replay can carry fragments of that to a third-party processor. That breaks the promise that journal text never persists server-side (CLAUDE.md rule 2). Scrubbing is possible but needs re-auditing per SDK integration. An in-house reporter also avoids a new dependency (TS-17).

## Decision

The client sends errors from `ErrorBoundary`, `SectionError` and `window` `error`/`unhandledrejection` to `api/report.ts`, an Edge function that:

- accepts only an allowlisted, size-capped payload (message, stack, component, route, release), per CS-35;
- truncates and scrubs the message and stack, and never logs the IP;
- writes one structured JSON line to Vercel runtime logs (TS-34);
- is rate-limited under ADR-005.

## Consequences

- Compared with TS-33, we lose grouping, alerting and sourcemap symbolication. Reports carry the commit SHA for manual decoding of minified stacks.
- Vercel log retention is short; history needs a log drain.
- The endpoint is a public write path, so the caps are mandatory.
- TS-33's "never swallowed" rule still applies (e.g. the mid-stream catch in `api/chat.ts`).

## Revisit when

Log search stops being enough, or security-reviewer approves a Sentry config with PII off and no replay.
