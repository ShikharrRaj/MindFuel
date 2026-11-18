/**
 * ParentGuide — a short guide for parents and guardians on supporting a
 * student without adding pressure. It opens as its own page (#for-parents) so
 * a student can share the link; it needs no account and shows no student data.
 */

import { useEffect, useRef } from 'react'
import { PARENT_GUIDE, PARENT_GUIDE_HELP } from '../lib/guides'
import { APP_TITLE } from '../lib/routes'

interface Props {
  onBack?: () => void
}

const PAGE_TITLE = 'Supporting your child through exam season · MindFuel'

export default function ParentGuide({ onBack }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Its own page: its own document title, and focus starts at the heading.
  useEffect(() => {
    document.title = PAGE_TITLE
    titleRef.current?.focus()
    return () => {
      // Back to the app's own title (not whatever was showing when this
      // opened, which may have been a running timer's countdown).
      document.title = APP_TITLE
    }
  }, [])

  return (
    <article className="card" aria-labelledby="parents-title">
      <p className="card__eyebrow">For parents and guardians</p>
      <h1 id="parents-title" ref={titleRef} tabIndex={-1}>
        Supporting your child through exam season
      </h1>
      <p className="lead">
        Competitive exams are stressful for the whole family. The way you talk
        about them can make that pressure lighter or heavier. A few things that
        help:
      </p>
      {PARENT_GUIDE.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <ul className="steps">
            {section.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="caution">{PARENT_GUIDE_HELP}</p>
      {onBack && (
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to MindFuel
        </button>
      )}
    </article>
  )
}
