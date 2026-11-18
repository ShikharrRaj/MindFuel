/**
 * Calm — the Calm Toolkit tab. Four views: "Calm now" (the 3-tap flow),
 * "Activities" (the full library), "My plan" (safety plan + coping card) and
 * "Learn" (lessons, panic explainer, exam-hall card, parent guide).
 * Everything here runs on-device with no AI call.
 */

import { useState } from 'react'
import { hapticsSupported } from '../device/haptics'
import type { PrepPhase } from '../lib/exams'
import type { JournalEntry } from '../lib/types'
import type { CalmStore } from '../hooks/useCalmStore'
import ActivityLibrary from './ActivityLibrary'
import CalmNow from './CalmNow'
import CopingCard from './CopingCard'
import LearnHub from './LearnHub'
import SafetyCard from './SafetyCard'
import SafetyPlanBuilder from './SafetyPlanBuilder'

export type CalmView = 'now' | 'activities' | 'plan' | 'learn'

const VIEWS: { id: CalmView; label: string }[] = [
  { id: 'now', label: 'Quick pick' },
  { id: 'activities', label: 'Activities' },
  { id: 'plan', label: 'My plan' },
  { id: 'learn', label: 'Learn' },
]

interface Props {
  view: CalmView
  onViewChange: (view: CalmView) => void
  latest: JournalEntry | null
  phase?: PrepPhase
  store: CalmStore
  /** A recent check-in was flagged as a crisis: lead with helplines. */
  crisis?: boolean
  /** Crisis language was typed into an activity. */
  onCrisis?: () => void
}

export default function Calm({
  view,
  onViewChange,
  latest,
  phase,
  store,
  crisis = false,
  onCrisis,
}: Props) {
  const { sessions, prefs, plan, logSession, updatePrefs, savePlan } = store
  // A flag already set when the tab opened is a quiet banner (no re-announcing
  // on every visit). One that arrives while the tab is open, e.g. a check-in
  // analysis finishing, is announced.
  const [crisisOnOpen] = useState(crisis)
  // When the flag comes from words typed into an activity, that activity
  // already announces help; a second alert would talk over it.
  const [fromActivity, setFromActivity] = useState(false)
  const flagFromActivity = () => {
    setFromActivity(true)
    onCrisis?.()
  }

  return (
    <>
      {crisis && <SafetyCard alert={!crisisOnOpen && !fromActivity} />}
      <div
        className="seg calm-nav"
        role="group"
        aria-label="Calm toolkit sections"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="seg__btn"
            aria-pressed={view === v.id}
            onClick={() => onViewChange(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'now' && (
        <CalmNow
          latest={latest}
          phase={phase}
          sessions={sessions}
          prefs={prefs}
          onLog={logSession}
          onSettingChange={(setting) => updatePrefs({ setting })}
          onOpenPlan={() => onViewChange('plan')}
          crisis={crisis}
          onCrisisText={flagFromActivity}
        />
      )}

      {view === 'activities' && (
        <ActivityLibrary
          prefs={prefs}
          onLog={logSession}
          onRestore={(id) =>
            updatePrefs({ notForMe: prefs.notForMe.filter((x) => x !== id) })
          }
          onCrisisText={flagFromActivity}
        />
      )}

      {view === 'plan' && (
        <>
          <CopingCard sessions={sessions} />
          <SafetyPlanBuilder plan={plan} onSave={savePlan} />
        </>
      )}

      {view === 'learn' && <LearnHub />}

      {hapticsSupported() && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={prefs.haptics}
            onChange={(e) => updatePrefs({ haptics: e.target.checked })}
          />
          <span>Vibration cues during breathing (eyes-closed friendly)</span>
        </label>
      )}
    </>
  )
}
