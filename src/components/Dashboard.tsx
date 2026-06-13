/**
 * Dashboard — surfaces longitudinal patterns the brief says "standard trackers
 * miss": mood trend over time, most frequent AI-detected triggers, and a
 * highlighted correlation (e.g. how mock-test days affect mood). All derived by
 * the pure functions in lib/insights, so the numbers are testable and honest.
 */

import {
  averageMood,
  currentStreak,
  moodTrend,
  tagMoodImpact,
  topTriggers,
} from '../lib/insights'
import type { JournalEntry } from '../lib/types'

interface Props {
  entries: JournalEntry[]
}

const MOOD_COLORS = [
  'var(--mood-1)',
  'var(--mood-2)',
  'var(--mood-3)',
  'var(--mood-4)',
  'var(--mood-5)',
]

/** Pick the tag with the strongest (most negative) mood impact to highlight. */
function strongestNegativeTag(entries: JournalEntry[]) {
  const tags = new Set(entries.flatMap((e) => e.tags))
  let worst: { tag: string; delta: number } | null = null
  for (const tag of tags) {
    const impact = tagMoodImpact(entries, tag)
    if (impact && (worst === null || impact.delta < worst.delta)) {
      worst = { tag, delta: impact.delta }
    }
  }
  return worst && worst.delta <= -0.4 ? worst : null
}

export default function Dashboard({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <section className="card" aria-labelledby="dash-title">
        <p className="card__eyebrow">Patterns</p>
        <h2 id="dash-title">Your patterns will appear here</h2>
        <p className="empty">
          Check in for a few days and MindFuel will start surfacing the trends
          behind your stress — the things easy to miss day to day.
        </p>
      </section>
    )
  }

  const now = new Date()
  const trend = moodTrend(entries)
  const triggers = topTriggers(entries)
  const maxTrigger = triggers[0]?.count ?? 1
  const highlight = strongestNegativeTag(entries)

  return (
    <section className="card" aria-labelledby="dash-title">
      <p className="card__eyebrow">Patterns</p>
      <h2 id="dash-title">What's shaping your weeks</h2>

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat">
          <div className="stat__value">{entries.length}</div>
          <div className="stat__label">check-ins</div>
        </div>
        <div className="stat">
          <div className="stat__value">{averageMood(entries).toFixed(1)}</div>
          <div className="stat__label">average mood / 5</div>
        </div>
        <div className="stat">
          <div className="stat__value">{currentStreak(entries, now)}</div>
          <div className="stat__label">day streak</div>
        </div>
      </div>

      {highlight && (
        <p className="reasoning" style={{ marginBottom: '1.5rem' }}>
          <strong>A pattern worth noticing: </strong>
          your mood tends to dip by about {Math.abs(highlight.delta).toFixed(1)}{' '}
          points on “{highlight.tag}” days. Being gentle with yourself on those
          days may help.
        </p>
      )}

      <h3>Mood trend</h3>
      {trend.length >= 2 ? (
        <div
          className="trend"
          role="img"
          aria-label={`Mood trend across ${trend.length} days, from ${trend[0].mood.toFixed(
            1,
          )} to ${trend[trend.length - 1].mood.toFixed(1)} out of 5.`}
        >
          {trend.map((point) => (
            <div
              key={point.date}
              className="trend__bar"
              style={{
                height: `${(point.mood / 5) * 100}%`,
                background: MOOD_COLORS[Math.round(point.mood) - 1],
              }}
              title={`${point.date}: ${point.mood.toFixed(1)}/5`}
            />
          ))}
        </div>
      ) : (
        <p className="muted">A trend line appears after two days of check-ins.</p>
      )}

      {triggers.length > 0 && (
        <>
          <h3 style={{ marginTop: '1.5rem' }}>Most common stress triggers</h3>
          <ul className="trigger-list">
            {triggers.map(({ trigger, count }) => (
              <li key={trigger} className="trigger">
                <span className="trigger__name">{trigger}</span>
                <span
                  className="trigger__bar"
                  style={{ width: `${(count / maxTrigger) * 100}px` }}
                  aria-label={`${count} mention${count === 1 ? '' : 's'}`}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
