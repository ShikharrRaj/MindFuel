/**
 * Dock — the fixed bottom-right home of the floating timer.
 *
 * - It measures itself and reserves the same space at the end of the page
 *   (the --dock-space custom property, also used as scroll padding), so the
 *   footer and "Your data" can always be scrolled clear of it, and keyboard
 *   focus never lands behind it.
 * - On a short or zoomed screen it tucks itself away whenever it would cover
 *   the site header, so "Calm now" and the helplines are never hidden behind
 *   it (CLAUDE.md #3). It comes back once the header scrolls out of view.
 */

import { type ReactNode, useEffect, useRef, useState } from 'react'

/** Breathing room kept between the header and the dock, in px. */
const GAP = 8

interface Props {
  children: ReactNode
  inert?: boolean
}

export default function Dock({ children, inert }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tucked, setTucked] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const dock = el
    const root = document.documentElement
    const header = document.querySelector('.site-header')
    let frame = 0
    function measure() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--dock-space', `${dock.offsetHeight}px`)
        // visibility:hidden keeps the box in place, so this stays measurable.
        const headerBottom = header?.getBoundingClientRect().bottom ?? 0
        setTucked(
          dock.offsetHeight > 0 &&
            headerBottom > dock.getBoundingClientRect().top - GAP,
        )
      })
    }
    measure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(dock)
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      root.style.removeProperty('--dock-space')
    }
  }, [])

  return (
    <div
      ref={ref}
      className={tucked ? 'dock dock--tucked' : 'dock'}
      inert={inert || tucked}
    >
      {children}
    </div>
  )
}
