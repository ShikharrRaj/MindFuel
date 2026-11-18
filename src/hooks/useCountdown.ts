/**
 * useCountdown — a wall-clock countdown. It tracks a deadline rather than
 * counting interval ticks, so it stays correct when the browser throttles or
 * pauses timers (a locked phone, a hidden tab, a walk with the phone in a
 * pocket). Shared by the breathing pacer, activity timers and the focus coach.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface Countdown {
  /** Whole seconds remaining. */
  left: number
  running: boolean
  start: () => void
  pause: () => void
  /** Stop and set a new duration. */
  reset: (seconds: number) => void
  /**
   * Re-check the clock now. A hidden tab's timers can be throttled to once a
   * minute; a visible pop-out window calls this so its display stays live.
   */
  sync: () => void
}

const TICK_MS = 250

export function useCountdown(
  initialSeconds: number,
  onDone: () => void,
  autoStart = false,
): Countdown {
  const [left, setLeft] = useState(initialSeconds)
  const [running, setRunning] = useState(autoStart)
  const leftRef = useRef(initialSeconds)
  const endsAt = useRef<number | null>(null)
  const doneRef = useRef(onDone)
  const tickRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    doneRef.current = onDone
  })

  const start = useCallback(() => {
    if (leftRef.current <= 0) return
    endsAt.current = Date.now() + leftRef.current * 1000
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    if (endsAt.current !== null) {
      leftRef.current = Math.max(
        0,
        Math.ceil((endsAt.current - Date.now()) / 1000),
      )
      setLeft(leftRef.current)
    }
    endsAt.current = null
    setRunning(false)
  }, [])

  const reset = useCallback((seconds: number) => {
    endsAt.current = null
    leftRef.current = seconds
    setLeft(seconds)
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!running) return
    // Auto-started timers get their deadline on the first effect run.
    if (endsAt.current === null) {
      endsAt.current = Date.now() + leftRef.current * 1000
    }
    function tick() {
      if (endsAt.current === null) return
      const remaining = Math.max(
        0,
        Math.ceil((endsAt.current - Date.now()) / 1000),
      )
      if (remaining !== leftRef.current) {
        leftRef.current = remaining
        setLeft(remaining)
      }
      if (remaining === 0) {
        endsAt.current = null
        setRunning(false)
        // May call reset() + start() to chain the next phase.
        doneRef.current()
      }
    }
    tickRef.current = tick
    const id = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      tickRef.current = null
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  const sync = useCallback(() => tickRef.current?.(), [])

  return { left, running, start, pause, reset, sync }
}
