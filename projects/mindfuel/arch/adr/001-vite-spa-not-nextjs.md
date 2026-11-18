# ADR-001: Vite SPA instead of Next.js

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deviates from:** TS-01; TS-24 to TS-28 (Next.js conventions) do not apply
- **Owner:** frontend-lead

## Context

MindFuel began as a 2–3 hour PromptWars build. The UI is one interactive app, and all its state lives in localStorage on the device. There are no accounts and no server-rendered data. The only server surface is `api/` (ADR-002). TS-01 requires Next.js App Router, React, TypeScript and Tailwind.

## Decision

Keep the Vite 7 + React 19 + TypeScript SPA. Style it with the CSS tokens in `src/styles/theme.css`, not Tailwind.

Rejected:

- **Next.js App Router.** SSR and Server Components would have nothing to render on the server today, and migrating mid-hardening adds risk without user value (AR-01).
- **Tailwind.** It would duplicate the token layer that already enforces the editorial look (UI-01, UI-02).

## Consequences

- TS-25 to TS-28 do not apply. Fonts are self-hosted by hand instead of through `next/font`.
- TS-24 maps to Vite's `VITE_` prefix: only `VITE_*` variables reach the bundle. Server config such as `GEMINI_API_KEY` must never use it (CLAUDE.md rule 1).
- All pages render on the client, which weakens SEO for marketing and legal pages.
- `src/lib` stays framework-free (AR-03), so a later move to Next.js can reuse the domain logic unchanged.

## Revisit when

A server-rendered surface is needed (accounts, sync, SEO-critical pages), or roadmap §2's Next.js web target is approved. Record that migration in a superseding ADR (AR-09).
