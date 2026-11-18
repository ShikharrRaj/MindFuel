# MindFuel Architecture Decision Records

These ADRs record each architecturally significant decision (per AR-09) and every deviation from `Knowledge/tech-stack.md` (TS-\*) or `Knowledge/architecture-principles.md` (AR-\*). An approved deviation applies to MindFuel only and does not amend the standard.

| ADR                                       | Decision                                               | Rules                 | Status   | Date       |
| ----------------------------------------- | ------------------------------------------------------ | --------------------- | -------- | ---------- |
| [001](001-vite-spa-not-nextjs.md)         | Vite SPA instead of Next.js                            | TS-01, TS-24 to TS-28 | Accepted | 2026-11-11 |
| [002](002-vercel-edge-not-nestjs.md)      | Vercel Edge functions instead of NestJS on AWS         | TS-02, TS-05, TS-23   | Accepted | 2026-11-11 |
| [003](003-npm-not-pnpm.md)                | npm instead of pnpm                                    | TS-12                 | Accepted | 2026-11-11 |
| [004](004-caret-ranges-runtime-deps.md)   | Caret ranges on runtime deps; lockfile is the pin      | TS-14                 | Accepted | 2026-11-11 |
| [005](005-upstash-rest-rate-limiting.md)  | Upstash Redis (REST) rate limiting, in-memory fallback | AR-29, AR-40, TS-05   | Accepted | 2026-11-11 |
| [006](006-self-hosted-error-reporting.md) | Self-hosted error reporting to Vercel logs, not Sentry | TS-07 (errors), TS-33 | Accepted | 2026-11-11 |
| [007](007-web-only-v1.md)                 | Web-only v1; native mobile deferred                    | AR-01, AR-03          | Accepted | 2026-11-11 |

## Format

Every ADR has the same parts: header (status, date, rules, owner), Context, Decision (with rejected alternatives), Consequences, and Revisit when. New ADRs take the next number. An ADR that has been superseded stays in this folder, marked `Superseded by ADR-NNN`.

## Follow-ups these ADRs raise

| Owner         | Action                                                                                               | From    |
| ------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| devops        | Pin npm via `packageManager`, and Node via `.nvmrc` plus `engines.node`                              | ADR-003 |
| devops        | Set `"installCommand": "npm ci"` in `vercel.json`; raise the stale runtime-dependency version floors | ADR-004 |
| CEO/operator  | Provision Upstash and set its Vercel env vars                                                        | ADR-005 |
| documentation | Name Upstash (hashed IPs) in the privacy policy                                                      | ADR-005 |
