# MindFuel runbook

How to deploy, watch and fix MindFuel in production. Written for whoever is on
call; no prior context assumed.

## What runs where

| Piece                       | Where                      | Notes                                                         |
| --------------------------- | -------------------------- | ------------------------------------------------------------- |
| Web app (static)            | Vercel CDN                 | Built by `npm run build`; headers and CSP in `vercel.json`    |
| `/api/analyze`, `/api/chat` | Vercel Edge functions      | Call Gemini; hold `GEMINI_API_KEY`                            |
| `/api/report`               | Vercel Edge function       | Browser error reports → runtime logs                          |
| `/api/health`               | Vercel Edge function       | `{"status":"ok","ai":true,"release":"abc1234"}`               |
| Rate-limit counters         | Upstash Redis (REST)       | Hashed IPs, 24 h TTL; in-memory fallback if unreachable       |
| Student data                | The student's browser only | We hold none of it; nothing to back up or restore on our side |

## Environment variables

All are listed with defaults in [`.env.example`](../.env.example). Set them in
Vercel → Project → Settings → Environment Variables, then **redeploy** (env
changes apply only to new deployments; `VITE_*` values are baked in at build).

| Variable                                             | Required          | Purpose                                                     |
| ---------------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| `GEMINI_API_KEY`                                     | yes               | Paid-tier key; restrict it to the Generative Language API   |
| `GEMINI_MODEL`                                       | no                | Default `gemini-3.1-flash-lite`                             |
| `GEMINI_FALLBACK_MODEL`                              | no                | Default `gemini-3.5-flash-lite`; `none` disables            |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | **yes on Vercel** | Shared rate limits (`KV_REST_API_*` also accepted)          |
| `RATE_LIMIT_SALT`                                    | **yes on Vercel** | Secret HMAC key for hashing IPs                             |
| `AI_DAILY_LIMIT_ANALYZE`, `AI_DAILY_LIMIT_CHAT`      | no                | Global AI calls per UTC day: default 2000 / 4000            |
| `RATE_LIMIT_ALLOW_MEMORY`                            | no                | `1` runs on Vercel without Redis (per-instance limits only) |
| `VITE_OPERATOR_NAME`, `VITE_CONTACT_EMAIL`           | before launch     | Shown on the privacy policy and terms                       |

Without Upstash **and** `RATE_LIMIT_SALT`, a Vercel deployment keeps the AI
features **paused** (they answer 503 "paused") so the bill cannot run away.
`/api/health` shows `"limiter":"off"` in that state, and `"redis"` when healthy.

## Monitoring

- **Uptime:** point a monitor at `GET /api/health` (expect 200, `"ai":true`
  and `"limiter":"redis"`).
- **Logs:** Vercel → Project → Logs. Every server log line is one JSON object;
  filter on `type`:
  - `client_error`: a browser error (message, path, release; never journal text).
  - `analyze_error`, `chat_error`, `chat_stream_error`: model failures, with status.
  - `ai_retry`: the primary model failed, so the fallback model was tried. A burst means the primary is overloaded.
  - `ai_daily_cap_reached`: a feature's global budget was hit (`route` says which); it answers 429 until 00:00 UTC.
  - `rate_limit_store_unavailable`: Upstash unreachable. Limits fall back to per-instance, with a small AI budget (200/day per instance), until it recovers.
  - `rate_limit_store_missing`: deployed without Upstash + salt, so AI is paused.
  - `rate_limit_store_quota`: Upstash is out of quota, so AI is paused (fail closed) until it recovers. Raise the Upstash plan.
  - `analyze_bad_model_output`: the model returned unusable JSON.
- **Cost:** set a budget alert on the Google Cloud billing account behind the
  key. A rough guide: an analysis costs about $0.001 at the default model.

## Common incidents

**AI features failing (Check in says "could not analyse", Companion apologises).**
Check the logs for `analyze_error` / `chat_error`.

- `503` or `ai_retry` bursts: Google overload. The fallback model already
  absorbs short spikes. If it persists, set `GEMINI_MODEL` to the healthier
  model and redeploy.
- `429`: quota. Raise the quota in Google AI Studio, or lower the daily budgets.
- `400 ... model`: the model ID was retired or renamed. Pick a current model
  from <https://ai.google.dev/gemini-api/docs/models>, check it accepts
  `thinkingLevel: MINIMAL` (Gemini 3.x) or `thinkingBudget: 0` (2.x), set
  `GEMINI_MODEL`, redeploy.

Everything else (Calm now, the Calm toolkit, Focus, safety plan, helplines)
runs on the device and keeps working during any AI outage.

**Abuse or cost spike.** Lower `AI_DAILY_LIMIT_ANALYZE` / `AI_DAILY_LIMIT_CHAT`
and redeploy; confirm Upstash is healthy (look for `rate_limit_store_unavailable`).
Per-client limits live in `api/_lib/rateLimit.ts` (`ROUTE_LIMITS`); they are
deliberately generous because many students share one mobile-carrier IP.
IPv6 clients are counted per /64, plus a looser daily bucket per /48 (5x one
client), so a block of addresses doesn't multiply an attacker's allowance.
Error reports are limited in memory only and never spend Upstash commands.
Add a Vercel Firewall rate-limit rule on `/api/*` and block attacking ranges
there. The hard ceiling is the **Gemini quota and billing budget** in Google
Cloud: set both before launch.

**Leaked API key.** Create a new key, set `GEMINI_API_KEY`, redeploy, then
delete the old key in Google AI Studio.

**Bad deploy.** Vercel → Deployments → pick the last good one → Promote
(instant rollback). Students' data is in their browsers, so a rollback loses
nothing.

**Blank page / CSP errors after a change.** `npm run build && npm run test:e2e`
reproduces the production headers locally and fails on any CSP violation. Fix
the code, or (carefully) the CSP in `vercel.json`.

## Safety incidents (highest priority)

Treat any of these as an incident, regardless of time of day:

- A helpline number is wrong or out of service.
- Crisis language was not caught (for example in a language or phrasing the
  detector misses).
- The app showed coaching instead of help to someone in crisis.

Steps:

1. Fix forward immediately. Helplines live in `src/lib/safety.ts` (`HELPLINES`);
   crisis phrases are in the same file and its tests
   (`src/lib/safety.test.ts`, `src/lib/safety.eval.test.ts`). Any change there
   needs a security-reviewer sign-off (CLAUDE.md rule 3), but **do not wait for
   a review to correct a wrong helpline number**: correct it, deploy, then review.
2. Add the missed phrase to the eval set so it can never regress.
3. Re-verify every helpline number and record the date in the PR.

## Releasing

CI (`.github/workflows/ci.yml`) runs lint, format, typecheck, unit tests, a
production-dependency audit, the build and the Playwright smoke test. A push to
`main` deploys to production; every pull request gets a preview deployment.
Check the preview (each tab, Calm now, one AI reflection) before merging.
