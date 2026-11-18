/**
 * Tabs — an accessible ARIA tablist for switching between the app's surfaces.
 * Generic over the caller's tab id union so it stays type-safe.
 *
 * Keyboard (WAI-ARIA tabs pattern, automatic activation): only the active tab
 * is in the Tab order; Left/Right arrows move between tabs (wrapping), and
 * Home/End jump to the first/last.
 */

import { useRef } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = tabs.length - 1
    let next: number
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <nav className="tabs" aria-label="Sections">
      <div role="tablist" style={{ display: 'contents' }}>
        {tabs.map(({ id, label }, i) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el
            }}
            className="tab"
            id={`tab-${id}`}
            role="tab"
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
