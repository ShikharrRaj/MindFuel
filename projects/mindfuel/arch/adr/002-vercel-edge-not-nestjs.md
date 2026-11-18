# ADR-002: Vercel Edge functions instead of NestJS on AWS

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deviates from:** TS-02, TS-05 (Vercel only for FE previews); by extension TS-23, TS-29 to TS-32
- **Owner:** backend-lead (`api/`), devops (`vercel.json`)

## Context

The server exists to keep `GEMINI_API_KEY` and every model call out of the browser (CLAUDE.md rule 1). It is three stateless handlers: `api/analyze.ts`, `api/chat.ts` (streaming) and `api/report.ts` (ADR-006). There is no database and no account system, and journals never persist on the server (rule 2).

## Decision

Host production web and API on Vercel, with the API as Edge functions. Handlers import domain logic from the pure `src/lib` (AR-03) and own only transport, validation and the Gemini call. Redis is used only for rate limiting (ADR-005).

Rejected:

- **NestJS + Postgres on AWS.** Too much infrastructure for a stateless proxy (AR-01).
- **Vercel Node.js functions.** They are viable, and Vercel now favours them, but the handlers need only Web-standard streaming.

## Consequences

- TS-29 to TS-32 do not apply. Handlers validate input themselves (types, length caps, enums) to meet TS-30's intent, under test.
- Secrets live in Vercel's encrypted env vars, not AWS Secrets Manager (TS-23).
- Edge has no Node APIs and caps execution time, so long jobs cannot run here.
- Requests run near the user, so Indian data residency is not guaranteed. Acceptable only while nothing is stored.

## Revisit when

Accounts, sync, persistence or background jobs are scoped, or the CEO settles roadmap §5 decision #3.
