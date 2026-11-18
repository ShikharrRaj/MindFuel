# Calm Toolkit: stress and anxiety activities (draft, feature F14)

> Status: **BUILT in the current app (2026-11-09)**, all of §2–§5 · Feeds: `production-roadmap.draft.md` → product-manager (`prd-intake`)
> All activity content needs sign-off from a licensed clinical psychologist before launch.

## 1. Goal

When a student feels stressed or anxious, they get the right calming activity within about three taps. **No AI call is needed**: activities, the questions and the choice logic all run on the device, and they work offline. This extends today's `src/lib/exercises.ts`, which has 3 techniques and a simple rule-based pick, into a full library and a scoring engine.

Guiding rule: **body first when the alarm is loud, mind when it is quieter.** At high distress, start with breathing, temperature, movement or grounding. Once things are calmer, offer a thinking tool (reframing, planning) or a reflective one.

## 2. The "How are you right now?" flow (no AI, 3 taps)

1. **What's it like?** Pick up to 2: racing thoughts · panic / tight chest · overwhelmed by syllabus · can't sleep · after a bad mock · fear about results or future · comparing with others · family pressure · can't focus / procrastinating · low, no energy · irritable / angry · lonely.
2. **How strong?** A 0–10 slider, or three faces: manageable / strong / very strong.
3. **How much time?** 1 min · 5 min · 15 min.
4. _(Optional, remembered)_ **Where are you?** At my desk · in bed · exam hall / library (silent) · I can move around.

The result is one recommended activity, two alternatives, and one "why" sentence. Afterwards the app asks **"How strong is it now?"** and records the before/after change, so the app learns what works for this student.

## 3. Activity library (v1, about 35)

| Group                 | Activity                                                                               | Best for                              | Time   | Discreet (exam hall / library) |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- | ------ | ------------------------------ |
| Breathing             | **Physiological sigh / cyclic sighing**: double inhale, long exhale                    | Panic, acute stress (fastest)         | 1–5 m  | ✅                             |
|                       | **Extended exhale** (in 4, out 6), no breath holds                                     | Anxiety, especially panic-prone users | 2 m    | ✅                             |
|                       | Box breathing (existing)                                                               | Pre-exam nerves, focus                | 2 m    | ✅                             |
|                       | 4-7-8 (existing)                                                                       | Sleep, wind-down                      | 2 m    | ✅                             |
|                       | Resonance breathing (about 6 breaths a minute)                                         | Daily baseline calm                   | 5–10 m | ✅                             |
| Body                  | **Cold-water reset**: cool water on face and wrists (DBT TIPP)                         | Very high distress, panic             | 1 m    | ❌                             |
|                       | Short progressive muscle relaxation                                                    | Tension, sleep                        | 5 m    | ❌                             |
|                       | 60-second shake-out / movement burst                                                   | Restless, angry, stuck                | 1 m    | ❌                             |
|                       | Palm press: isometric push, then release                                               | Exam-hall tension                     | 1 m    | ✅                             |
|                       | Butterfly hug: alternating taps                                                        | Overwhelm, self-soothing              | 2 m    | ❌                             |
|                       | Desk stretch sequence                                                                  | Long study sessions                   | 3 m    | ❌                             |
|                       | 10-minute walk in daylight                                                             | Low mood, can't focus                 | 10 m   | ❌                             |
| Grounding             | 5-4-3-2-1 (existing)                                                                   | Spiralling, dissociating              | 3 m    | ✅                             |
|                       | 3-3-3: name 3 things you see, hear and can move                                        | Quick reset                           | 1 m    | ✅                             |
|                       | Orient to the room: slow look around, name colours                                     | Panic                                 | 1 m    | ✅                             |
|                       | Feet on the floor / anchor object                                                      | Exam hall                             | 1 m    | ✅                             |
| Thinking tools (CBT)  | **Thought reframe**: catch it, check it, change it                                     | Harsh self-talk                       | 5 m    | ✅                             |
|                       | **Worry time**: park the worry, schedule 15 min later                                  | Rumination, study blocked by worry    | 3 m    | ✅                             |
|                       | Decatastrophise: worst, best and most likely outcome, plus what I'd do                 | Results / future fear                 | 5 m    | ✅                             |
|                       | Control circle: what I can control vs can't                                            | Overwhelm, family pressure            | 4 m    | ✅                             |
|                       | Fact vs feeling                                                                        | "I'm going to fail"                   | 3 m    | ✅                             |
|                       | Self-compassion break (3 steps)                                                        | After a bad mock, shame               | 3 m    | ✅                             |
|                       | "Would I say this to a friend?"                                                        | Comparison, self-criticism            | 2 m    | ✅                             |
| Exam-specific         | **Mock-test debrief**: one thing that went well, one thing to fix, one thing to let go | After a bad mock                      | 5 m    | ✅                             |
|                       | **Next tiny step**: break the syllabus into a 5-minute starter task                    | Overwhelm, procrastination            | 3 m    | ✅                             |
|                       | **Blank-mind protocol**: pen down, 2 sighs, skip the question, come back               | Mind goes blank in the exam           | 1 m    | ✅                             |
|                       | Pre-exam ritual (night before + morning)                                               | Final sprint, exam day                | 10 m   | —                              |
|                       | Comparison detox: timer on study groups / social apps + reframe                        | Comparing with others                 | 3 m    | ✅                             |
|                       | Parent conversation script: choose what you need (space, reassurance, help)            | Family pressure                       | 5 m    | ✅                             |
| Sleep                 | Brain dump onto paper                                                                  | Racing thoughts at night              | 5 m    | —                              |
|                       | Cognitive shuffle: imagine random, unrelated objects                                   | Can't fall asleep                     | 10 m   | —                              |
|                       | Body scan + 4-7-8                                                                      | Sleep                                 | 10 m   | —                              |
| Low mood / connection | Tiny pleasant-activity menu (behavioural activation)                                   | Low, no energy                        | 5 m    | —                              |
|                       | Three good things                                                                      | Evening reflection                    | 3 m    | ✅                             |
|                       | Reach-out script: a pre-written text to a friend                                       | Lonely                                | 2 m    | ✅                             |
| Anger                 | Name it to tame it + physical release                                                  | Irritable, angry                      | 3 m    | ❌                             |

