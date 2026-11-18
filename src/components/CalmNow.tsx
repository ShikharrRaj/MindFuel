/**
 * CalmNow — the 3-tap "How are you right now?" flow. The student picks what it
 * feels like, how strong, and how much time they have (plus, optionally, where
 * they are). The pure engine in lib/calm picks an activity and explains why.
 * No AI call is involved, so it is instant and works offline.
 *
 * If the student checked in recently, their tags and AI triggers pre-fill the
 * answers; they can change anything.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Activity,
  CALM_STATES,
  type CalmState,
  type Setting,
  SETTINGS,
} from '../lib/activities'
import {
  type CalmPrefs,
  type CalmRecommendation,
  type CalmSession,
  HELP_THRESHOLD,
  prefillFromEntry,
  recommendActivities,
  type TimeBudget,
} from '../lib/calm'
import type { PrepPhase } from '../lib/exams'
import type { JournalEntry } from '../lib/types'
import type { SessionInput } from '../hooks/useCalmStore'
import ActivityPlayer from './ActivityPlayer'
import HelpNow from './HelpNow'
import IntensitySlider from './IntensitySlider'

interface Props {
  latest: JournalEntry | null
  phase?: PrepPhase
  sessions: CalmSession[]
  prefs: CalmPrefs
  onLog: (input: SessionInput) => void
  onSettingChange: (setting: Setting | undefined) => void
  onOpenPlan: () => void
  /** A recent check-in was flagged: the Calm tab already leads with helplines. */
  crisis?: boolean
  /** Crisis language was typed into an activity. */
  onCrisisText?: () => void
}

const TIMES: { id: TimeBudget; label: string }[] = [
  { id: 1, label: '1 min' },
  { id: 5, label: '5 min' },
  { id: 15, label: '15 min' },
]

const MAX_STATES = 2

