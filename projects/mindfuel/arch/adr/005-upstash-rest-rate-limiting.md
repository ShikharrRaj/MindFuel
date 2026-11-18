# ADR-005: Upstash Redis (REST) for rate limiting, with in-memory fallback

- **Status:** Accepted
- **Date:** 2026-11-11
- **Implements:** AR-29, AR-40 · **deviates from:** TS-05 (AWS-hosted Redis)
- **Owner:** backend-lead (`api/_lib/`) · security-reviewer signs off

## Context

Both AI endpoints spend paid Gemini quota. With no accounts, per-IP limits are the only abuse control (AR-29). An in-memory counter limits only one short-lived Edge isolate. Edge has no TCP sockets, so it cannot reach a self-managed Redis.

## Decision

- Keep per-IP, per-route counters in Upstash Redis, called over REST with plain `fetch`, no SDK (TS-17).
- Keys are namespaced and versioned, built from a hashed IP (never raw), and expire after one window (AR-13, AR-14, CS-35).
- The URL and token come from env vars (TS-21). If they are missing, or Upstash errors or times out (AR-06, AR-31), use the in-memory counter. An Upstash outage never fails a request (AR-40).
- Over-limit calls get `429` with `Retry-After`. `api/report.ts` (ADR-006) is limited too.
- A crisis entry on an exhausted bucket still gets helplines (CLAUDE.md rule 3; release-gate test).

Rejected: in-memory only (ineffective across isolates) and `@upstash/ratelimit` (a new dependency, TS-10).

## Consequences

- Hostels, coaching centres and mobile CGNAT put many students behind one IP, so limits must be generous.
- The fallback is degraded protection only; Upstash still needs provisioning.
- The privacy policy must name Upstash (hashed IPs).

## Revisit when

Accounts exist (per-user quotas, AR-28), the backend moves to AWS (TS-02), or Vercel's firewall covers the need.
