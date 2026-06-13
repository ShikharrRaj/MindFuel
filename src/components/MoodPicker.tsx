/**
 * MoodPicker — an accessible 1–5 mood selector implemented as an ARIA
 * radiogroup with full keyboard support (arrow keys + Home/End), so it works
 * for mouse, touch, and keyboard/screen-reader users alike.
 */

import type { MoodLevel } from '../lib/types'

const MOODS: { level: MoodLevel; face: string; label: string }[] = [
  { level: 1, face: '😣', label: 'Very low' },
  { level: 2, face: '😟', label: 'Low' },
  { level: 3, face: '😐', label: 'Okay' },
  { level: 4, face: '🙂', label: 'Good' },
  { level: 5, face: '😄', label: 'Great' },
]

interface Props {
  value: MoodLevel | null
  onChange: (mood: MoodLevel) => void
}

export default function MoodPicker({ value, onChange }: Props) {
  function handleKey(e: React.KeyboardEvent, level: MoodLevel) {
    let next: MoodLevel | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (Math.min(5, level + 1) as MoodLevel)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (Math.max(1, level - 1) as MoodLevel)
    } else if (e.key === 'Home') {
      next = 1
    } else if (e.key === 'End') {
      next = 5
    }
    if (next !== null) {
      e.preventDefault()
      onChange(next)
    }
  }

  return (
    <div
      className="mood-row"
      role="radiogroup"
      aria-label="How are you feeling today?"
    >
      {MOODS.map(({ level, face, label }) => {
        const checked = value === level
        return (
          <div
            key={level}
            className="mood-option"
            role="radio"
            aria-checked={checked}
            aria-label={`${label} (${level} of 5)`}
            tabIndex={checked || (value === null && level === 3) ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                onChange(level)
              } else {
                handleKey(e, level)
              }
            }}
          >
            <span className="mood-option__face" aria-hidden="true">
              {face}
            </span>
            <span className="mood-option__label">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
