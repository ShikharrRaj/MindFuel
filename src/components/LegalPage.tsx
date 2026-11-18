/**
 * LegalPage — the privacy policy (#privacy) or terms of use (#terms), each as
 * its own page with its own document title. The operator's name and contact
 * come from build-time env (VITE_OPERATOR_NAME, VITE_CONTACT_EMAIL).
 */

import { useEffect, useRef } from 'react'
import { LEGAL, LEGAL_UPDATED, type LegalDoc } from '../lib/legal'
import { APP_TITLE } from '../lib/routes'

interface Props {
  doc: LegalDoc
  onBack?: () => void
}

const OPERATOR = import.meta.env.VITE_OPERATOR_NAME?.trim()
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL?.trim()

export default function LegalPage({ doc, onBack }: Props) {
  const text = LEGAL[doc]
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${text.title} · MindFuel`
    titleRef.current?.focus()
    return () => {
      // Back to the app's own title (not whatever was showing when this
      // opened, which may have been a running timer's countdown).
      document.title = APP_TITLE
    }
  }, [text.title])

  return (
    <article className="card legal" aria-labelledby="legal-title">
      <p className="card__eyebrow">MindFuel</p>
      <h1 id="legal-title" ref={titleRef} tabIndex={-1}>
        {text.title}
      </h1>
      <p className="muted">Last updated {LEGAL_UPDATED}</p>
      <p className="lead">{text.intro}</p>

      {text.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.points && (
            <ul className="steps">
              {section.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section>
        <h2>Who runs MindFuel, and how to reach us</h2>
        <p>
          {OPERATOR ? `MindFuel is run by ${OPERATOR}.` : null}{' '}
          {CONTACT ? (
            <>
              For questions, requests or complaints about your data, email{' '}
              <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </>
          ) : (
            'For questions, requests or complaints about your data, contact the team that runs this site.'
          )}
        </p>
      </section>

      {onBack && (
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to MindFuel
        </button>
      )}
    </article>
  )
}
