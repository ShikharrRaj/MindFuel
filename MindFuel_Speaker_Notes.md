# MindFuel — Speaker Notes (Presentation Crib Sheet)

**Team RPS · PromptWars · Challenge: Mental Wellness Tracker**
Target: 5–8 minutes. ~90 seconds is the live demo. These notes are also embedded inside the .pptx (View → Notes), but keep this open as your crib sheet.

> **Golden rules:** Slow down. Make eye contact. Don't read bullets — the slide does that. Your job is the _story_ and the _demo_. Practise the demo flow at least twice before you go on.

---

## Timing map (≈7 min)

| Slide | Topic                           | Time | Running |
| ----- | ------------------------------- | ---- | ------- |
| 1     | Title / hook                    | 0:25 | 0:25    |
| 2     | The problem                     | 0:45 | 1:10    |
| 3     | The product (4 surfaces)        | 0:40 | 1:50    |
| 4     | Context engine (differentiator) | 0:50 | 2:40    |
| 5     | The AI + security               | 0:50 | 3:30    |
| 6     | Hidden patterns                 | 0:40 | 4:10    |
| 7     | Safety & responsibility         | 0:50 | 5:00    |
| 8     | Architecture                    | 0:35 | 5:35    |
| 9     | **LIVE DEMO**                   | 1:30 | 7:05    |
| 10    | Why we win                      | 0:30 | 7:35    |
| 11    | Close + Q&A                     | 0:20 | 7:55    |

If you're tight on time, compress slides 8 and 10 — never the demo (9) or safety (7).

---

## Slide 1 — Title (hook, ~25s)

"Hi judges, we're **Team RPS**. Every year in India, lakhs of students walk into NEET, JEE and UPSC carrying months of silent stress. We built **MindFuel** — an AI wellness companion that doesn't just track _how_ a student feels, but understands _why_, and acts on it safely."

- Say the name clearly. One line on what it does. Move on fast — don't read the chips.

## Slide 2 — The problem (~45s)

"This isn't a small problem. In **2022 alone, over 13,000 students** in India died by suicide — the highest in a decade, per the NCRB." _(pause one beat)_
"Students face months of burnout and self-doubt. The real danger is the **hidden triggers** — peer comparison, sleep loss, a bad mock test — things students can't even name themselves."

- Land the close: "A standard mood tracker just records a number. It never explains _why_, and it never acts when it matters."
- Tone: serious and caring, not alarmist.

## Slide 3 — The product (~40s)

"MindFuel is one companion with **four surfaces.**"

- **Check in** — journal freely + log a mood; Gemini surfaces hidden triggers + a coping plan.
- **Reset** — adaptive mindfulness; picks the right breathing/grounding exercise for how you feel.
- **Companion** — streaming conversational AI; validates first, advises second.
- **Patterns** — longitudinal trends + correlations standard trackers miss.
- Close: "Private by default — no account, no setup, works the second you open it."

## Slide 4 — Context engine (DIFFERENTIATOR, ~50s)

"Here's what makes it smart — every reply is tuned to **THIS** student."

- _(point left)_ "We take their exam, days until it, today's mood, and a short on-device mood summary."
- _(point middle)_ "Days-to-exam maps to a **prep phase**. Each phase needs different support — months out it's preventing burnout; days out it's protecting sleep, not cramming."
- _(point right)_ "So the same words, typed days apart, get genuinely different help."
- **Judge line:** "And this decision logic is **pure, unit-tested functions** — transparent, not a black box."

## Slide 5 — The AI + security (~50s)

"Under the hood, two Gemini calls, each shaped for its job."

- **/api/analyze** — "Structured: we force a JSON schema, so we always get clean triggers, themes and coping steps. There's a visible **reasoning** field — the AI explains _'Because you mentioned…'_. That builds trust."
- **/api/chat** — "Streaming token-by-token, so it feels instant. Empathy-first, one suggestion at a time."
- **Security beat** _(point at the bottom strip, slow down):_ "Only the current entry and a one-line mood summary ever leave the device — never the full journal. And the Gemini key lives only in the server Edge function, **never in the browser.**"

## Slide 6 — Hidden patterns (~40s)

"This is the part standard trackers miss — over time we turn the journal into signal."

- _(point at chart)_ "We chart the mood trend; the dips become clues."
- "We frequency-rank triggers — comparison ×7, sleep loss ×5."
- **Killer line:** "We can say: _'Your mood averages 1.8/5 on mock-test days, versus 3.4 otherwise.'_ That hidden link is exactly what the brief asked us to surface."

## Slide 7 — Safety & responsibility (DELIBERATE, ~50s)

"For a mental-health tool, safety is the most important feature — so we built **defence in depth.**"

- **Layer 1** — "A local, deterministic crisis detector runs in the browser **before any network call.** We bias toward false positives — annoying someone with a helpline is fine; missing a real crisis is not."
- **Layer 2** — "Gemini independently rates severity — but a local crisis match **always overrides** the model. Never a single point of failure."
- "Data stays on-device with one-tap delete. Crisis routes to **verified government helplines** like Tele-MANAS, not coaching. And it never diagnoses or pretends to be a therapist."

## Slide 8 — Architecture (~35s)

"Architecturally, clean and built to scale." _(gesture left → right)_

- "Browser runs React with all pure logic isolated — exams, safety, insights — and localStorage is the only database."
- "Vercel Edge functions hold the key and validate every input."
- "Gemini returns schema-clean analysis or a streamed reply — behind one isolated function, so the model is **swappable.**"
- Close: "37 tests, a 68 KB bundle, typed end-to-end, fully accessible."

## Slide 9 — LIVE DEMO (~90s) — _switch to the app NOW, narrate as you click_

1. **Onboard** — pick exam + date: "Notice it already knows the prep phase."
2. **Check in** — type a _pre-decided, real, messy_ entry, set a low mood, submit.
3. **AI insight** — point at the triggers, the **reasoning line**, the coping plan as they appear.
4. **Reset** — "It auto-suggested this exercise because of how I felt."
5. **Companion** — ask one short question; let the streaming reply show.
6. **Patterns** — open it; point at the trend + a correlation.

- ⚠️ **Safety beat (rehearse!):** type one crisis phrase → app flips to helplines. "Instantly — no network needed."
- Have the entry text **memorized**. Keep talking while it loads. If the network/API fails, say: "The entry is still saved on-device — we never lose the student's words," and show the Patterns view instead.

## Slide 10 — Why we win (~30s)

"We built MindFuel to score on **every axis** you're judging." _(skim, don't read every row)_
"Real Gemini problem-solving, serious responsibility and safety, an efficient streamed experience, 37 tests, full accessibility, clean typed code where the AI call is swappable."

## Slide 11 — Close (~20s)

"MindFuel doesn't just track mood — it understands context, finds the hidden patterns, and keeps students safe when it matters most. An empathetic companion that's always there." _(beat)_ "We're Team RPS. Thank you — happy to take questions."

- Leave the helpline numbers on screen during Q&A.

---

## Demo backup plan

- **No internet / API down:** the app still saves entries and the **local crisis detector still works** — demo that + the Patterns view (uses stored data, no network).
- **Have screenshots/screen-recording** of a full successful flow ready as a fallback.
- Pre-seed a few past entries before you present so **Patterns** has a real trend + correlation to show.

## Q&A prep — see `MindFuel_Project_Notes.md` for full answers

Likely questions: How is privacy handled? · What if the AI mis-rates a crisis? · Why Gemini? · How would you scale / localize to Hindi & regional languages? · Is this a medical device? · What's stopping someone copying it? · How accurate is the trigger detection?
