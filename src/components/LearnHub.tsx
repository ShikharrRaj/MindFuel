/**
 * LearnHub — short, static reading: today's lesson, the panic explainer, the
 * printable exam-hall card, and a shareable guide for parents.
 */

import { useState } from 'react'
import { PARENT_GUIDE_HASH } from '../lib/routes'
import DailyLesson from './DailyLesson'
import ExamHallCard from './ExamHallCard'
import PanicExplainer from './PanicExplainer'

export default function LearnHub() {
  const [shared, setShared] = useState<string | null>(null)

  async function shareParentGuide() {
    const url = `${window.location.origin}${window.location.pathname}${PARENT_GUIDE_HASH}`
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>
    }
    try {
      if (nav.share) {
        await nav.share({
          title: 'Supporting your child through exam season',
          url,
        })
        setShared('Shared.')
      } else {
        await navigator.clipboard.writeText(url)
        setShared('Link copied. Paste it into a message to your family.')
      }
    } catch {
      setShared(`Copy this link: ${url}`)
    }
  }

  return (
    <>
      <DailyLesson />
      <PanicExplainer />
      <ExamHallCard />
      <section className="card" aria-labelledby="parents-share-title">
        <p className="card__eyebrow">For your family</p>
        <h2 id="parents-share-title">A guide for parents</h2>
        <p className="muted">
          A short page on how families can support you without adding pressure.
          It contains none of your data, so it is safe to share.
        </p>
        <div className="tag-row">
          <a className="btn btn--ghost" href={PARENT_GUIDE_HASH}>
            Read it
          </a>
          <button
            type="button"
            className="btn btn--primary"
            onClick={shareParentGuide}
          >
            Share with my family
          </button>
        </div>
        <p className="field__hint" role="status">
          {shared ?? ''}
        </p>
      </section>
    </>
  )
}
