/**
 * Onboarding — captures the persona context (exam + date) that drives every
 * downstream decision. We ask for the minimum needed and nothing identifying.
 */

import { useState } from 'react'
import { EXAM_LABELS } from '../lib/exams'
import type { ExamType, UserProfile } from '../lib/types'

const EXAM_OPTIONS = Object.keys(EXAM_LABELS) as ExamType[]

interface Props {
  onComplete: (profile: UserProfile) => void
}

export default function Onboarding({ onComplete }: Props) {
  const [name, setName] = useState('')
  const [exam, setExam] = useState<ExamType>('JEE')
  const [examDateISO, setExamDateISO] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!examDateISO) {
      setError('Please add your exam date so support can match where you are.')
      return
    }
    onComplete({ name: name.trim() || undefined, exam, examDateISO })
  }

  return (
    <section className="card" aria-labelledby="onboarding-title">
      <p className="card__eyebrow">Welcome</p>
      <h1 id="onboarding-title">Your private exam-wellness companion</h1>
      <p className="lead">
        A calm space to check in, understand your stress, and get support that
        actually fits your exam journey. Everything you write stays on your
        device.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">First name (optional)</label>
          <input
            id="name"
            type="text"
            value={name}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="What should I call you?"
          />
        </div>

        <div className="field">
          <label htmlFor="exam">Which exam are you preparing for?</label>
          <select
            id="exam"
            value={exam}
            onChange={(e) => setExam(e.target.value as ExamType)}
          >
            {EXAM_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {EXAM_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="exam-date">When is your exam?</label>
          <input
            id="exam-date"
            type="date"
            value={examDateISO}
            onChange={(e) => setExamDateISO(e.target.value)}
            aria-describedby={error ? 'date-error' : undefined}
          />
          <p className="field__hint">
            Used to tailor support to your prep phase — months out vs. days away
            need very different things.
          </p>
          {error && (
            <p
              id="date-error"
              role="alert"
              style={{ color: 'var(--alert-ink)' }}
            >
              {error}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn--primary">
          Start checking in
        </button>
      </form>
    </section>
  )
}
