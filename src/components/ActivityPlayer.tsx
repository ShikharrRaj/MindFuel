/**
 * ActivityPlayer — runs any Calm Toolkit activity, whatever its format:
 * breathing pacer, guided checklist, timer, reflection worksheet, menu, or a
 * copyable script. Wraps every activity in the same before → run → after flow
 * so each session can teach the engine what helps this student.
 *
 * Reflection notes are deliberately NOT saved: they stay on screen only.
 *
 * Safety: helplines appear whenever a rating is 9+ or distress rises to 7+, and
 * any free text the student types is scanned locally with `detectCrisis`. A
 * match is STICKY for this activity: the urgent help block stays through the
 * after-check and done stages, canned closing lines are suppressed, and the
 * student is never congratulated instead of being pointed to help. The match
 * is also reported up (onCrisisText) so the whole app keeps leading with
 * helplines after this activity closes.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { Activity, CalmState } from '../lib/activities'
import {
  ratingNeedsHelp,
  type SessionOutcome,
  type SessionSource,
} from '../lib/calm'
import { formatClock } from '../lib/focus'
import { detectCrisis } from '../lib/safety'
import type { SessionInput } from '../hooks/useCalmStore'
import { useCountdown } from '../hooks/useCountdown'
import AfterCheck from './AfterCheck'
import BreathPacer from './BreathPacer'
import HelpNow from './HelpNow'
import IntensitySlider from './IntensitySlider'

const CRISIS_TEXT_TITLE =
  'It sounds like you are carrying something really painful. Please reach out to someone now:'

interface Props {
  activity: Activity
  /** Distress before starting, if the calm flow already asked. */
  before?: number
  /** Ask for a before-rating when none was given (library launches). */
  askBefore?: boolean
  states: CalmState[]
  source: SessionSource
  haptics: boolean
  onLog: (input: SessionInput) => void
  onClose?: () => void
  /** Called once the after-rating is logged. */
  onDone?: () => void
  /** 2 when the player replaces a card's h2 (Calm now, library). */
  headingLevel?: 2 | 3
  /** Crisis language was typed into this activity (reported once). */
  onCrisisText?: () => void
}

type Stage = 'before' | 'run' | 'after' | 'done'