Each activity is a typed data record: steps, timer and pacer config, target states, intensity band, duration, discreet flag, needs-movement flag, cautions (for example, cold water and heart conditions; breath holds and panic), and an optional audio file. Adding an activity means adding data, not code.

## 4. Selection engine (pure function in `packages/core`, unit-tested)

`recommendActivities(answers, profile, history) → { primary, alternates[2], chain?, reason }`

1. **Safety gate first.** If the journal text trips `detectCrisis`, or distress is 9–10 with hopelessness signals, show the SafetyCard and helplines. Offer only stabilising activities, and only _alongside_ the helplines, never instead of them.
2. **Hard filters:**
   - the activity fits the time available;
   - exam hall / library means discreet only, and in bed means no movement;
   - activities the student marked "not for me" are excluded;
   - for panic or a tight chest, avoid breath-hold techniques and prefer the sigh or extended exhale;
   - caution flags are respected.
3. **Score:**
   - 3 × match with the picked states;
   - 2 × fit with the intensity band (≥7 favours body-first, 4–6 mixed, ≤3 favours thinking/reflective);
   - 1 × fit with the prep phase (exam day = short and discreet; foundation = build the skill);
   - **+ personal effectiveness**: average drop in distress from this student's past uses, against a prior, weighted more as uses grow;
   - − repetition penalty (used in the last 24 h) + a small bonus for untried activities, so the app keeps learning.
4. **Chain at high distress:** stabilise, then process. For example, cyclic sighing (1 min) → control circle (4 min).
5. **Reason** is built from the winning factors, e.g. "You said panic, very strong, and you're in the library, so here's a silent 1-minute breath."
6. **Learning** stays on-device: before/after rating plus helped / didn't / not for me. A "What works for you" panel appears on Patterns.

If an AI journal analysis already exists, its `triggers` feed in as extra signals. **The engine never makes its own AI call.**

## 5. More ideas that need no AI

- **SOS calm button**: one tap from the home screen, a widget or a lock-screen notification starts cyclic sighing immediately. Questions come after; no decisions mid-panic.
- **Exam-hall pocket card**: a 3-step discreet routine that works offline and is printable.
- **"What's happening in my body"**: a 30-second panic explainer. Knowing the symptoms are harmless reduces fear of the fear.
- **60-second daily lessons**: some stress helps performance; why the mind blanks; sleep and memory; the comparison trap.
- **Personal safety plan builder** (Stanley-Brown model): warning signs → my coping steps → people → professionals. One tap away during a crisis.
- **"When I feel X, I do Y" coping card**: built from what has actually worked, according to the student's own ratings.
- **Focus + break coach**: Pomodoro that suggests a break activity from the engine, plus a burnout nudge after 3 hours without a break.
- **Phase-aware journaling prompt library**: static content chosen from the picked states.
- **Offline soundscapes** (rain, brown noise, a tanpura drone) for focus and sleep.
- **Haptic breathing pacer** on mobile: vibration cues, so it works with eyes closed or discreetly.
- **Self-efficacy wins**: "You brought it from 8 to 4, 12 times this month."
- **Guide for parents and guardians**: a shareable page on supporting a student without adding pressure.
