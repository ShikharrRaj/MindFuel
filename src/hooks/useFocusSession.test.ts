import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFocusSession } from './useFocusSession'

/** Let `minutes` of wall-clock time pass, then let the timer notice. */
function pass(minutes: number) {
  act(() => {
    vi.setSystemTime(Date.now() + minutes * 60_000)
    vi.advanceTimersByTime(300)
  })
}

describe('useFocusSession', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs focus → break → waits for the student to start the next block', () => {
    const { result } = renderHook(() => useFocusSession(false))
    expect(result.current.active).toBe(false)
    act(() => result.current.startOrPause())
    expect(result.current.active).toBe(true)

    pass(25)
    expect(result.current.phase).toBe('break')
    expect(result.current.running).toBe(true) // breaks start on their own
    expect(result.current.blocks).toBe(1)

    pass(5)
    expect(result.current.phase).toBe('focus')
    expect(result.current.running).toBe(false)
    expect(result.current.awaitingStart).toBe(true)
    expect(result.current.active).toBe(true) // still worth showing
    expect(result.current.startLabel).toBe('Start focus')
  })

  it('counts a pause in the very first second as paused', () => {
    const { result } = renderHook(() => useFocusSession(false))
    act(() => result.current.startOrPause())
    act(() => result.current.startOrPause())
    expect(result.current.paused).toBe(true)
    expect(result.current.active).toBe(true)
    expect(result.current.startLabel).toBe('Resume')
  })

  it('earns a long break after four blocks, which resets the burnout clock', () => {
    const { result } = renderHook(() => useFocusSession(false))
    for (let block = 1; block <= 4; block++) {
      act(() => result.current.startOrPause())
      pass(25)
      if (block < 4) pass(5)
    }
    expect(result.current.phase).toBe('long-break')
    expect(result.current.sinceLongBreak).toBe(100)
    pass(15)
    expect(result.current.sinceLongBreak).toBe(0)
    expect(result.current.awaitingStart).toBe(true)
  })

  it('sync() catches up a throttled clock straight away', () => {
    const { result } = renderHook(() => useFocusSession(false))
    act(() => result.current.startOrPause())
    act(() => {
      vi.setSystemTime(Date.now() + 25 * 60_000)
      result.current.sync() // no interval tick has run yet
    })
    expect(result.current.phase).toBe('break')
  })

  it('reset keeps the day’s blocks; clear forgets everything', () => {
    const { result } = renderHook(() => useFocusSession(false))
    act(() => result.current.changePreset('50-10'))
    act(() => result.current.startOrPause())
    pass(50)
    const epoch = result.current.epoch
    act(() => result.current.reset())
    expect(result.current.blocks).toBe(1)
    expect(result.current.epoch).toBeGreaterThan(epoch)

    act(() => result.current.clear())
    expect(result.current.blocks).toBe(0)
    expect(result.current.sinceLongBreak).toBe(0)
    expect(result.current.preset.id).toBe('25-5')
    expect(result.current.active).toBe(false)
  })
})
