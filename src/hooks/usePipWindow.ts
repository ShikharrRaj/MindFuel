/**
 * usePipWindow — owns the pop-out timer window (see device/pip): opens it from
 * a tap, notices when the student closes it, and closes it with the app.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { openPipWindow, pipSupported } from '../device/pip'

export interface PipControl {
  supported: boolean
  /** The open pop-out window, if any. */
  win: Window | null
  open: () => void
  close: () => void
}

const SIZE = { width: 320, height: 220 }

export function usePipWindow(title: string): PipControl {
  const [supported] = useState(pipSupported)
  const [win, setWin] = useState<Window | null>(null)
  const opening = useRef(false)

  const open = useCallback(() => {
    if (opening.current) return // a double tap opens one window, not two
    opening.current = true
    void openPipWindow(title, SIZE).then((next) => {
      opening.current = false
      if (!next) return
      // Only forget the window that closed, never a newer one.
      next.addEventListener(
        'pagehide',
        () => setWin((current) => (current === next ? null : current)),
        { once: true },
      )
      setWin(next)
    })
  }, [title])

  // Clearing the window runs the effect cleanup below, which closes it.
  const close = useCallback(() => setWin(null), [])

  // Close the pop-out with the app, on close(), or when a new one replaces it.
  useEffect(() => {
    if (!win) return
    return () => win.close()
  }, [win])

  return { supported, win, open, close }
}
