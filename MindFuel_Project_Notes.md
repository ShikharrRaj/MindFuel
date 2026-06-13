# MindFuel — Full Project & Architecture Notes

**Your complete reference for the judges' Q&A. Nothing here should surprise you on stage.**
Team RPS · PromptWars · Challenge: _Build a GenAI-powered Mental Wellness Tracker for students in high-stakes exams (NEET, JEE, CUET, CAT, GATE, UPSC)._

---

## 1. One-line pitch

MindFuel is a private, Generative-AI wellness companion for exam-stressed students. Students journal freely and log mood; Google Gemini surfaces _hidden_ stress triggers and emotional patterns, gives context-aware coping support, and escalates safely to verified helplines when someone is in crisis.

**Persona / vertical:** the exam-stressed student. Every decision the app makes is conditioned on _their_ exam and _their_ prep phase.

---

## 2. How the brief maps to features (say this if asked "did you cover the prompt?")

| Brief asks for                                        | What MindFuel does                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Monitor & improve well-being during high-stakes exams | Daily mood + journal check-in, longitudinal Patterns dashboard                                                          |
| Analyze open-ended journaling & mood logs             | `/api/analyze` runs Gemini over the free-text entry + mood                                                              |
| Uncover _hidden_ stress triggers & emotional patterns | AI-inferred `triggers` + `themes`; insights engine computes trigger frequency, mood trend, and **tag–mood correlation** |
| Conversational AI                                     | `/api/chat` — streaming companion                                                                                       |
| Hyper-personalized, contextual support                | Context engine conditions every prompt on exam + prep-phase + recent mood                                               |
| Real-time tailored coping strategies                  | Each analysis returns one phase-appropriate `copingStrategy` with steps                                                 |
| Adaptive mindfulness exercises                        | `recommendExercise()` picks box-breathing / 4-7-8 / 5-4-3-2-1 from the moment's context                                 |
| Motivational encouragement                            | `encouragement` field — genuine, not toxic positivity                                                                   |
| Safely acting as an empathetic companion              | Two-layer crisis detection → verified helplines; never diagnoses                                                        |

---

## 3. The architecture (the whole picture)

```
┌──────────────────────────── BROWSER (the only "database") ────────────────────────────┐
│  React 19 + TypeScript + Vite                                                           │
│                                                                                         │
│  App.tsx  ── state + composition only; 4 tabs                                           │
│     ├─ Check in   (CheckIn, MoodPicker, InsightCard, SafetyCard)                        │
│     ├─ Reset      (MindfulExercise)                                                     │
│     ├─ Companion  (streaming chat)                                                      │
│     └─ Patterns   (Dashboard)                                                           │
│                                                                                         │
│  lib/  ← PURE domain logic, no React, no network, fully unit-tested                     │
│     types.ts      shared contracts (the source of truth for shapes)                     │
│     exams.ts      exam labels + days-until + prep-PHASE engine                          │
│     safety.ts     local crisis detector + Indian helplines + disclaimer                 │
│     insights.ts   trends, top triggers, streaks, tag–mood correlation                   │
│     exercises.ts  adaptive mindfulness recommender                                      │
│     prompts.ts    builds the AI system + user prompts (persona, safety rules)           │
│     context.ts    assembles the privacy-preserving PromptContext                        │
│     storage.ts    localStorage persistence (profile + entries)                          │
│     api.ts        browser → /api client (incl. stream reader)                           │
│                                                                                         │
│  Sends ONLY: current entry text + mood + tags + a 1-line mood summary + exam + date     │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                         │ HTTPS (tiny payload)
                                         ▼
┌──────────────────────── VERCEL EDGE FUNCTIONS (hold the secret) ──────────────────────┐
│  /api/analyze.ts   structured JSON analysis (responseSchema enforced)                   │
│  /api/chat.ts      token-streamed companion chat                                        │
│                                                                                         │
│  • GEMINI_API_KEY lives ONLY here (process.env) — never shipped to the browser          │
│  • Validates + length-caps input (4000 chars), mood 1–5, history capped at 20 msgs      │
│  • Runs the SAME local crisis check as a server-side fail-safe                          │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                         │ @google/genai SDK
                                         ▼
                          ┌──────────── Google Gemini 2.5 Flash ────────────┐
                          │  thinkingBudget: 0  (fast/cheap, fits JSON)      │
                          │  analyze → JSON schema   chat → streamed tokens  │
                          └──────────────────────────────────────────────────┘
```

