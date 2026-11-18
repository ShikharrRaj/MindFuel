/**
 * Haptic breathing cues — vibration patterns so a student can follow the pacer
 * with eyes closed, or discreetly. Uses the Vibration API where it exists
 * (most Android browsers); a silent no-op elsewhere (e.g. iOS Safari).
 */

import type { BreathPhase } from '../lib/activities'

const PATTERNS: Record<BreathPhase['motion'], number[]> = {
  in: [70],
  hold: [20],
  out: [30, 80, 30],
}

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

/**
 * Browsers refuse vibration until the page has had a tap (and log an error
 * when asked earlier), e.g. when `#sos` starts the pacer on load. Skip those
 * cues; they start with the first tap.
 */
function hasUserActivation(): boolean {
  const activation = (
    navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }
  ).userActivation
  return activation ? activation.hasBeenActive : true
}

export function vibrateFor(motion: BreathPhase['motion']): void {
  if (!hapticsSupported() || !hasUserActivation()) return
  try {
    navigator.vibrate(PATTERNS[motion])
  } catch {
    /* some browsers throw when not triggered by a user gesture — ignore */
  }
}
