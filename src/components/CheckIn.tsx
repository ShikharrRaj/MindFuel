/**
 * CheckIn — the daily journal + mood form. Free-text journaling is the primary
 * input the brief asks us to analyse; quick tags add lightweight structured
 * context that powers the pattern dashboard.
 *
 * The first reflection asks for consent (AiConsent) before anything is sent;
 * the student can also save the check-in on the device without AI. The text
 * is crisis-checked locally first, so help appears even if they stop there.
 */

import { useRef, useState } from 'react'
import type { PrepPhase } from '../lib/exams'
import { MAX_TEXT_LENGTH } from '../lib/limits'
import { detectCrisis } from '../lib/safety'
import type { MoodLevel } from '../lib/types'
import AiConsent from './AiConsent'
import HelplineLine from './HelplineLine'
import JournalPrompts from './JournalPrompts'
import MoodPicker from './MoodPicker'

const MIN_TEXT = 3
const clampJournal = (text: string) => text.slice(0, MAX_TEXT_LENGTH)

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
  /** A short confirmation, e.g. after saving without AI. */
  notice?: string | null
  phase?: PrepPhase
  /** The student has agreed to send entries to the AI. Required, so no
   * caller can skip consent by leaving it out. */
  aiConsent: boolean
  onConsent: () => void
  /** Crisis language was found in the entry (checked before any consent). */
  onCrisis?: () => void
  onSubmit: (
    mood: MoodLevel,
    text: string,
    tags: string[],
    useAi: boolean,
  ) => void
}

export default function CheckIn({
  pending,
  error,
  notice,
  phase,
  aiConsent,
  onConsent,
  onCrisis,
  onSubmit,
}: Props) {
  const [mood, setMood] = useState<MoodLevel | null>(null)
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [touched, setTouched] = useState(false)
  const [askConsent, setAskConsent] = useState(false)
  const journalRef = useRef<HTMLTextAreaElement>(null)
  // After submitting, the button (or consent panel) goes away; focus moves to
  // the status line, which then reads out what happened.
  const statusRef = useRef<HTMLParagraphElement>(null)

  function insertPrompt(prompt: string) {
    setText((prev) =>
      clampJournal(
        prev.trim() ? `${prev.trimEnd()}\n\n${prompt}\n` : `${prompt}\n`,
      ),
    )
    journalRef.current?.focus()
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function submit(useAi: boolean) {
    // Re-checked here: the text stays editable while consent is asked.
    if (mood === null || text.trim().length < MIN_TEXT) {
      setTouched(true)
      setAskConsent(false)
      return
    }
    onSubmit(mood, text.trim(), tags, useAi)
    setText('')
    setTags([])
    setMood(null)
    setTouched(false)
    setAskConsent(false)
    statusRef.current?.focus()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (mood === null || text.trim().length < MIN_TEXT) return
    if (!aiConsent) {
      if (detectCrisis(text).isCrisis) onCrisis?.()
      setAskConsent(true)
      return
    }
    submit(true)
  }

  const showMoodError = touched && mood === null
  const showTextError = touched && text.trim().length < MIN_TEXT

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
            <p
              role="alert"
              className="field__hint"
              style={{ color: 'var(--alert-ink)' }}
            >
              Please pick a mood first.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="journal">What's on your mind?</label>
          <textarea
            id="journal"
            ref={journalRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write as much or as little as you like — what happened, how you're feeling, what's worrying you…"
            maxLength={MAX_TEXT_LENGTH}
            aria-describedby="journal-hint"
          />
          <JournalPrompts phase={phase} tags={tags} onPick={insertPrompt} />
          <p id="journal-hint" className="field__hint">
            Honest, open words help the most. Saved only on this device; the AI
            sees an entry only when you ask for a reflection.
          </p>
          {showTextError && (
            <p
              role="alert"
              className="field__hint"
              style={{ color: 'var(--alert-ink)' }}
            >
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
          <>
            <p role="alert" style={{ color: 'var(--alert-ink)' }}>
              {error}
            </p>
            <HelplineLine lead="Your entry is saved. If today feels like too much, talk to someone:" />
          </>
        )}
        <p
          ref={statusRef}
          tabIndex={-1}
          role="status"
          className="field__hint checkin__status"
        >
          {pending ? 'Reflecting on your entry…' : (notice ?? '')}
        </p>

        {askConsent ? (
          <AiConsent
            purpose="reflect"
            autoFocus
            onAgree={() => {
              onConsent()
              submit(true)
            }}
            onDecline={() => submit(false)}
            declineLabel="Save without AI"
          />
        ) : (
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? (
              <>
                <span className="spinner" aria-hidden="true" /> Reflecting…
              </>
            ) : (
              'Reflect with MindFuel'
            )}
          </button>
        )}
      </form>
    </section>
  )
}
