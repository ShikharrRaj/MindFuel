/**
 * SosOverlay — one tap, no questions: cyclic sighing starts immediately.
 * Decisions are hard mid-panic, so questions come only afterwards. If things
 * are still bad, helplines and the student's own safety plan come first.
 *
 * Accessibility: a modal dialog. App makes the page behind it inert; focus
 * moves to the stage heading on open and on every stage change (so each step
 * is announced), Tab is kept inside, Escape closes, and focus returns to the
 * trigger on close.
 */

import { useEffect, useRef, useState } from 'react'
import { getActivity } from '../lib/activities'
import type { SafetyPlan, SafetyPlanKey } from '../lib/safetyPlan'
import { isPlanEmpty, SAFETY_PLAN_SECTIONS } from '../lib/safetyPlan'
import type { SessionInput } from '../hooks/useCalmStore'
import ActivityPlayer from './ActivityPlayer'
import BreathPacer from './BreathPacer'
import HelpNow from './HelpNow'

interface Props {
  haptics: boolean
  plan: SafetyPlan
  onLog: (input: SessionInput) => void
  onClose: () => void
  onMoreTools: () => void
  onOpenPlan: () => void
}

type Stage = 'breathe' | 'check' | 'calmer' | 'support' | 'ground'

const TITLES: Record<Stage, string> = {
  breathe: 'Breathe with me',
  check: 'How do you feel now?',
  calmer: 'Well done',
  support: 'Let’s get you some support',
  ground: 'Ground yourself',
}

/** Plan steps worth seeing in the moment, in the order they are used. */
const PLAN_IN_CRISIS: SafetyPlanKey[] = [
  'coping',
  'people',
  'professionals',
  'safeSpace',
  'reasons',
]

const SIGH = getActivity('physiological-sigh')!
const GROUND = getActivity('grounding-54321')!

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'

export default function SosOverlay({
  haptics,
  plan,
  onLog,
  onClose,
  onMoreTools,
  onOpenPlan,
}: Props) {
  const [stage, setStage] = useState<Stage>('breathe')
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Scroll lock, Escape, a focus trap, and focus return on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeRef.current()
        return
      }
      const dialog = dialogRef.current
      if (e.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = dialog.contains(active)
      const onTitle = active === titleRef.current
      if (e.shiftKey && (!inside || onTitle || active === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  // Runs after the effect above, so `previous` is still the trigger.
  useEffect(() => {
    titleRef.current?.focus()
  }, [stage])

  function answer(calmer: boolean) {
    onLog({
      activityId: SIGH.id,
      states: [],
      outcome: calmer ? 'helped' : 'not-really',
      source: 'sos',
    })
    setStage(calmer ? 'calmer' : 'support')
  }

  const format = SIGH.format.kind === 'breathing' ? SIGH.format : null
  const planSections = isPlanEmpty(plan)
    ? []
    : SAFETY_PLAN_SECTIONS.filter(
        (s) => PLAN_IN_CRISIS.includes(s.key) && plan[s.key].length > 0,
      )

  return (
    <div className="sos-backdrop">
      <div
        ref={dialogRef}
        className="sos"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
      >
        <div className="sos__head">
          <h2 id="sos-title" ref={titleRef} tabIndex={-1}>
            {TITLES[stage]}
          </h2>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            aria-label="Close calm now"
          >
            Close
          </button>
        </div>

        {stage === 'breathe' && format && (
          <>
            <p className="muted">
              Two breaths in through your nose, then one long breath out.
              Nothing else to do right now.
            </p>
            <BreathPacer
              name={SIGH.name}
              phases={format.phases}
              rounds={format.rounds}
              autoStart
              haptics={haptics}
              onComplete={() => setStage('check')}
            />
            <button
              type="button"
              className="link-btn"
              onClick={() => setStage('check')}
            >
              Skip ahead
            </button>
          </>
        )}

        {stage === 'check' && (
          <div className="tag-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => answer(true)}
            >
              A bit calmer
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => answer(false)}
            >
              Still really bad
            </button>
          </div>
        )}

        {stage === 'calmer' && (
          <>
            <p className="reasoning">
              You did that, and you can do it again any time.
            </p>
            <div className="tag-row">
              <button
                type="button"
                className="btn btn--primary"
                onClick={onMoreTools}
              >
                More ways to calm down
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        )}

        {stage === 'support' && (
          <>
            <HelpNow title="Please reach out to someone now. You deserve support." />
            {planSections.length > 0 ? (
              <div className="sos__plan">
                <h3>From your safety plan</h3>
                {planSections.map((s) => (
                  <div key={s.key}>
                    <h4 className="plan-mini__title">{s.title}</h4>
                    <ul className="steps">
                      {plan[s.key].map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={onOpenPlan}
                >
                  Open my full safety plan
                </button>
              </div>
            ) : (
              <p className="muted">
                When you feel steadier, you can make a safety plan in Calm,
                under My plan.
              </p>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStage('ground')}
            >
              Ground yourself while you reach out
            </button>
          </>
        )}

        {stage === 'ground' && (
          <ActivityPlayer
            activity={GROUND}
            states={['panic']}
            source="sos"
            haptics={haptics}
            onLog={onLog}
            onClose={() => setStage('support')}
          />
        )}

        <p className="sos__footer">
          In danger right now? Call <a href="tel:112">112</a> (emergency) or{' '}
          <a href="tel:14416">14416</a> (Tele-MANAS, 24/7).
        </p>
      </div>
    </div>
  )
}
