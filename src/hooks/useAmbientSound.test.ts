import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAll, loadAmbient } from '../lib/storage'
import { FakeAudioContext } from '../test/fakeAudio'
import { useAmbientSound } from './useAmbientSound'

const KEY = 'mindfuel.ambient.v1'

describe('useAmbientSound', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('plays one sound at a time and remembers the choice', () => {
    const { result } = renderHook(() => useAmbientSound())
    expect(result.current.supported).toBe(true)
    expect(result.current.played).toBe(false)

    act(() => result.current.play('rain'))
    expect(result.current.playing).toBe('rain')
    expect(result.current.played).toBe(true)
    act(() => result.current.toggle('waves'))
    expect(result.current.playing).toBe('waves')
    act(() => result.current.toggle('waves'))
    expect(result.current.playing).toBeNull()
    expect(result.current.played).toBe(true) // still answered this visit
    expect(loadAmbient().last).toBe('waves')
  })

  it('never writes the key back after "Delete my data"', () => {
    const { result } = renderHook(() => useAmbientSound())
    act(() => result.current.play('keys'))
    act(() => result.current.setVolume(0.7))
    expect(localStorage.getItem(KEY)).not.toBeNull()

    clearAll()
    act(() => result.current.reset())
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(result.current.prefs.volume).toBe(0.4)
  })

  it('follows another tab, including the volume', () => {
    const { result } = renderHook(() => useAmbientSound())
    localStorage.setItem(
      KEY,
      JSON.stringify({
        last: 'rain',
        volume: 0.9,
        ask: false,
        motion: false,
        scenery: false,
        autoplay: false,
      }),
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    })
    expect(result.current.prefs).toEqual({
      last: 'rain',
      volume: 0.9,
      ask: false,
      motion: false,
      scenery: false,
      autoplay: false,
    })
  })
})
