/**
 * DailyLesson — today's 60-second lesson on how stress works. Static content,
 * one per day, with the option to read another.
 */

import { useRef, useState } from 'react'
import { lessonForDate } from '../lib/lessons'

export default function DailyLesson() {
  const [offset, setOffset] = useState(0)
  const lesson = lessonForDate(new Date(), offset)
  const titleRef = useRef<HTMLHeadingElement>(null)

  function next() {
    setOffset((o) => o + 1)
    titleRef.current?.focus()
  }
  return (
    <section className="card" aria-labelledby="lesson-title">
      <p className="card__eyebrow">
        {offset === 0 ? 'Today’s 60-second lesson' : '60-second lesson'}
      </p>
      <h2 id="lesson-title" ref={titleRef} tabIndex={-1}>
        {lesson.title}
      </h2>
      <p>{lesson.body}</p>
      <p className="reasoning">
        <strong>Take this with you: </strong>
        {lesson.takeaway}
      </p>
      <button type="button" className="btn btn--ghost" onClick={next}>
        Another lesson <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}
