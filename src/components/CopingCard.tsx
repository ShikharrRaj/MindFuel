/**
 * CopingCard — "When I feel X, I do Y", built from the student's own
 * before/after ratings, plus their self-efficacy wins ("You brought it from 8
 * to 4, 12 times this month"). Evidence that they can calm themselves.
 */

import { getActivity, stateLabel } from '../lib/activities'
import { type CalmSession, calmWins, copingCard } from '../lib/calm'

interface Props {
  sessions: CalmSession[]
}

export default function CopingCard({ sessions }: Props) {
  const rows = copingCard(sessions)
  const wins = calmWins(sessions, new Date())

  return (
    <section className="card" aria-labelledby="coping-title">
      <p className="card__eyebrow">What works for you</p>
      <h2 id="coping-title">My coping card</h2>

      {wins.count > 0 && wins.best && (
        <p className="wins">
          You brought it from <strong>{wins.best.before}</strong> to{' '}
          <strong>{wins.best.after}</strong>
          {wins.count > 1
            ? `, and calmed things by 2+ points ${wins.count} times this month.`
            : ' this month.'}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="muted">
          After you rate a few activities, this card fills in with what actually
          works for you, based on your own before-and-after ratings.
        </p>
      ) : (
        <ul className="coping-list">
          {rows.map((r) => (
            <li key={r.state} className="coping-row">
              <span>
                When I feel <strong>{stateLabel(r.state).toLowerCase()}</strong>
              </span>
              <span>
                <span aria-hidden="true">→</span> I do{' '}
                <strong>
                  {getActivity(r.activityId)?.name ?? r.activityId}
                </strong>
                <span className="muted">
                  {' '}
                  (−{r.meanDrop.toFixed(1)} on average, {r.uses} times)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
