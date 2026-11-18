import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePipWindow } from './usePipWindow'

function fakeWindow() {
  return Object.assign(new EventTarget(), {
    document: document.implementation.createHTMLDocument(''),
    close: vi.fn(),
  }) as unknown as Window & { close: ReturnType<typeof vi.fn> }
}

function install(windows: Window[]) {
  const requestWindow = vi.fn(() => Promise.resolve(windows.shift()!))
  vi.stubGlobal('documentPictureInPicture', { requestWindow })
  return requestWindow
}

describe('usePipWindow', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is unsupported where the browser has no Document PiP', () => {
    const { result } = renderHook(() => usePipWindow('t'))
    expect(result.current.supported).toBe(false)
  })

  it('opens one window per tap, even on a double tap', async () => {
    const requestWindow = install([fakeWindow(), fakeWindow()])
    const { result } = renderHook(() => usePipWindow('Focus timer'))
    act(() => {
      result.current.open()
      result.current.open()
    })
    await waitFor(() => expect(result.current.win).not.toBeNull())
    expect(requestWindow).toHaveBeenCalledTimes(1)
    expect(result.current.win!.document.title).toBe('Focus timer')
  })

  it('a closed old window never clears its replacement', async () => {
    const first = fakeWindow()
    const second = fakeWindow()
    install([first, second])
    const { result } = renderHook(() => usePipWindow('t'))
    act(() => result.current.open())
    await waitFor(() => expect(result.current.win).toBe(first))
    act(() => result.current.open())
    await waitFor(() => expect(result.current.win).toBe(second))
    act(() => {
      first.dispatchEvent(new Event('pagehide'))
    })
    expect(result.current.win).toBe(second)

    // The student closes the current one: forgotten.
    act(() => {
      second.dispatchEvent(new Event('pagehide'))
    })
    expect(result.current.win).toBeNull()
  })

  it('closes the window on close() and when the app goes away', async () => {
    const one = fakeWindow()
    const two = fakeWindow()
    install([one, two])
    const { result, unmount } = renderHook(() => usePipWindow('t'))
    act(() => result.current.open())
    await waitFor(() => expect(result.current.win).toBe(one))
    act(() => result.current.close())
    expect(one.close).toHaveBeenCalled()
    expect(result.current.win).toBeNull()

    act(() => result.current.open())
    await waitFor(() => expect(result.current.win).toBe(two))
    unmount()
    expect(two.close).toHaveBeenCalled()
  })
})
