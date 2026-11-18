# ADR-007: Web-only v1; native mobile deferred

- **Status:** Accepted
- **Date:** 2026-11-11 (CEO decision taken 2026-11-10, roadmap §5)
- **Rules:** AR-01, AR-03, AR-09
- **Owner:** staff-architect · decided by the CEO

## Context

Roadmap §2 proposed an Expo (React Native) app beside the web app. Both would share a `packages/core` extracted from `src/lib`, inside a pnpm + Turborepo monorepo. On 2026-11-10 the CEO decided "web only for now".

## Decision

v1 ships only as the responsive web SPA (ADR-001). The Expo app, the monorepo, the `packages/core` extraction and roadmap phase P3 are deferred. Out of scope with them: F11 widgets, biometric lock, Expo push and Maestro e2e.

The mobile path stays cheap:

- `src/lib` stays pure, with no React, DOM or network code (AR-03).
- Browser APIs stay in `src/device/`.
- Storage access stays behind `src/hooks/` and `src/lib/storage.ts`.

## Consequences

- Phones get the web app, so layouts and touch targets must work on mobile first.
- There is no native push. If reminders are scoped, they need in-app prompts or Web Push, which is a separate decision.
- There is no biometric lock. Journals on the device are protected only by the device and browser profile, and "Delete my data" (`ALL_KEYS`) remains the main privacy control.
- ADR-003's monorepo trigger is not met, so ADR-001 and ADR-003 remain in force.

## Revisit when

The CEO reopens mobile. A superseding ADR then defines the monorepo layout, the `packages/core` boundary, and a native storage adapter (React Native has no localStorage).
