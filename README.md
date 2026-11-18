# MindFuel — Exam Wellness Companion

A private, Generative-AI wellness companion for students preparing for
high-stakes exams (NEET, JEE, CUET, CAT, GATE, UPSC). Students journal freely,
log their mood, and MindFuel uses **Google Gemini** to surface _hidden_ stress
triggers and emotional patterns, then offers context-aware coping support — and
escalates safely when someone is in crisis.

> **Persona / vertical:** the exam-stressed student. Every decision the app makes
> is conditioned on _their_ exam and _their_ prep phase.

---

## Why this design wins on each evaluation axis

| Criterion                     | How MindFuel addresses it                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem alignment**         | Real Gemini analysis of open-ended journals → named triggers, emotional themes, and a coping strategy. Exam + prep-phase aware (foundation vs. final-sprint). A longitudinal **Patterns** view shows trends "standard trackers miss".                                                                                                                                                     |
| **Security / responsibility** | API key lives **only** server-side (Vercel Edge functions) — never in the browser. Defence-in-depth **crisis detection** (local + AI) routes to verified Indian helplines instead of coaching. Inputs are validated and length-capped. Journals are stored **on-device only**; a "Delete my data" control is always available. Clear "not a substitute for professional care" disclaimer. |
| **Efficiency**                | Lean bundle (~85 KB gzip; the Calm and Focus tabs lazy-load), no artificial loading delays, **token-streamed** chat for instant feedback, tiny privacy-preserving payloads (only the current entry + a short mood summary are sent, never full history).                                                                                                                                  |
| **Testing**                   | 99 unit + component tests (Vitest + Testing Library) covering the context engine, safety detector, insights math, the Calm Toolkit engine, and the key UI flows (check-in, calm flow, SOS, safety plan).                                                                                                                                                                                  |
| **Accessibility**             | Skip link, semantic landmarks, ARIA tab/radiogroup/log patterns, keyboard-operable mood picker, live regions, visible focus rings, `prefers-reduced-motion` support.                                                                                                                                                                                                                      |
| **Code quality**              | Typed throughout, pure logic isolated from UI and network, one component per file, documented modules. The AI call is a single isolated function — swappable without UI changes.                                                                                                                                                                                                          |

---

## Calm Toolkit (no AI calls)

Help that is instant, works offline, and costs nothing to run:

- **Calm now:** three taps (what it feels like, how strong 0–10, how much time, plus optionally where you are). A pure engine (`lib/calm.ts`) picks from **36 activities**: breathing, body, grounding, CBT thinking tools, exam-specific routines, sleep, connection and anger. The rule is body first when distress is high, thinking tools when calmer. Every pick shows why. Before/after ratings teach it what works for _you_, on-device.
- **SOS button** ("Calm now", always in the header, also at `/#sos`): cyclic sighing starts immediately, with questions after. If things are still bad, helplines and your own safety plan come first.
- **My plan:** a personal **safety plan** (Stanley-Brown model) and a **coping card** ("when I feel X, I do Y", built from your own ratings) with progress wins.
- **Learn:** a 60-second daily lesson, a "what's happening in my body" panic explainer, a printable **exam-hall pocket card**, and a shareable **guide for parents** (`/#for-parents`, contains no personal data).
- **Focus tab:** study-block timer with engine-picked break activities, a burnout nudge after 3 hours without a long break, and **offline soundscapes** (rain, brown noise, tanpura drone) synthesised with Web Audio.
- **Journaling prompts** matched to your tags and prep phase, and **vibration cues** for eyes-closed breathing on supported phones.

---

## Architecture

```
src/
  lib/            # pure, fully-tested domain logic (no React, no network)
    types.ts        shared contracts
    exams.ts        exam + prep-phase engine  ← "logical decision making"
    safety.ts       crisis detection + helplines
    insights.ts     mood trends / trigger frequency / correlations
    prompts.ts      AI system + user prompt builders
    context.ts      builds the per-student prompt context
    storage.ts      on-device (localStorage) persistence, AI consent, backups
    normalize.ts    validators for stored data, backups and model replies
    legal.ts        privacy policy + terms (typed content)
    errorReport.ts  privacy-scrubbed error reports
    api.ts          browser → /api client (incl. streaming)
    activities.ts   Calm Toolkit activity library (typed data)
    calm.ts         activity selection engine + on-device learning
    safetyPlan.ts   safety-plan model (Stanley-Brown)
    focus.ts        study-block timer rules
    lessons.ts · guides.ts · journalPrompts.ts   static content
  device/         # browser APIs: haptics, Web Audio, error reporter
  hooks/          # useCalmStore (sessions, prefs, safety plan)
  components/     # one component per file
  App.tsx         # state + composition only
api/              # Vercel Edge functions — hold the Gemini key
  analyze.ts        structured journal analysis (JSON schema)
  chat.ts           streaming companion chat
  report.ts         scrubbed browser error reports → Vercel logs
  health.ts         liveness check
  _lib/             helpers (not deployed as functions): model chain +
                    fallback, rate limits, request validation
e2e/              # Playwright smoke test: production build + real headers
```

**Privacy model:** the browser is the only database. Nothing reaches the AI
until the student agrees (a one-time consent, withdrawable at any time). Then
journal text is sent to the server for a single, stateless analysis/chat call
and is never persisted or logged server-side. Students can download a backup
of their data, restore it, or delete it all.

---

## Running locally

You need a free Gemini API key from
[Google AI Studio](https://aistudio.google.com/apikey). **No Vercel account is
required to run locally** — a small Vite dev plugin runs the same `/api`
handlers under `npm run dev`.

```bash
npm install
cp .env.example .env.local          # then paste your key into .env.local
npm run dev                         # full app + AI at http://localhost:5173
```

The same handlers deploy to Vercel as Edge functions unchanged (see below).

### Scripts

```bash
npm run dev         # Vite dev server, with the /api handlers
npm run build       # typecheck + production build
npm test            # unit + component + server tests (Vitest)
npm run test:e2e    # Playwright smoke test (run `npm run build` first)
npm run test:watch  # watch mode
npm run typecheck   # types only
```

---

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (framework preset: Vite).
2. Set the environment variables listed in [`.env.example`](.env.example):
   - **`GEMINI_API_KEY`**, from a **paid-tier** Google project (the privacy
     policy promises prompts are not used for training);
   - **Upstash Redis** (Vercel Marketplace) and **`RATE_LIMIT_SALT`**: without
     them the AI features stay paused on Vercel, so the bill can't run away;
   - `VITE_OPERATOR_NAME` and `VITE_CONTACT_EMAIL`, shown on the legal pages.
3. Deploy. The `/api/*` Edge functions are detected automatically, and the
   security headers come from `vercel.json`.

Operating it (monitoring, model changes, rollback, safety incidents):
[docs/runbook.md](docs/runbook.md). Architecture decisions:
[projects/mindfuel/arch/adr/](projects/mindfuel/arch/adr/README.md).

---

## Safety note

MindFuel is a supportive companion, **not** a substitute for professional
medical or mental-health care. If you or someone you know is in distress, please
contact a professional or one of the helplines surfaced in the app
(Tele-MANAS **14416**, free and 24/7, or **112** in an emergency).
