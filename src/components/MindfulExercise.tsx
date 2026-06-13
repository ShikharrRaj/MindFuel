/**
 * MindfulExercise — renders an adaptive mindfulness technique. Breathing
 * techniques run a guided, paced timer with an expanding/contracting visual;
 * grounding techniques render an interactive sensory checklist.
 *
 * Accessibility: the breathing pacer respects `prefers-reduced-motion` (no
 * scaling animation — text cues + countdown carry the guidance), the live phase
 * label is announced via aria-live, and the grounding steps are real checkboxes.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { roundDuration, type Technique } from '../lib/exercises'

interface Props {
  technique: Technique
}

export default function MindfulExercise({ technique }: Props) {
  if (technique.kind === 'grounding') {
    return <Grounding technique={technique} />
  }
  return <Breathing technique={technique} />
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function Breathing({ technique }: { technique: Technique }) {
  // Memoised so the timer effect's dependency identity is stable across renders.
  const phases = useMemo(() => technique.phases ?? [], [technique])
  const totalRounds = technique.rounds ?? 4
  const reduced = prefersReducedMotion()

  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(phases[0]?.seconds ?? 4)
  const [round, setRound] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const phase = phases[phaseIndex]

  useEffect(() => {
    if (!running) return
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // Phase complete — advance to the next phase / round.
        setPhaseIndex((pi) => {
          const next = pi + 1
          if (next < phases.length) {
            setSecondsLeft(phases[next].seconds)
            return next
          }
          // Round complete.
          setRound((r) => {
            const nextRound = r + 1
            if (nextRound >= totalRounds) {
              setRunning(false)
              setDone(true)
            }
            return nextRound
          })
          setSecondsLeft(phases[0].seconds)
          return 0
        })
        return s // superseded by the setSecondsLeft calls above
      })
    }, 1000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [running, phases, totalRounds])

  function start() {
    setDone(false)
    setRound(0)
    setPhaseIndex(0)
    setSecondsLeft(phases[0]?.seconds ?? 4)
    setRunning(true)
  }

  function stop() {
    setRunning(false)
  }

  // Visual scale: grow on inhale, shrink on exhale, hold steady otherwise.
  const label = phase?.label ?? ''
  const scale = label.includes('in') ? 1 : label.includes('out') ? 0.55 : 0.78

  return (
    <div>
      <p className="muted">{technique.purpose}</p>

      <div className="breath" aria-hidden="true">
        <div
          className="breath__circle"
          style={
            reduced
              ? undefined
              : {
                  transform: `scale(${running ? scale : 0.7})`,
                  transitionDuration: `${running ? secondsLeft : 0.3}s`,
                }
          }
        >
          {running ? secondsLeft : '🫧'}
        </div>
      </div>

      <p className="breath__label" role="status" aria-live="polite">
        {done
          ? 'Nicely done. Notice how your body feels now.'
          : running
            ? `${label} · ${secondsLeft}s · round ${Math.min(
                round + 1,
                totalRounds,
              )} of ${totalRounds}`
            : `Ready when you are — ${technique.name}, ${totalRounds} rounds (~${
                roundDuration(technique) * totalRounds
              }s).`}
      </p>

      <button
        type="button"
        className="btn btn--primary"
        onClick={running ? stop : start}
      >
        {running ? 'Pause' : done ? 'Go again' : 'Begin'}
      </button>
    </div>
  )
}

function Grounding({ technique }: { technique: Technique }) {
  const steps = technique.steps ?? []
  const [checked, setChecked] = useState<boolean[]>(() =>
    steps.map(() => false),
  )

  function toggle(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  const allDone = checked.every(Boolean)

  return (
    <div>
      <p className="muted">{technique.purpose}</p>
      <ul className="ground-list">
        {steps.map((step, i) => (
          <li key={i}>
            <label className="ground-step">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
              />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ul>
      {allDone && (
        <p className="breath__label" role="status" aria-live="polite">
          You’re here, in this moment. That’s enough for right now.
        </p>
      )}
    </div>
  )
}
