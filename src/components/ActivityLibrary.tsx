/**
 * ActivityLibrary — every Calm Toolkit activity, grouped, so a student can
 * pick one directly. Activities marked "not for me" stay visible here (just
 * not suggested), and can be brought back. When an activity closes, focus
 * returns to the button that started it and the groups stay as they were.
 */

import { useEffect, useRef, useState } from 'react'
import {
  ACTIVITIES,
  type Activity,
  type ActivityGroup,
  GROUP_LABELS,
} from '../lib/activities'
import type { CalmPrefs } from '../lib/calm'
import type { SessionInput } from '../hooks/useCalmStore'
import ActivityPlayer from './ActivityPlayer'

interface Props {
  prefs: CalmPrefs
  onLog: (input: SessionInput) => void
  onRestore: (activityId: string) => void
  onCrisisText?: () => void
}

const GROUPS = Object.keys(GROUP_LABELS) as ActivityGroup[]
const startId = (id: string) => `library-start-${id}`

export default function ActivityLibrary({
  prefs,
  onLog,
  onRestore,
  onCrisisText,
}: Props) {
  const [active, setActive] = useState<Activity | null>(null)
  const [open, setOpen] = useState<Set<ActivityGroup>>(
    () => new Set(['breathing']),
  )
  const returnTo = useRef<string | null>(null)

  useEffect(() => {
    if (active || !returnTo.current) return
    document.getElementById(returnTo.current)?.focus()
    returnTo.current = null
  }, [active])

  function launch(a: Activity) {
    returnTo.current = startId(a.id)
    setActive(a)
  }

  function toggleGroup(group: ActivityGroup, isOpen: boolean) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (isOpen) next.add(group)
      else next.delete(group)
      return next
    })
  }

  if (active) {
    return (
      <div className="card">
        <ActivityPlayer
          key={active.id}
          activity={active}
          askBefore
          headingLevel={2}
          states={active.states.slice(0, 1)}
          source="library"
          haptics={prefs.haptics}
          onLog={onLog}
          onClose={() => setActive(null)}
          onCrisisText={onCrisisText}
        />
      </div>
    )
  }

  return (
    <section className="card" aria-labelledby="library-title">
      <p className="card__eyebrow">All activities</p>
      <h2 id="library-title">Pick anything that feels right</h2>
      {GROUPS.map((group) => {
        const items = ACTIVITIES.filter((a) => a.group === group)
        return (
          <details
            key={group}
            className="library-group"
            open={open.has(group)}
            onToggle={(e) => toggleGroup(group, e.currentTarget.open)}
          >
            <summary>
              {GROUP_LABELS[group]}{' '}
              <span className="muted">({items.length})</span>
            </summary>
            <ul className="library-list">
              {items.map((a) => {
                const hidden = prefs.notForMe.includes(a.id)
                return (
                  <li key={a.id} className="library-item">
                    <div>
                      <h3 className="library-item__name">{a.name}</h3>{' '}
                      <span className="muted">
                        {a.minutes} min{a.discreet ? ' · silent' : ''}
                      </span>
                      <p className="library-item__purpose">{a.purpose}</p>
                    </div>
                    <div className="library-item__actions">
                      <button
                        id={startId(a.id)}
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => launch(a)}
                        aria-label={`Start ${a.name}`}
                      >
                        Start
                      </button>
                      {hidden && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => onRestore(a.id)}
                          aria-label={`Suggest again: ${a.name}`}
                        >
                          Suggest again
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </section>
  )
}
