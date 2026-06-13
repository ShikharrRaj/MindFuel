/**
 * CheckIn — the daily journal + mood form. Free-text journaling is the primary
 * input the brief asks us to analyse; quick tags add lightweight structured
 * context that powers the pattern dashboard.
 */

import { useState } from 'react'
import MoodPicker from './MoodPicker'
import type { MoodLevel } from '../lib/types'

/** Quick-pick context tags common to exam prep. */
const TAGS = [
  'mock test',
  'low sleep',
  'long study day',
  'peer comparison',
  'family pressure',
  'revision',
  'distracted',
  'took a break',
]

interface Props {
  pending: boolean
  error: string | null
  onSubmit: (mood: MoodLevel, text: string, tags: string[]) => void
}

export default function CheckIn({ pending, error, onSubmit }: Props) {
  const [mood, setMood] = useState<MoodLevel | null>(null)
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [touched, setTouched] = useState(false)

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (mood === null || text.trim().length < 3) return
    onSubmit(mood, text.trim(), tags)
    setText('')
    setTags([])
    setMood(null)
    setTouched(false)
  }

  const showMoodError = touched && mood === null
  const showTextError = touched && text.trim().length < 3

  return (
    <section className="card" aria-labelledby="checkin-title">
      <p className="card__eyebrow">Daily check-in</p>
      <h2 id="checkin-title">How has today felt?</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <span id="mood-label" className="sr-only">
            Select your mood
          </span>
          <MoodPicker value={mood} onChange={setMood} />
          {showMoodError && (
            <p role="alert" className="field__hint" style={{ color: 'var(--alert-ink)' }}>
              Please pick a mood first.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="journal">What's on your mind?</label>
          <textarea
            id="journal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write as much or as little as you like — what happened, how you're feeling, what's worrying you…"
            maxLength={4000}
            aria-describedby="journal-hint"
          />
          <p id="journal-hint" className="field__hint">
            Honest, open words help the most. This never leaves your device,
            except for one private analysis.
          </p>
          {showTextError && (
            <p role="alert" className="field__hint" style={{ color: 'var(--alert-ink)' }}>
              Add a few words so there's something to reflect on.
            </p>
          )}
        </div>

        <div className="field">
          <span id="tags-label">Anything happen today? (optional)</span>
          <div
            className="tag-row"
            role="group"
            aria-labelledby="tags-label"
            style={{ marginTop: '0.5rem' }}
          >
            {TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                className="tag-chip"
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--alert-ink)' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Reflecting…
            </>
          ) : (
            'Reflect with MindFuel'
          )}
        </button>
      </form>
    </section>
  )
}
