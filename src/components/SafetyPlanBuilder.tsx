/**
 * SafetyPlanBuilder — fill in a personal safety plan (Stanley-Brown model)
 * while calm, so it is ready in a crisis. Each step is a short list. The
 * national helplines are always included in step 5. Saved on-device only.
 */

import { useState } from 'react'
import { HELPLINES } from '../lib/safety'
import {
  MAX_PLAN_ITEM_LENGTH,
  MAX_PLAN_ITEMS,
  SAFETY_PLAN_SECTIONS,
  type SafetyPlan,
  type SafetyPlanKey,
} from '../lib/safetyPlan'

interface Props {
  plan: SafetyPlan
  onSave: (plan: SafetyPlan) => void
}

export default function SafetyPlanBuilder({ plan, onSave }: Props) {
  const [drafts, setDrafts] = useState<Partial<Record<SafetyPlanKey, string>>>(
    {},
  )
  const [status, setStatus] = useState('')

  function add(key: SafetyPlanKey) {
    const value = (drafts[key] ?? '').trim().slice(0, MAX_PLAN_ITEM_LENGTH)
    if (!value || plan[key].length >= MAX_PLAN_ITEMS) return
    onSave({ ...plan, [key]: [...plan[key], value] })
    setDrafts((d) => ({ ...d, [key]: '' }))
    setStatus(`Added “${value}”. Saved on this device.`)
  }

  function remove(key: SafetyPlanKey, index: number) {
    const removed = plan[key][index]
    onSave({ ...plan, [key]: plan[key].filter((_, i) => i !== index) })
    setStatus(`Removed “${removed}”.`)
    // The Remove button is gone; keep focus in the same step.
    document.getElementById(`plan-${key}`)?.focus()
  }

  return (
    <section className="card print-area" aria-labelledby="plan-title">
      <p className="card__eyebrow">Safety plan</p>
      <h2 id="plan-title">My plan for hard moments</h2>
      <p className="muted">
        Fill this in on a calm day. In a crisis, it tells you exactly what to do
        next, one step at a time. It is saved only on this device.
      </p>

      {SAFETY_PLAN_SECTIONS.map((section) => {
        const inputId = `plan-${section.key}`
        return (
          <fieldset key={section.key} className="plan-section">
            <legend>{section.title}</legend>
            <p className="field__hint" id={`${inputId}-hint`}>
              {section.prompt}
            </p>
            {plan[section.key].length > 0 && (
              <ul className="plan-items">
                {plan[section.key].map((item, i) => (
                  <li key={`${item}-${i}`}>
                    <span>{item}</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => remove(section.key, i)}
                      aria-label={`Remove “${item}”`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {section.key === 'professionals' && (
              <ul className="plan-items plan-items--fixed">
                {HELPLINES.map((h) => (
                  <li key={h.name}>
                    <span>
                      {h.name}: <a href={h.href}>{h.contact}</a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="plan-add">
              <label htmlFor={inputId} className="sr-only">
                Add to {section.title}
              </label>
              <input
                id={inputId}
                type="text"
                value={drafts[section.key] ?? ''}
                placeholder={section.example}
                maxLength={MAX_PLAN_ITEM_LENGTH}
                aria-describedby={`${inputId}-hint`}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [section.key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    add(section.key)
                  }
                }}
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => add(section.key)}
              >
                Add
              </button>
            </div>
          </fieldset>
        )
      })}

      <div className="plan-footer">
        <button
          type="button"
          className="btn btn--ghost no-print"
          onClick={() => window.print()}
        >
          Print or save as PDF
        </button>
        <span role="status" className="field__hint">
          {status}
        </span>
      </div>
    </section>
  )
}