export default function CalmNow({
  latest,
  phase,
  sessions,
  prefs,
  onLog,
  onSettingChange,
  onOpenPlan,
  crisis = false,
  onCrisisText,
}: Props) {
  // Pre-fill from a check-in in the last 24 hours. Until the student changes
  // something, the pre-fill follows `latest` (e.g. a check-in that finishes
  // after this tab was opened); once they touch a field, their answer wins.
  const prefill = useMemo(() => prefillFromEntry(latest, new Date()), [latest])
  const [chosenStates, setStates] = useState<CalmState[] | null>(null)
  const [chosenIntensity, setIntensity] = useState<number | null>(null)
  const states = chosenStates ?? prefill?.states ?? []
  const intensity = chosenIntensity ?? prefill?.intensity ?? 5
  const [minutes, setMinutes] = useState<TimeBudget>(5)
  const [setting, setSetting] = useState<Setting | undefined>(prefs.setting)
  const [rec, setRec] = useState<CalmRecommendation | null>(null)
  const [active, setActive] = useState<Activity | null>(null)
  const [activeDone, setActiveDone] = useState(false)
  // Latest known distress in this flow: each activity starts from where the
  // previous one left off, so it is credited only with its own effect.
  const [level, setLevel] = useState<number | null>(null)
  const [limitNote, setLimitNote] = useState(false)
  const recHeading = useRef<HTMLHeadingElement>(null)

  // Move focus to the suggestion when it appears, and back to it when an
  // activity closes, so nobody is dropped to the top of the page.
  useEffect(() => {
    if (rec && !active) recHeading.current?.focus()
  }, [rec, active])

  function toggleState(id: CalmState) {
    const prev = states
    if (prev.includes(id)) {
      setStates(prev.filter((s) => s !== id))
      setLimitNote(false)
    } else if (prev.length >= MAX_STATES) {
      // Never silently swap a choice: explain the limit instead.
      setLimitNote(true)
    } else {
      setStates([...prev, id])
    }
  }

  function start(activity: Activity) {
    setActive(activity)
    setActiveDone(false)
  }

  function log(input: SessionInput) {
    onLog(input)
    if (input.after !== undefined) setLevel(input.after)
  }

  function chooseSetting(id: Setting) {
    const next = setting === id ? undefined : id
    setSetting(next)
    onSettingChange(next)
  }

  function suggest(e: React.FormEvent) {
    e.preventDefault()
    setActive(null)
    setLevel(null)
    setRec(
      recommendActivities(
        { states, intensity, minutes, setting },
        { phase, sessions, prefs, now: new Date() },
      ),
    )
  }

  if (active) {
    return (
      <>
        <ActivityPlayer
          key={active.id}
          activity={active}
          headingLevel={2}
          before={level ?? intensity}
          states={states}
          source="calm"
          haptics={prefs.haptics}
          onLog={log}
          onDone={() => setActiveDone(true)}
          onClose={() => setActive(null)}
          onCrisisText={onCrisisText}
        />
        {rec?.next && activeDone && active.id === rec.primary.id && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => rec.next && start(rec.next)}
          >
            Next step: {rec.next.name} <span aria-hidden="true">→</span>
          </button>
        )}
      </>
    )
  }

  return (
    <section className="card" aria-labelledby="calm-now-title">
      <p className="card__eyebrow">Calm now</p>
      <h2 id="calm-now-title">How are you right now?</h2>
      {prefill && prefill.states.length > 0 && (
        <p className="field__hint">
          Pre-filled from your last check-in. Change anything that does not fit.
        </p>
      )}

      <form onSubmit={suggest}>
        <div className="field">
          <span id="calm-states-label">What’s it like? Pick up to two.</span>
          <div
            className="tag-row"
            role="group"
            aria-labelledby="calm-states-label"
            style={{ marginTop: '0.5rem' }}
          >
            {CALM_STATES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="tag-chip"
                aria-pressed={states.includes(s.id)}
                onClick={() => toggleState(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="field__hint" role="status">
            {limitNote
              ? 'You can pick two. Unselect one to choose another.'
              : ''}
          </p>
        </div>

        <IntensitySlider
          id="calm-intensity"
          label="How strong is it?"
          value={intensity}
          onChange={setIntensity}
        />

        <div className="field">
          <span id="calm-time-label">How much time do you have?</span>
          <div
            className="seg"
            role="group"
            aria-labelledby="calm-time-label"
            style={{ marginTop: '0.5rem' }}
          >
            {TIMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="seg__btn"
                aria-pressed={minutes === t.id}
                onClick={() => setMinutes(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span id="calm-where-label">
            Where are you? (optional, remembered)
          </span>
          <div
            className="tag-row"
            role="group"
            aria-labelledby="calm-where-label"
            style={{ marginTop: '0.5rem' }}
          >
            {SETTINGS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="tag-chip"
                aria-pressed={setting === s.id}
                onClick={() => chooseSetting(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn--primary">
          Find something that helps
        </button>
      </form>

      {rec && (
        <div className="recommendation">
          {!crisis && (rec.showHelp || intensity >= HELP_THRESHOLD) && (
            <HelpNow onOpenPlan={onOpenPlan} />
          )}
          <p className="card__eyebrow" style={{ marginTop: '1.25rem' }}>
            Suggested for you
          </p>
          <h3 ref={recHeading} tabIndex={-1}>
            {rec.primary.name}{' '}
            <span className="muted rec__time">· {rec.primary.minutes} min</span>
          </h3>
          <p className="reasoning">
            <strong>Why this: </strong>
            {rec.reason}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => start(rec.primary)}
          >
            Start {rec.primary.name.toLowerCase()}
          </button>
          {rec.alternates.length > 0 && (
            <div className="rec__alts">
              <span id="calm-alts-label" className="muted">
                Or try:
              </span>
              <div
                className="tag-row"
                role="group"
                aria-labelledby="calm-alts-label"
              >
                {rec.alternates.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="tag-chip"
                    onClick={() => start(a)}
                  >
                    {a.name} · {a.minutes} min
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
