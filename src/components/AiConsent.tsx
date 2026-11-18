/**
 * AiConsent — asked once, just before the first AI use. It says plainly what
 * is sent, to whom, and that it is not stored, and asks under-18s to have a
 * parent or guardian's permission. Declining never blocks the student: a
 * check-in can be saved on the device without AI, and every on-device tool
 * keeps working.
 *
 * The policy link opens in a new tab so a half-written entry is not lost.
 */

import { useEffect, useId, useRef, useState } from 'react'
import HelplineLine from './HelplineLine'

interface Props {
  purpose: 'reflect' | 'chat'
  onAgree: () => void
  /** Offer a way forward without AI (e.g. "Save without AI"). */
  onDecline?: () => void
  declineLabel?: string
  /** Move focus here when it appears in response to an action. */
  autoFocus?: boolean
}

const WHAT_IS_SENT: Record<Props['purpose'], string> = {
  reflect:
    'To write your reflection, MindFuel sends this entry, its mood and tags, your exam and a one-line mood summary to Google’s Gemini AI, through our server.',
  chat: 'To reply, MindFuel sends the messages in this conversation (the last 20), your exam and a one-line mood summary to Google’s Gemini AI, through our server.',
}

export default function AiConsent({
  purpose,
  onAgree,
  onDecline,
  declineLabel = 'Not now',
  autoFocus = false,
}: Props) {
  const uid = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const [ageOk, setAgeOk] = useState(false)
  const [showAgeHint, setShowAgeHint] = useState(false)

  useEffect(() => {
    if (autoFocus) headingRef.current?.focus()
  }, [autoFocus])

  function agree() {
    if (!ageOk) {
      // Focus the checkbox: it is described by the hint, so both are read.
      setShowAgeHint(true)
      checkboxRef.current?.focus()
      return
    }
    onAgree()
  }

  return (
    <div className="consent" role="group" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`} ref={headingRef} tabIndex={-1}>
        Before MindFuel’s AI reads this
      </h3>
      <p>
        {WHAT_IS_SENT[purpose]} We don’t store it, and it isn’t used to train
        Google’s models. Everything else stays on this device.{' '}
        <a href="#privacy" target="_blank" rel="noopener">
          Read the privacy policy
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
      <label className="toggle">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={ageOk}
          aria-invalid={showAgeHint || undefined}
          onChange={(e) => {
            setAgeOk(e.target.checked)
            if (e.target.checked) setShowAgeHint(false)
          }}
          aria-describedby={showAgeHint ? `${uid}-age-hint` : undefined}
        />
        <span>
          I’m 18 or older, or my parent or guardian is OK with me using
          MindFuel’s AI features.
        </span>
      </label>
      {showAgeHint && (
        <p id={`${uid}-age-hint`} className="field__hint consent__hint">
          Please tick this box first, or choose an option without AI.
        </p>
      )}
      <div className="tag-row">
        <button type="button" className="btn btn--primary" onClick={agree}>
          Agree and continue
        </button>
        {onDecline && (
          <button type="button" className="btn btn--ghost" onClick={onDecline}>
            {declineLabel}
          </button>
        )}
      </div>
      <HelplineLine />
    </div>
  )
}