**Tech stack:** React 19, TypeScript, Vite 7, `@google/genai` SDK, Gemini 2.5 Flash, Vercel Edge runtime, Vitest + Testing Library. Bundle ≈ 68 KB gzip. Local dev runs the same `/api` handlers via a small Vite plugin (no Vercel account needed).

---

## 4. Module-by-module deep dive (so you can answer ANY "how does X work?")

### `lib/types.ts` — the contracts

- `ExamType`: NEET | JEE | CUET | CAT | GATE | UPSC | Boards | Other.
- `UserProfile`: name (optional, only for copy), exam, examDateISO.
- `Analysis` (what the AI returns): `triggers[]`, `themes[]`, `tone`, `summary`, `copingStrategy{title, steps[]}`, `encouragement`, `reasoning`, `severity`.
- `severity`: `ok | elevated | crisis`. `crisis` triggers the safety flow.
- `JournalEntry`: id, createdAtISO, mood (1–5), text, tags[], optional analysis.
- **Why it matters:** one place defines the shape used by UI, storage and the server — a change surfaces as a type error everywhere, not a silent runtime bug.

### `lib/exams.ts` — the prep-phase engine ("logical decision making")

- `daysUntil(examDateISO, now)` → whole-day difference.
- `phaseForDays(days)` bands: `>90 foundation`, `≤90 momentum`, `≤30 consolidation`, `≤7 final-sprint`, `=0 exam-day`, `<0 post-exam`.
- Each phase carries a `promptHint` injected into the AI prompt (e.g. foundation = "prevent early burnout, avoid urgency"; final-sprint = "protect sleep, discourage cramming new material"; exam-day = "keep it short, grounding, breathing only").
- `countdownLabel(days)` → "9 days to go" / "Exam day" / "Exam was 2 days ago".
- **Pure functions** — same logic feeds both the AI prompt and the UI. Fully unit-tested.

### `lib/safety.ts` — crisis detection + helplines (most important module)

- `detectCrisis(text)` scans for ~15 word-boundary regex patterns ("kill myself", "want to die", "self-harm", "can't go on", "suicid…", etc.). Returns `{isCrisis, matches[]}` so it's explainable and testable.
- **Deliberately biased toward false positives** — a false alarm is a minor annoyance; a miss is unacceptable.
- Word-boundary aware to avoid silly hits ("die" in "diet", "studied").
- `HELPLINES`: Tele-MANAS **14416** (Govt of India, 24/7, multilingual), KIRAN **1800-599-0019** (24/7, 13 languages), iCall/TISS **9152987821**, AASRA **+91-9820466726**. Each has a `tel:` href so it's tappable.
- `SUPPORT_DISCLAIMER`: "MindFuel is a supportive companion, not a substitute for professional care."
- **Honest limitation (say this proactively):** the list is English-focused for the hackathon scope; production would localize to Hindi + regional languages and use a trained classifier instead of regex.

### `lib/insights.ts` — the "patterns standard trackers miss" engine

