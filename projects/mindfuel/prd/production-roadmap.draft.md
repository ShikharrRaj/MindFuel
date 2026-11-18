# MindFuel: production roadmap (draft, awaiting CEO scope decision)

> Status: DRAFT · Author: operator (pre-PRD intake) · Next consumer: product-manager (`prd-intake`) → engineering-manager
> Input to: `projects/mindfuel/prd/PRD.approved.md` once the CEO picks scope and answers §5.

## 1. Where we are

MindFuel is a hackathon-grade SPA that scored 98.93 (#1) at PromptWars. Its core is sound and worth keeping:

- `src/lib` is pure, typed, tested domain logic (exam-phase engine, crisis detection, insights, exercise recommender, prompts).
- The key is server-side, there is a two-layer crisis check, and journals stay on the device.
- 50 Vitest tests, CI (lint, format, typecheck, test, build), about 70 KB gzip.

What makes it not production-ready:

| Area                  | Gap today                                                                                                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Abuse and cost        | No rate limiting on `/api/*`, so anyone can drain the Gemini quota. In `api/chat.ts` only the last message is length-capped: 19 earlier messages are unbounded, and the client can forge `assistant` turns. `tags`, `exam` and `recentMoodSummary` go into the prompt without validation. |
| Reliability           | Mid-stream Gemini errors are swallowed (`api/chat.ts`), so the user gets a silently truncated reply. The model ID is hard-coded in two files, there is no fallback model and no request timeout.                                                                                          |
| Safety                | Crisis detection is an English-only regex, so Hinglish/Hindi distress ("mar jaana chahta hoon") is missed. There is no follow-up after a crisis flag and no evaluation set measuring recall.                                                                                              |
| Data                  | Unversioned `localStorage` with no schema migration, export or encryption. Data is lost when the browser is cleared, and there is no multi-device use.                                                                                                                                    |
| Platform              | Web only. No mobile app, no installable PWA, no notifications or reminders.                                                                                                                                                                                                               |
| Ops                   | No error tracking, LLM tracing, analytics, staging environment, security headers (CSP/HSTS) or pinned Node version. Fonts load from Google's CDN, a third-party request on a privacy app.                                                                                                 |
| **AI model (urgent)** | `gemini-2.5-flash` **shuts down on 1 Dec 2026** and is auto-routed to `gemini-3.5-flash-lite`, which **rejects our `thinkingBudget: 0` config with a 400** (verified 2026-11-09). Both endpoints will likely break unless we migrate first. See §7.                                       |
| Testing               | No tests for the `api/` handlers and no end-to-end tests.                                                                                                                                                                                                                                 |
| Compliance            | No privacy policy or terms. No DPDP Act 2023 handling: consent, data-principal rights, grievance officer, and **verifiable parental consent for under-18 users** (many NEET/JEE aspirants are 16–17). No clinical content review.                                                         |

## 2. Recommended stack (EOS TS-\* aligned)

| Layer       | Choice                                                                                                                                                                                                                     | Why                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Repo        | **pnpm + Turborepo monorepo** (TS-12)                                                                                                                                                                                      | One home for web, mobile, API and shared logic.                                                                          |
| Shared core | **`packages/core`**: today's `src/lib` moved as-is, plus Zod schemas for every API contract                                                                                                                                | Our biggest asset. It is already pure and tested, so web, mobile and API reuse the same safety, phase and insight logic. |
| Web         | **Next.js App Router + Tailwind + shadcn/ui** (TS-01), PWA (installable, offline shell), `next/font` self-hosted                                                                                                           | Server-rendered marketing and legal pages, Route Handlers, the standard EOS frontend. Keeps the editorial tokens.        |
| Mobile      | **Deferred (web only for now).** **Expo (React Native) + Expo Router + NativeWind**, EAS Build/Submit + OTA updates                                                                                                        | One TypeScript codebase for iOS and Android that reuses `packages/core`. Native push, biometric lock, SQLite, widgets.   |
| API         | **NestJS + PostgreSQL (Prisma) + Redis** (TS-02); SSE streaming; BullMQ for jobs                                                                                                                                           | Two clients need one API with auth, sync, rate limits, reminders and push.                                               |
| AI          | Provider abstraction (TS-03), **`gemini-3.1-flash-lite` default** (cheapest model available to our key, verified), model pinned via env, fallback model on 429/503, structured output via Zod. **AI-light by design** (§7) | Keeps the PromptWars/Google alignment, costs about 35% less per analysis than today, and stays swappable.                |
| Infra       | **AWS ap-south-1 (Mumbai)** for API + DB (TS-05; Indian data residency, low latency), Cloudflare WAF, web on Vercel (via ADR)                                                                                              | Data stays in India and deploys are simple.                                                                              |
| Observe     | **Sentry** (FE/BE/mobile), **Langfuse** with PII masking, **PostHog** with no journal content (TS-07)                                                                                                                      | Debuggable without exposing journals.                                                                                    |
| Test        | Vitest (web/core), Jest (Nest), **Playwright** (web e2e), **Maestro** (mobile e2e), crisis-detection eval set                                                                                                              | TS-06, plus a recall gate on safety.                                                                                     |

## 3. Features: improve what exists

**Hardening (do first; small, high-value)**

1. Rate limiting per IP/user (Redis), Cloudflare Turnstile on anonymous use, and a per-user daily token budget.
2. Zod validation on every request: per-message caps across the whole chat history, server-side role checks, enum-checked `exam`, bounded `tags` and `recentMoodSummary`.
3. SSE streaming with explicit `error`/`done` events, so the UI can say "reply was cut off, retry".
4. Model ID, temperature and token caps in config; fallback model; request timeouts.
5. Security headers (CSP, HSTS, Referrer-Policy, Permissions-Policy); self-host fonts.
6. Tests for both API handlers plus a Playwright happy path (check-in → insight → crisis path).

**Data and privacy**

7. Move storage to IndexedDB (web) / SQLite (mobile) with versioned schema migrations.
8. Export and import (JSON, plus a PDF summary to share with a counsellor) and verified delete.
9. App lock: PIN or biometric (mobile), privacy blur in the app switcher.

**Safety (product-defining)**

10. Multilingual crisis detection (Hindi, Hinglish, then regional languages) as layer 2, keeping the local check as the always-on fail-safe.
11. Crisis evaluation harness with a recall target as a CI gate (ai-evaluation role).
12. Post-crisis follow-up check-in after 24 hours. One-tap SOS. Optional trusted contact.
13. Helpline directory with verification dates and a review process.
14. Content and prompts reviewed by a licensed clinical psychologist before launch.

## 4. Features: add

| #   | Feature                                                                                                                                                                                                                                                               | Value                                                                    | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| F1  | **Accounts + opt-in cross-device sync** (anonymous-first; sign-in only to sync)                                                                                                                                                                                       | Unlocks mobile and web together without forcing sign-up                  | L    |
| F2  | **Smart reminders**: daily check-in at a chosen time, countdown-aware nudges, quiet hours (Expo push + Web Push)                                                                                                                                                      | Biggest retention lever for a journaling app                             | M    |
| F3  | **Weekly reflection report**: triggers, mood trend, what helped, next week's focus                                                                                                                                                                                    | Makes the "hidden patterns" promise tangible                             | M    |
| F4  | **Study-life signals**: study hours, mock-test scores, sleep (optionally HealthKit / Health Connect) correlated with mood                                                                                                                                             | Generalises the tag-to-mood correlation; strongest exam-specific insight | M    |
| F5  | **Hindi + Hinglish UI and AI**, regional languages after                                                                                                                                                                                                              | Reaches students who vent in Hindi/Hinglish                              | M    |
| F6  | **Voice journaling** (speech to text, Hindi-capable)                                                                                                                                                                                                                  | Lower friction on bad days                                               | M    |
| F7  | **Companion memory**: conversations kept on-device; "what helped you before" retrieval over your own entries                                                                                                                                                          | Genuinely personalised support                                           | L    |
| F8  | _Folded into F14_ (CBT thinking tools are part of the Calm Toolkit)                                                                                                                                                                                                   | n/a                                                                      | n/a  |
| F9  | **Exam-day mode**: stripped-down UI with a pre-exam ritual, a 2-minute ground, and nothing else                                                                                                                                                                       | Fits the prep-phase engine we already have                               | S    |
| F10 | **Mindfulness library v2**: guided audio, sleep wind-down, offline playback                                                                                                                                                                                           | Content depth                                                            | M    |
| F11 | **Home-screen widgets**: one-tap mood log (iOS/Android)                                                                                                                                                                                                               | Habit formation                                                          | M    |
| F12 | **Gentle progress**: non-punitive streaks, milestones, and "you showed up" moments                                                                                                                                                                                    | Motivation without guilt                                                 | S    |
| F13 | **Institution dashboard** (coaching institutes, schools): aggregate, anonymised, k-anonymity-thresholded trends only                                                                                                                                                  | B2B revenue path; later phase                                            | L    |
| F14 | ✅ **Built 2026-11-09.** **Calm Toolkit**: about 35 stress and anxiety activities chosen on-device from 3 quick answers, learning from before/after ratings; SOS button, safety plan builder. **No AI calls.** Spec: [`calm-toolkit.draft.md`](calm-toolkit.draft.md) | Instant help offline at no AI cost; core to the brief                    | M    |

Not recommended: peer chat or community. Moderation risk is too high for a minors-heavy, crisis-adjacent audience.

## 5. Decisions the CEO must make before PRD intake

1. **Privacy model:** (a) local-first with **end-to-end encrypted** opt-in sync, where the server stores only ciphertext and weekly reports are computed on-device. This is recommended: it is the moat and the trust story. Or (b) server-side encryption at rest, which is simpler and allows server-generated reports, but means we hold readable journals.
2. **Under-18 users:** support them with DPDP verifiable parental consent (a large share of the market, more onboarding work), or launch 18+ first (UPSC/CAT/GATE skew older).
3. **Backend weight:** the full EOS standard (NestJS on AWS Mumbai), as recommended above, or a lean ADR deviation (Next.js Route Handlers + managed Postgres such as Neon/Supabase, Mumbai region) to ship faster now and extract later.
4. **v1 scope:** which of F1–F14 make the first release.

**Decided 2026-11-10 (CEO):** web only for now. No native Android/iOS app; the Expo row in §2 and phase P3 are deferred until the CEO reopens mobile. Mobile-only features (F11 widgets, biometric lock, Expo push, Maestro) are out of scope with it.

## 6. Proposed phasing (EOS owners)

| Phase     | Outcome                                                                                                                          | Lead roles                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P-1 (now) | **Before 1 Dec 2026:** switch both endpoints to `gemini-3.1-flash-lite`; move the model ID into env config                       | ai-platform-lead, backend-lead                                    |
| P0        | ADRs for stack, privacy and auth; monorepo + `packages/core` extraction; pnpm, `.nvmrc`, env schema, Sentry; hardening items 1–6 | staff-architect, devops, backend-lead, ai-platform-lead           |
| P1        | Next.js web at feature parity + PWA, IndexedDB, i18n scaffold, legal pages, consent flow; **Calm Toolkit (F14)**                 | frontend-lead, uiux-lead, accessibility, security-reviewer        |
| P2        | API: auth, sync, reminders/push, rate limits, Langfuse, staging/prod                                                             | backend-lead, database, devops, ai-platform-lead                  |
| P3        | **Deferred (web-only decision, 2026-11-10).** Expo app at parity: biometric lock, notifications, offline, store submission       | frontend-lead (mobile), qa-automation, accessibility              |
| P4        | Differentiators: multilingual crisis classifier + evals, voice, CBT tools, study-life signals, weekly report                     | ai-platform-lead, prompt-engineer, ai-evaluation, product-manager |

Release gate (every phase): `playbooks/software-factory.md` §Release gate, plus crisis-recall eval ≥ target, WCAG 2.2 AA, no P0/P1 security findings.

## 7. AI usage and model choice

**Rule: call the AI only where free-text words need understanding.** Everything else is deterministic, on-device and free.

| Runs with no AI call                                                                                                                                                                                                          | Uses AI (capped)                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calm Toolkit picks and activities · quick check-in (mood + chips) · crisis detection and helplines · trends, triggers, correlations · weekly stats · reminders · lessons and journaling prompts · pre-written coping messages | ① Journal analysis: once per entry, only when the student taps "Reflect with AI" or writes ≥ ~30 words; never on edit. Its triggers are reused by the local engine, with no second call. ② Companion chat. ③ Optional weekly narrative paragraph via Batch API (50% off). |

Further cost controls:

- Chat sends a rolling summary plus the last 6 turns instead of 20 raw messages.
- Per-message caps, and a daily per-user turn cap with a friendly message.
- A stable system-prompt prefix, so cache pricing can apply. It is not confirmed to be automatic for Flash-Lite, so it is not counted in the estimate below.
- Output caps sized to measured use (the analysis used 344 tokens; cap it around 600).
- If the API is down, the Calm Toolkit still covers everything.

**Model probe** (our key, 2026-11-09; list prices from Google's pricing page; one real analysis prompt measured at 520 input and 344 output tokens):

| Model                        | Works with our key?                                 | $ / 1M in · out | Cost per analysis | Verdict                             |
| ---------------------------- | --------------------------------------------------- | --------------- | ----------------- | ----------------------------------- |
| `gemini-2.5-flash` (current) | Yes, until **shutdown on 1 Dec 2026**               | 0.30 · 2.50     | ≈ $0.0010         | Migrate now                         |
| `gemini-2.5-flash-lite`      | **No**: 404 "no longer available to new users"      | 0.10 · 0.40     | n/a               | Unavailable                         |
| `gemini-3.1-flash-lite`      | **Yes**: valid schema JSON, 0 thinking tokens, ~2 s | 0.25 · 1.50     | **≈ $0.00065**    | **Recommended default**             |
| `gemini-3.5-flash-lite`      | Yes, but **400 on `thinkingBudget: 0`**             | 0.30 · 2.50     | ≈ $0.0010         | Fallback (drop the thinking config) |

**Estimate:** an active student doing about 20 analyses, 40 chat turns and 4 weekly narratives a month comes to **about $0.03 a month**, or roughly **$300 a month per 10,000 active students**, on `gemini-3.1-flash-lite`. These are planning assumptions to re-check with real usage data from the `cost-review` skill.

**Privacy note:** Google's terms for the unpaid Gemini API tier let Google use prompts and responses to improve its products, including human review. Journals are sensitive, so **production must run on the paid tier**. Re-confirm against the current Gemini API terms before launch.