export default function ActivityPlayer({
  activity,
  before: initialBefore,
  askBefore = false,
  states,
  source,
  haptics,
  onLog,
  onClose,
  onDone,
  headingLevel = 3,
  onCrisisText,
}: Props) {
  const uid = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const [before, setBefore] = useState<number | undefined>(initialBefore)
  const [draftBefore, setDraftBefore] = useState(5)
  const [stage, setStage] = useState<Stage>(
    askBefore && initialBefore === undefined ? 'before' : 'run',
  )
  const [result, setResult] = useState<{ after?: number } | null>(null)
  const [textCrisis, setTextCrisis] = useState(false)
  const showHelp = textCrisis || ratingNeedsHelp(before, result?.after)

  /** Free text typed into a worksheet or message box. */
  function checkText(text: string) {
    if (!textCrisis && detectCrisis(text).isCrisis) {
      setTextCrisis(true)
      onCrisisText?.()
    }
  }

  function finish(after: number | undefined, outcome: SessionOutcome) {
    onLog({ activityId: activity.id, states, before, after, outcome, source })
    setResult({ after })
    setStage('done')
    onDone?.()
  }

  // Each stage swaps the controls out; move focus to the heading so keyboard
  // and screen-reader users are not dropped back to the top of the page.
  const firstStage = useRef(true)
  useEffect(() => {
    if (firstStage.current) {
      firstStage.current = false
      return
    }
    headingRef.current?.focus()
  }, [stage])

  return (
    <section className="player" aria-labelledby={`${uid}-title`}>
      <Heading id={`${uid}-title`} ref={headingRef} tabIndex={-1}>
        {activity.name}
      </Heading>
      <p className="muted">{activity.purpose}</p>
      {activity.caution && (
        <p className="caution">
          <strong>Before you start: </strong>
          {activity.caution}
        </p>
      )}
      {/* While typing, crisis help sits next to the text (in the body). */}
      {showHelp && !(stage === 'run' && textCrisis) && (
        <HelpNow
          urgent={textCrisis}
          title={textCrisis ? CRISIS_TEXT_TITLE : undefined}
        />
      )}

      {stage === 'before' && (
        <>
          <IntensitySlider
            id={`${uid}-before`}
            label="How strong is it right now?"
            value={draftBefore}
            onChange={setDraftBefore}
          />
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setBefore(draftBefore)
              setStage('run')
            }}
          >
            Start
          </button>
        </>
      )}

      {stage === 'run' && (
        <>
          <ActivityBody
            activity={activity}
            haptics={haptics}
            crisis={textCrisis}
            onText={checkText}
            onFinished={() => setStage('after')}
          />
          <div className="player__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStage('after')}
            >
              I’m done
            </button>
            {onClose && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Choose something else
              </button>
            )}
          </div>
        </>
      )}

      {stage === 'after' && <AfterCheck before={before} onSubmit={finish} />}

      {stage === 'done' && (
        <div className="reasoning" role="status">
          {textCrisis
            ? 'Thank you for writing that down. What you are going through matters, and you do not have to carry it alone. Please reach out to one of the lines above now.'
            : showHelp
              ? 'That did not bring it down, and that is okay. Please reach out to someone now: you do not have to get through this alone.'
              : result?.after !== undefined &&
                  before !== undefined &&
                  before - result.after > 0
                ? `You brought it from ${before} to ${result.after}. That was you.`
                : 'Thank you for taking a moment for yourself. Some days take more than one try.'}
          {onClose && (
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function ActivityBody({
  activity,
  haptics,
  crisis,
  onText,
  onFinished,
}: {
  activity: Activity
  haptics: boolean
  crisis: boolean
  onText: (text: string) => void
  onFinished: () => void
}) {
  const f = activity.format
  switch (f.kind) {
    case 'breathing':
      return (
        <BreathPacer
          name={activity.name}
          phases={f.phases}
          rounds={f.rounds}
          haptics={haptics}
          onComplete={onFinished}
        />
      )
    case 'steps':
      return <Checklist steps={f.steps} />
    case 'timer':
      return (
        <>
          <Countdown seconds={f.seconds} onFinished={onFinished} />
          <ol className="steps">
            {f.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      )
    case 'reflect':
      return (
        <Reflect
          fields={f.fields}
          closing={f.closing}
          crisis={crisis}
          onText={onText}
        />
      )
    case 'menu':
      return <Menu options={f.options} closing={f.closing} />
    case 'script':
      return (
        <Script
          intro={f.intro}
          choices={f.choices}
          crisis={crisis}
          onText={onText}
        />
      )
  }
}

function Checklist({ steps }: { steps: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() =>
    steps.map(() => false),
  )
  const allDone = checked.every(Boolean)
  return (
    <>
      <ul className="ground-list">
        {steps.map((step, i) => (
          <li key={i}>
            <label className="ground-step">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() =>
                  setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)))
                }
              />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ul>
      {allDone && (
        <p className="breath__label" role="status">
          You’re here, in this moment. That’s enough for right now.
        </p>
      )}
    </>
  )
}

function Countdown({
  seconds,
  onFinished,
}: {
  seconds: number
  onFinished: () => void
}) {
  const timer = useCountdown(seconds, onFinished)
  const fresh = timer.left === seconds
  return (
    <div className="countdown">
      <p className="countdown__clock">{formatClock(timer.left)}</p>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => {
          if (timer.running) return timer.pause()
          if (timer.left === 0) timer.reset(seconds)
          timer.start()
        }}
      >
        {timer.running ? 'Pause' : fresh ? 'Start timer' : 'Resume'}
      </button>
    </div>
  )
}

function Reflect({
  fields,
  closing,
  crisis,
  onText,
}: {
  fields: { id: string; label: string; placeholder?: string }[]
  closing: string
  crisis: boolean
  onText: (text: string) => void
}) {
  const uid = useId()
  const [values, setValues] = useState<Record<string, string>>({})
  const anyFilled = Object.values(values).some((v) => v.trim() !== '')

  function change(id: string, value: string) {
    const next = { ...values, [id]: value }
    setValues(next)
    onText(Object.values(next).join('\n'))
  }
  return (
    <div>
      {fields.map((field) => (
        <div className="field" key={field.id}>
          <label htmlFor={`${uid}-${field.id}`}>{field.label}</label>
          <textarea
            id={`${uid}-${field.id}`}
            className="textarea--short"
            value={values[field.id] ?? ''}
            placeholder={field.placeholder}
            maxLength={1000}
            onChange={(e) => change(field.id, e.target.value)}
          />
        </div>
      ))}
      <p className="field__hint">
        These notes stay on this screen and are not saved.
      </p>
      {crisis ? (
        <HelpNow urgent title={CRISIS_TEXT_TITLE} />
      ) : (
        anyFilled && <p className="reasoning">{closing}</p>
      )}
    </div>
  )
}

function Menu({ options, closing }: { options: string[]; closing: string }) {
  const uid = useId()
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div>
      <p id={`${uid}-label`}>Pick one:</p>
      <div className="tag-row" role="group" aria-labelledby={`${uid}-label`}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className="tag-chip"
            aria-pressed={picked === o}
            onClick={() => setPicked(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <p className="reasoning" role="status" style={{ marginTop: '1rem' }}>
          {closing}
        </p>
      )}
    </div>
  )
}

function Script({
  intro,
  choices,
  crisis,
  onText,
}: {
  intro: string
  choices: { id: string; label: string; text: string }[]
  crisis: boolean
  onText: (text: string) => void
}) {
  const uid = useId()
  const [pickedId, setPickedId] = useState(choices[0]?.id)
  const picked = choices.find((c) => c.id === pickedId)
  const [text, setText] = useState(picked?.text ?? '')
  const [copied, setCopied] = useState(false)

  function choose(id: string) {
    setPickedId(id)
    setText(choices.find((c) => c.id === id)?.text ?? '')
    setCopied(false)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div>
      <p>{intro}</p>
      <div className="tag-row" role="group" aria-label="What do you need?">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className="tag-chip"
            aria-pressed={pickedId === c.id}
            onClick={() => choose(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: '1rem' }}>
        <label htmlFor={`${uid}-text`}>Your message (edit freely)</label>
        <textarea
          id={`${uid}-text`}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onText(e.target.value)
          }}
        />
      </div>
      {crisis && <HelpNow urgent title={CRISIS_TEXT_TITLE} />}
      <button type="button" className="btn btn--ghost" onClick={copy}>
        {copied ? 'Copied' : 'Copy message'}
      </button>
      <span className="sr-only" role="status">
        {copied ? 'Message copied to clipboard' : ''}
      </span>
    </div>
  )
}
