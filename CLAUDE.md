# MindFuel — Engineering OS project config

AI wellness companion for students preparing for high-stakes exams (NEET/JEE/CUET/CAT/GATE/UPSC).
Vite + React 19 + TypeScript SPA · Vercel Edge functions in `api/` · Gemini via `@google/genai`.
Engineering OS agents (`.claude/agents/`) operate here under mechanically-enforced boundaries
(`.claude/hooks/` + `.claude/role-matrix.json`). Standards live in `Knowledge/`.

## Layout — agents MUST respect these paths

- UI: `src/App.tsx` (state + composition only), `src/components/` (one component per file), `src/styles/theme.css` (design tokens).
- Domain logic: `src/lib/` — PURE functions, no React, no network. Shared by UI and `api/`.
- Calm Toolkit: activities are typed data in `src/lib/activities.ts` (add data, not code); the engine is `src/lib/calm.ts`. It must never call the AI.
- Browser APIs (haptics, Web Audio): `src/device/`. On-device stores: `src/hooks/`.
- AI modules (carve-outs): `src/lib/prompts.ts` (prompt-engineer), `src/lib/{safety,aiError,context}.ts` (ai-platform-lead).
- Server: `api/analyze.ts`, `api/chat.ts` (Edge, hold `GEMINI_API_KEY`); `src/dev/devApi.ts` runs them under `npm run dev`.
- Tests: co-located `*.test.ts(x)` (Vitest + Testing Library); shared setup in `src/test/`.
- Production planning: `projects/mindfuel/` (prd/ arch/ plan/ handoffs/ escalations/).

## Non-negotiable conventions

1. The Gemini key and every model call stay server-side. Nothing secret reaches the browser bundle.
2. Journal text is never persisted server-side. Send only the current entry + a one-line mood summary.
3. Safety: the local `detectCrisis` check always overrides the model's severity. Any change to `src/lib/safety*` (incl. `safetyPlan.ts`) or `SosOverlay`/`HelpNow` needs security-reviewer sign-off. Helplines are never hidden behind an activity.
4. "Delete my data" must clear every `mindfuel.*` key: register new keys in `ALL_KEYS` in `src/lib/storage.ts`.
5. The app never diagnoses, never gives medical advice, never claims to be a therapist.
6. Style via the tokens in `src/styles/theme.css`, with a warm editorial look (cream paper, Fraunces, terracotta). No neon, glass or emoji-heavy UI (per UI-01, UI-02).
7. Respect `prefers-reduced-motion`; keep ARIA tab/radiogroup/log patterns and live regions intact.
8. Gate before done: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`.

## Known TS-\* deviations (ADRs in `projects/mindfuel/arch/adr/`)

Vite SPA, not Next.js (TS-01, ADR-001) · Vercel Edge functions, not NestJS (TS-02/TS-05, ADR-002) · npm, not pnpm (TS-12, ADR-003) · `^` ranges on runtime deps, lockfile pins (TS-14, ADR-004) · Upstash REST rate limiting (ADR-005) · self-hosted error reports to Vercel logs, not Sentry (TS-07, ADR-006) · web only for v1, native mobile deferred (ADR-007).

## Production hardening (2026-11-11)

- `api/_lib/` holds server helpers (not deployed as functions): `ai.ts` (model chain from `GEMINI_MODEL`/`GEMINI_FALLBACK_MODEL`, per-attempt timeout), `rateLimit.ts`, `validate.ts`, `http.ts`. Every endpoint validates, size-caps and rate-limits before calling the model; the chat crisis fast-path runs before the limiter. On Vercel, AI routes stay paused (503) until Upstash + `RATE_LIMIT_SALT` are set (`limiterMode`); never weaken that to fail open.
- AI consent (`mindfuel.consent.v1`, `AI_CONSENT_VERSION` in `storage.ts`) gates every AI call. Changing what is sent, or to whom, means updating `src/lib/legal.ts` AND bumping the version.
- Security headers/CSP live in `vercel.json`; `npm run test:e2e` (Playwright) fails on any CSP violation. Ops: `docs/runbook.md`.

## Which Engineering OS roles apply

Active: **frontend-lead**, **backend-lead** (`api/`, `src/dev/`), **ai-platform-lead**, **prompt-engineer**,
**ai-evaluation**, **uiux-lead**, **qa-automation**, **devops** (`.github/`, `vercel.json`), **security-reviewer**,
**code-reviewer**, **accessibility**, **performance**, **documentation**, **research**, **design-guardian**, **git-operations**.
Dormant until the production backend lands: **database**. Low relevance: **seo** (marketing site only), **animation**.
Start any cross-cutting or multi-step task with **engineering-manager**.

## Standards

Cite by rule ID (EF-01). Execution loop + Output Contract: `Knowledge/development-workflow.md`.
Factory pipeline: `playbooks/software-factory.md`. Verify EOS wiring: `node scripts/verify-all.mjs`.
