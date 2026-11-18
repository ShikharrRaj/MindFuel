/**
 * FocusCoach — a Pomodoro-style study timer that takes breaks seriously. Each
 * break comes with an activity picked by the calm engine (movement, stretch,
 * breathing). If the student skips long breaks and keeps going for three
 * hours, it nudges them to take one. Pure rules live in lib/focus.
 *
 * The timer itself lives at app level (useFocusSession), so it keeps time on
 * other tabs: a floating timer follows the student around MindFuel, the tab
 * title shows the countdown, and where the browser supports it the timer can
 * pop out over other windows.
 */

import { useMemo, useState } from 'react'
import type { Activity } from '../lib/activities'
import { recommendActivities } from '../lib/calm'
import { FOCUS_PRESETS, PHASE_LABEL, shouldNudgeLongBreak } from '../lib/focus'
import type { CalmStore } from '../hooks/useCalmStore'
import type { FocusSession } from '../hooks/useFocusSession'
import type { PipControl } from '../hooks/usePipWindow'
import ActivityPlayer from './ActivityPlayer'
import PipToggle from './PipToggle'
import TimeLeft from './TimeLeft'

interface Props {
  store: CalmStore
  session: FocusSession
  pip?: PipControl
}

export default function FocusCoach({ store, session, pip }: Props) {
  // A break activity belongs to the session it was picked in: once the
  // session is reset, ended or re-timed (from here or from the floating
  // timer), its epoch moves on and the activity closes.
  const [picked, setPicked] = useState<{
    activity: Activity
    epoch: number
  } | null>(null)
  const breakActivity =
    picked && picked.epoch === session.epoch ? picked.activity : null
  const { phase, preset, blocks, sinceLongBreak } = session

  const suggestion = useMemo(() => {
    if (phase === 'focus') return null
    return recommendActivities(
      {
        states: ['cant-focus', 'low-energy'],
        intensity: 4,
        minutes: phase === 'long-break' ? 15 : 5,
      },
      { sessions: store.sessions, prefs: store.prefs, now: new Date() },
    )
  }, [phase, store.sessions, store.prefs])

  return (
    <section className="card" aria-labelledby="focus-title">
      <p className="card__eyebrow">Focus coach</p>
      <h2 id="focus-title">Study in blocks, rest on purpose</h2>

      <div className="seg" role="group" aria-label="Focus and break length">
        {FOCUS_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="seg__btn"
            aria-pressed={preset.id === p.id}
            onClick={() => session.changePreset(p.id)}
          >
            {p.label} min
          </button>
        ))}
      </div>

      <div className="focus-clock">
        <p className="focus-clock__phase">{PHASE_LABEL[phase]}</p>
        <TimeLeft
          phase={phase}
          left={session.left}
          className="focus-clock__time"
        />
        <p className="muted">
          {blocks} focus block{blocks === 1 ? '' : 's'} done ·{' '}
          {Math.floor(sinceLongBreak / 60)}h {sinceLongBreak % 60}m since a long
          break
        </p>
      </div>

      <div className="tag-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={session.startOrPause}
        >
          {session.startLabel}
        </button>
        {phase !== 'focus' && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={session.skipBreak}
          >
            Skip break
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={session.reset}
        >
          Reset
        </button>
        {pip && <PipToggle pip={pip} />}
      </div>

      <p className="field__hint">
        Switch tabs freely: a small timer follows you around MindFuel and the
        browser tab shows the time left.
        {pip?.supported &&
          ' Pop out keeps the timer on top of your other windows too.'}
      </p>

      <p role="status" className="field__hint">
        {session.announcement}
      </p>

      {phase === 'focus' && shouldNudgeLongBreak(sinceLongBreak) && (
        <div className="reasoning">
          <strong>
            You have been focusing for over 3 hours without a proper break.
          </strong>{' '}
          A {preset.longBreakMinutes}-minute break now will help your focus come
          back better than pushing through.
          <div style={{ marginTop: '0.6rem' }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={session.takeLongBreakNow}
            >
              Take a long break now
            </button>
          </div>
        </div>
      )}

      {suggestion && !breakActivity && (
        <div className="recommendation">
          <h3 className="card__eyebrow" style={{ marginTop: '1rem' }}>
            For this break
          </h3>
          <div className="tag-row">
            {[suggestion.primary, ...suggestion.alternates].map((a) => (
              <button
                key={a.id}
                type="button"
                className="tag-chip"
                onClick={() => setPicked({ activity: a, epoch: session.epoch })}
              >
                {a.name} · {a.minutes} min
              </button>
            ))}
          </div>
        </div>
      )}

      {breakActivity && (
        <ActivityPlayer
          key={breakActivity.id}
          activity={breakActivity}
          states={['cant-focus']}
          source="focus"
          haptics={store.prefs.haptics}
          onLog={store.logSession}
          onClose={() => setPicked(null)}
        />
      )}
    </section>
  )
}
