/**
 * useFocusSession — the focus coach's study-block timer, held at app level so
 * it keeps running, and stays visible in the floating timer, the pop-out
 * window and the tab title, while the student uses other tabs or windows.
 * The rules live in lib/focus; this hook sequences them.
 */

import { useCallback, useState } from 'react'
import { vibrateFor } from '../device/haptics'
import { playChime, primeAudio } from '../device/soundscape'
import {
  FOCUS_PRESETS,
  type FocusPhase,
  type FocusPreset,
  nextPhase,
  PHASE_LABEL,
  phaseSeconds,
} from '../lib/focus'
import { useCountdown } from './useCountdown'

export interface FocusSession {
  preset: FocusPreset
  phase: FocusPhase
  blocks: number
  /** Minutes of focus since the last long break (for the burnout nudge). */
  sinceLongBreak: number
  /** Latest phase change, for a polite live region. */
  announcement: string
  left: number
  /** Length of the current phase, in seconds. */
  total: number
  running: boolean
  /** Paused part-way through a phase (even in its first second). */
  paused: boolean
  /** A break ended (or was skipped); the next block waits for the student. */
  awaitingStart: boolean
  /** Running, paused part-way, or waiting: worth showing outside Focus. */
  active: boolean
  /**
   * Bumped whenever the session is reset, ended, re-timed or a break is
   * skipped, so UI tied to the old session (a break activity) can let go.
   */
  epoch: number
  /** "Start focus", "Pause" or "Resume". */
  startLabel: string
  startOrPause: () => void
  skipBreak: () => void
  takeLongBreakNow: () => void
  reset: () => void
  changePreset: (id: string) => void
  /** Forget the whole session, block counts too ("Delete my data"). */
  clear: () => void
  /** Re-check the clock now (see useCountdown). */
  sync: () => void
}

export function useFocusSession(haptics: boolean): FocusSession {
  const [presetId, setPresetId] = useState(FOCUS_PRESETS[0].id)
  const preset =
    FOCUS_PRESETS.find((p) => p.id === presetId) ?? FOCUS_PRESETS[0]
  const [phase, setPhase] = useState<FocusPhase>('focus')
  const [blocks, setBlocks] = useState(0)
  const [sinceLongBreak, setSinceLongBreak] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [awaitingStart, setAwaitingStart] = useState(false)
  const [paused, setPaused] = useState(false)
  const [epoch, setEpoch] = useState(0)

  const timer = useCountdown(phaseSeconds('focus', preset), finishPhase)
  const resetTimer = timer.reset

  /** Move to `next`; breaks start on their own, focus waits for the student. */
  function goTo(next: FocusPhase, message: string) {
    setPhase(next)
    timer.reset(phaseSeconds(next, preset))
    if (next !== 'focus') timer.start()
    setPaused(false)
    setAwaitingStart(next === 'focus')
    setAnnouncement(message)
  }

  function finishPhase() {
    playChime()
    if (haptics) vibrateFor('in')
    if (phase === 'focus') {
      const done = blocks + 1
      setBlocks(done)
      setSinceLongBreak((m) => m + preset.focusMinutes)
      const next = nextPhase('focus', done)
      goTo(
        next,
        `Focus block ${done} done. Time for a ${phaseSeconds(next, preset) / 60}-minute ${PHASE_LABEL[next].toLowerCase()}.`,
      )
    } else {
      if (phase === 'long-break') setSinceLongBreak(0)
      goTo(
        'focus',
        `${PHASE_LABEL[phase]} over. Start focus block ${blocks + 1} when you are ready.`,
      )
    }
  }

  function startOrPause() {
    if (timer.running) {
      timer.pause()
      setPaused(true)
      return
    }
    primeAudio() // iOS: audio must be unlocked inside a tap
    setAwaitingStart(false)
    setPaused(false)
    timer.start()
  }

  function skipBreak() {
    // Skipping a long break does NOT reset the burnout counter.
    setEpoch((n) => n + 1)
    goTo(
      'focus',
      `Break skipped. Start focus block ${blocks + 1} when you are ready.`,
    )
  }

  function takeLongBreakNow() {
    primeAudio()
    goTo('long-break', 'Long break started. Step away from your desk.')
  }

  function reset() {
    setPhase('focus')
    setAwaitingStart(false)
    setPaused(false)
    setEpoch((n) => n + 1)
    timer.reset(phaseSeconds('focus', preset))
    setAnnouncement('Timer reset.')
  }

  // Stable, so the app can call it from storage listeners.
  const clear = useCallback(() => {
    const first = FOCUS_PRESETS[0]
    setPresetId(first.id)
    setPhase('focus')
    setBlocks(0)
    setSinceLongBreak(0)
    setAnnouncement('')
    setAwaitingStart(false)
    setPaused(false)
    setEpoch((n) => n + 1)
    resetTimer(phaseSeconds('focus', first))
  }, [resetTimer])

  function changePreset(id: string) {
    const next = FOCUS_PRESETS.find((p) => p.id === id) ?? FOCUS_PRESETS[0]
    setPresetId(next.id)
    setPhase('focus')
    setAwaitingStart(false)
    setPaused(false)
    setEpoch((n) => n + 1)
    timer.reset(phaseSeconds('focus', next))
  }

  const total = phaseSeconds(phase, preset)
  // Breaks start on their own, so the only idle state is before a focus block.
  const startLabel = timer.running ? 'Pause' : paused ? 'Resume' : 'Start focus'

  return {
    preset,
    phase,
    blocks,
    sinceLongBreak,
    announcement,
    left: timer.left,
    total,
    running: timer.running,
    paused,
    awaitingStart,
    active: timer.running || paused || awaitingStart,
    epoch,
    startLabel,
    startOrPause,
    skipBreak,
    takeLongBreakNow,
    reset,
    changePreset,
    clear,
    sync: timer.sync,
  }
}