- `topTriggers(entries)` — frequency-ranks AI-detected triggers across all entries.
- `moodTrend(entries)` — daily average mood series (oldest first) for the chart.
- `averageMood`, `currentStreak` (consecutive days with an entry; counts today _or_ yesterday so an evening logger isn't punished).
- `summarizeRecentMood(entries)` — the **privacy-preserving** one-liner sent to the AI instead of full history ("recent mood averaging 2.4/5 over 5 check-ins, trending down").
- `tagMoodImpact(entries, tag)` — **the hidden-correlation killer feature**: average mood on days with a tag vs without ("mood dips on mock-test days"). Returns null when there isn't enough data on both sides (no fake conclusions from thin data).

### `lib/exercises.ts` — adaptive mindfulness

- 3 techniques: **box-breathing** (4-4-4-4, steadies nerves), **4-7-8** (wind-down/sleep), **5-4-3-2-1 grounding** (stops spiralling).
- `recommendExercise(ctx)` precedence: (1) very low mood or overwhelm/panic signals → grounding; (2) sleep difficulty OR final-sprint/exam-day phase → 4-7-8; (3) otherwise → box breathing.
- Returns a **student-facing reason** for the choice (transparent, like the analysis reasoning).

### `lib/prompts.ts` — the AI's "behaviour system"

- `personaPreamble`: "You are MindFuel, an empathetic companion for a student in India preparing for [exam]…" + the phase hint + recent mood.
- **Hard rules baked in:** be warm and validating, acknowledge feelings before advice; never diagnose / no medical advice / never claim to be a therapist; avoid toxic positivity; on any self-harm signal, do **not** problem-solve — express care + direct to a helpline; keep coping suggestions small and doable in minutes.
- `buildAnalyzeSystemInstruction` adds: infer HIDDEN triggers, produce a phase-appropriate coping strategy, write the `reasoning` in second person ("Because you mentioned…"), set severity correctly, respond ONLY as schema JSON.
- `buildChatSystemInstruction` adds: open conversation, 2–5 sentences, one small suggestion per reply, gentle follow-up question.

### `lib/context.ts` — assembles `PromptContext`

- Turns the minimal client payload (exam + date + mood summary) into `{examLabel, phaseHint, phaseLabel, countdown, recentMoodSummary}`. The full journal history **never leaves the device**.

### `lib/storage.ts` / `api.ts`

- `storage.ts`: load/save profile + entries to localStorage; `clearAll()` powers "Delete my data".
- `api.ts`: `requestAnalysis()` (POST JSON) and the streaming chat reader.

### `api/analyze.ts` (Edge function)

- Model `gemini-2.5-flash`, `responseMimeType: application/json` + `responseSchema` (forces well-formed `Analysis`), `temperature 0.7`, `thinkingConfig.thinkingBudget: 0`, `maxOutputTokens: 1200`.
- Validates: non-empty text, ≤ 4000 chars, mood 1–5.
- **Fail-safe:** after the AI returns, if the local `detectCrisis` matches, severity is forced to `crisis` — the local check always wins.

### `api/chat.ts` (Edge function)

- Streams with `generateContentStream`, `temperature 0.8`, `thinkingBudget 0`, `maxOutputTokens 600`, history capped at last 20 messages.
- **Crisis fast-path:** if the latest user message trips `detectCrisis`, it bypasses the model entirely and streams a caring message + the helpline list — the AI never tries to "coach" a crisis.

---

## 5. The data flow of one check-in (walk a judge through this)

1. Student picks exam + date in onboarding → stored on-device. App derives prep phase immediately.
2. Student types a journal entry, sets mood (1–5), optionally taps context tags.
3. On submit, **the browser runs `detectCrisis` first** — if it matches, the SafetyCard with helplines shows instantly, regardless of network.
4. The client sends a tiny payload (entry + mood + tags + 1-line mood summary + exam + date) to `/api/analyze`.
5. Edge function builds the context-aware prompt, calls Gemini with a forced JSON schema, gets back triggers/themes/coping/reasoning/severity.
6. Local crisis check overrides severity if needed; result returns to the browser.
7. Entry + analysis saved to localStorage. InsightCard renders the reasoning + coping plan. (If the API fails, the entry is **still saved** — the student never loses their words.)
8. Over time, the Patterns dashboard computes trends, top triggers, streaks, and tag–mood correlations from stored entries.

---

## 6. Why it wins, by judging axis

- **Problem alignment** — real Gemini analysis of open journals → named triggers + phase-aware coping; longitudinal Patterns view shows what standard trackers miss.
- **Security / responsibility** — API key server-side only; two-layer crisis detection; on-device-only journals with one-tap delete; verified helplines; clear "not a substitute for care" disclaimer; inputs validated + length-capped.
- **Efficiency** — ~68 KB gzip bundle; token-streamed chat (no fake delays); tiny privacy-preserving payloads.
- **Testing** — 37 unit + component tests (Vitest + Testing Library) over context engine, safety detector, insights math, and key UI flows.
- **Accessibility** — skip link, semantic landmarks, ARIA tab/radiogroup/log, keyboard-operable mood picker, live regions, visible focus rings, `prefers-reduced-motion`.
- **Code quality** — typed throughout; pure logic isolated from UI + network; one component per file; the AI call is a single isolated function — **swappable without UI changes**.

---

## 7. Anticipated judge questions + crisp answers

**Q: How do you protect privacy / handle sensitive data?**
A: The browser is the only database — journals live in localStorage and never persist server-side. Only the single current entry plus a one-line mood summary are sent for analysis; never the full history. The Gemini key lives only in the Edge function. One-tap "Delete my data" wipes everything.

**Q: What if the AI mis-rates a crisis (false negative)?**
A: That's exactly why we have two layers. A local, deterministic detector runs _before_ the network and biases toward false positives; if it matches, it forces `severity = crisis` regardless of what the model said. The model is a second opinion, never the sole gatekeeper.

**Q: Isn't a regex crisis detector crude?**
A: Yes, intentionally for the hackathon — it's a fast, offline, explainable first line of defence. It's word-boundary aware to cut noise. Production would add a trained multilingual classifier as Layer 2 while keeping the local check as the always-on fail-safe.

**Q: Why Gemini 2.5 Flash?**
A: Fast and cheap for short, frequent calls; supports forced JSON schema output (reliable structure) and token streaming (instant-feeling chat). We disable "thinking" since the task needs no extended reasoning — that keeps latency and cost down and ensures the JSON fits the output budget. And the call is isolated, so we could swap models without touching the UI.

**Q: How is this different from a normal mood tracker / journaling app?**
A: Three things: (1) it infers _hidden_ triggers from free text, not just a number; (2) every response is conditioned on the student's exam and prep phase — context, not generic tips; (3) it surfaces non-obvious correlations like "your mood dips on mock-test days."

**Q: How would you scale this / make it production-ready?**
A: Localize crisis detection + prompts to Hindi and regional languages; add a trained crisis classifier; optional encrypted cloud sync (opt-in) for multi-device; clinician-reviewed content; analytics on aggregate (not personal) trends; rate limiting + abuse protection on the Edge functions.

**Q: Is this a medical device / does it give medical advice?**
A: No — and that's enforced in the prompt's hard rules. It never diagnoses, never gives medication advice, never claims to be a therapist, and shows a disclaimer plus helplines. It's a supportive companion that escalates to humans.

**Q: What's stopping someone from copying it?**
A: The moat is the context engine + safety design, not any single screen — the phase-aware prompting, the transparent reasoning, the defence-in-depth safety, and the correlation insights are the hard, considered parts. They're also exactly what a careless clone gets wrong (and dangerously so, for this domain).

**Q: How accurate is trigger detection?**
A: It's LLM-inferred, so we treat it as _suggestive, not diagnostic_ — surfaced as "themes we noticed," and the student stays in control. Frequency ranking across many entries (not one) is what makes the pattern reliable over time.

---

## 8. Honest limitations (own these before a judge points them out)

- Crisis detection is English-only and regex-based for now (production: multilingual + ML).
- Single-device (localStorage) — no cross-device sync yet (a deliberate privacy trade-off).
- AI insights are suggestive, not clinical; not a diagnosis.
- Trigger/correlation quality improves with more entries — thin data shows fewer conclusions by design.

---

## 9. Quick facts to have on the tip of your tongue

- **Name:** MindFuel · **Team:** RPS · **Model:** Google Gemini 2.5 Flash
- **Stack:** React 19 + TS + Vite, Vercel Edge functions
- **Tests:** 37 (Vitest + Testing Library) · **Bundle:** ~68 KB gzip
- **4 surfaces:** Check in · Reset · Companion · Patterns
- **5 prep phases:** foundation → momentum → consolidation → final-sprint → exam-day/post-exam
- **3 exercises:** box breathing · 4-7-8 · 5-4-3-2-1 grounding
- **Helplines:** Tele-MANAS 14416 · KIRAN 1800-599-0019 · iCall 9152987821 · AASRA +91-9820466726

> Mental health is a sensitive topic. If a judge or audience member seems personally affected, it's fine to gently note the helplines on the closing slide are real and available 24/7.
