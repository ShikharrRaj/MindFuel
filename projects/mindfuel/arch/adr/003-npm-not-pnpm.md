# ADR-003: npm instead of pnpm

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deviates from:** TS-12 · related: TS-09, TS-11, TS-13
- **Owner:** devops

## Context

MindFuel is a single package with no workspaces, and it was scaffolded with npm. `package-lock.json` (lockfileVersion 3) is committed, CI runs `npm ci`, and Vercel detects npm from the lockfile. TS-12 makes pnpm, pinned through `packageManager` and Corepack, the default.

## Decision

Stay on npm. This meets TS-13's intent: the lockfile is authoritative and CI installs with `npm ci`, npm's equivalent of a frozen-lockfile install.

Rejected: **switching to pnpm now.** pnpm's main benefits (workspace linking, a strict `node_modules`, disk reuse) pay off in a monorepo, not in one package. Switching would also churn the lockfile during a hardening pass.

## Consequences

- `package-lock.json` is the only allowed lockfile. A PR that adds `pnpm-lock.yaml` or `yarn.lock` is rejected, since TS-12's no-mixing clause still holds.
- npm's flat `node_modules` allows "phantom" imports of packages that are not declared in `package.json`, which pnpm would reject. code-reviewer checks every new import against `package.json` (TS-10).
- Follow-up for devops: pin the npm version through `packageManager`, and pin Node through `.nvmrc` plus `engines.node` (TS-09, TS-11). Neither is pinned today.

## Revisit when

The pnpm + Turborepo monorepo in roadmap §2 is approved (deferred under ADR-007). At that point, migrate with `pnpm import` from the existing lockfile.
