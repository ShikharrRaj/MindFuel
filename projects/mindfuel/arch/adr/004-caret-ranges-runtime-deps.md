# ADR-004: Caret ranges on runtime dependencies

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deviates from:** TS-14 · related: TS-10, TS-13, TS-15, TS-19
- **Owner:** devops

## Context

`package.json` declares the three runtime dependencies with `^` ranges, Vite's scaffold default: `@google/genai ^1.9.0`, `react ^19.1.0`, `react-dom ^19.1.0`. TS-14 requires exact versions. `package-lock.json` already pins the exact versions with integrity hashes: `@google/genai` 1.52.0, and `react`/`react-dom` 19.2.7.

## Decision

Keep the `^` ranges and treat the committed lockfile as the single pin (TS-13).

Rejected: **exact pins now.** They would add a second, duplicate pin and churn the lockfile mid-hardening, without changing the shipped code.

## Consequences

- What ships is exactly what is locked, as long as every install is frozen. CI already runs `npm ci`. Follow-up for devops: set `"installCommand": "npm ci"` in `vercel.json`, because Vercel's default `npm install` respects the lockfile but is not frozen.
- A caret range never crosses a major version, so React and SDK majors still need an ADR (TS-15).
- Risk: regenerating the lockfile (`npm install <pkg>`, `npm update`) can quietly move a runtime dependency to a newer minor. Control: review any lockfile diff that touches one as a dependency change (TS-10), and run the rule-8 gate on it.
- The declared floors are stale (`^1.9.0` against a locked 1.52.0). Raise them to the locked versions.

## Revisit when

Automated updates land (TS-19), since Dependabot and Renovate pair cleanly with exact pins. Also revisit if an unreviewed version change causes a regression.
