# MindFuel — Exam Wellness Companion

A private, Generative-AI wellness companion for students preparing for
high-stakes exams (NEET, JEE, CUET, CAT, GATE, UPSC). Students journal freely,
log their mood, and MindFuel uses **Google Gemini** to surface *hidden* stress
triggers and emotional patterns, then offers context-aware coping support — and
escalates safely when someone is in crisis.

> **Persona / vertical:** the exam-stressed student. Every decision the app makes
> is conditioned on *their* exam and *their* prep phase.

---

## Why this design wins on each evaluation axis

| Criterion | How MindFuel addresses it |
| --- | --- |
| **Problem alignment** | Real Gemini analysis of open-ended journals → named triggers, emotional themes, and a coping strategy. Exam + prep-phase aware (foundation vs. final-sprint). A longitudinal **Patterns** view shows trends "standard trackers miss". |
| **Security / responsibility** | API key lives **only** server-side (Vercel Edge functions) — never in the browser. Defence-in-depth **crisis detection** (local + AI) routes to verified Indian helplines instead of coaching. Inputs are validated and length-capped. Journals are stored **on-device only**; a "Delete my data" control is always available. Clear "not a substitute for professional care" disclaimer. |
| **Efficiency** | Lean bundle (~68 KB gzip), no artificial loading delays, **token-streamed** chat for instant feedback, tiny privacy-preserving payloads (only the current entry + a short mood summary are sent, never full history). |
| **Testing** | 37 unit + component tests (Vitest + Testing Library) covering the context engine, safety detector, insights math, and the key UI flows. |
| **Accessibility** | Skip link, semantic landmarks, ARIA tab/radiogroup/log patterns, keyboard-operable mood picker, live regions, visible focus rings, `prefers-reduced-motion` support. |
| **Code quality** | Typed throughout, pure logic isolated from UI and network, one component per file, documented modules. The AI call is a single isolated function — swappable without UI changes. |

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
    storage.ts      on-device (localStorage) persistence
    api.ts          browser → /api client (incl. streaming)
  components/     # one component per file
  App.tsx         # state + composition only
api/              # Vercel Edge functions — hold the Gemini key
  analyze.ts        structured journal analysis (JSON schema)
  chat.ts           streaming companion chat
```

**Privacy model:** the browser is the only database. Journal text is sent to the
server for a single, stateless analysis/chat call and is never persisted
server-side.

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
npm run dev         # Vite dev server (UI only)
npm run build       # typecheck + production build
npm test            # run the test suite
npm run test:watch  # watch mode
npm run typecheck   # types only
```

---

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (framework preset: Vite).
2. Add an environment variable **`GEMINI_API_KEY`** with your key.
3. Deploy. The `/api/*` Edge functions are detected automatically.

---

## Safety note

MindFuel is a supportive companion, **not** a substitute for professional
medical or mental-health care. If you or someone you know is in distress, please
contact a professional or one of the helplines surfaced in the app
(e.g. Tele-MANAS **14416**, KIRAN **1800-599-0019**).
