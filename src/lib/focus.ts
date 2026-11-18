/**
 * Focus coach — pure helpers for a Pomodoro-style study timer with built-in
 * breaks and a burnout nudge. The useFocusSession hook owns the ticking; the
 * rules live here so they are testable.
 */

export interface FocusPreset {
  id: string
  label: string
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
}

export const FOCUS_PRESETS: FocusPreset[] = [
  {
    id: '25-5',
    label: '25 / 5',
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
  },
  {
    id: '50-10',
    label: '50 / 10',
    focusMinutes: 50,
    breakMinutes: 10,
    longBreakMinutes: 20,
  },
]

/** Every Nth completed focus block earns a long break. */
export const BLOCKS_PER_LONG_BREAK = 4

/** Continuous focus (without a long break) that triggers the burnout nudge. */
export const BURNOUT_MINUTES = 180

export type FocusPhase = 'focus' | 'break' | 'long-break'

/** What comes after a phase finishes. */
export function nextPhase(
  finished: FocusPhase,
  completedBlocks: number,
): FocusPhase {
  if (finished !== 'focus') return 'focus'
  return completedBlocks > 0 && completedBlocks % BLOCKS_PER_LONG_BREAK === 0
    ? 'long-break'
    : 'break'
}

export function phaseSeconds(phase: FocusPhase, preset: FocusPreset): number {
  const minutes =
    phase === 'focus'
      ? preset.focusMinutes
      : phase === 'break'
        ? preset.breakMinutes
        : preset.longBreakMinutes
  return minutes * 60
}

export function shouldNudgeLongBreak(minutesSinceLongBreak: number): boolean {
  return minutesSinceLongBreak >= BURNOUT_MINUTES
}

/** "mm:ss" for the countdown display. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export const PHASE_LABEL: Record<FocusPhase, string> = {
  focus: 'Focus',
  break: 'Short break',
  'long-break': 'Long break',
}

/** Focus and breaks look different (terracotta vs. sage) everywhere. */
export function phaseTone(phase: FocusPhase): 'focus' | 'break' {
  return phase === 'focus' ? 'focus' : 'break'
}

export interface FocusTitleState {
  phase: FocusPhase
  left: number
  running: boolean
  paused: boolean
  /** A break ended (or was skipped); the next block waits for the student. */
  awaitingStart: boolean
  blocks: number
}

/**
 * The browser-tab title while a session is under way, so the countdown is
 * visible from any other tab, e.g. "18:42 · Focus · MindFuel".
 */
export function focusTitle(s: FocusTitleState): string {
  if (s.awaitingStart && !s.running) {
    return `Ready for block ${s.blocks + 1} · MindFuel`
  }
  const clock = `${formatClock(s.left)} · ${PHASE_LABEL[s.phase]} · MindFuel`
  return s.paused ? `Paused ${clock}` : clock
}

/** The floating timer's status line: "Focus", "Short break · paused", "Ready for block 3". */
export function timerStatus(s: FocusTitleState): string {
  if (s.awaitingStart && !s.running) return `Ready for block ${s.blocks + 1}`
  if (s.paused) return `${PHASE_LABEL[s.phase]} · paused`
  return PHASE_LABEL[s.phase]
}
