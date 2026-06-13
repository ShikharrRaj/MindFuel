/**
 * App — top-level orchestrator. Holds the profile + entries, persists them
 * on-device, and switches between the three surfaces (Check-in, Companion,
 * Patterns). Network/AI concerns live in lib/api; this component is about state
 * and composition.
 */

import { useEffect, useMemo, useState } from 'react'
import CheckIn from './components/CheckIn'
import Companion from './components/Companion'
import Dashboard from './components/Dashboard'
import InsightCard from './components/InsightCard'
import Onboarding from './components/Onboarding'
import Reset from './components/Reset'
import SafetyCard from './components/SafetyCard'
import { requestAnalysis } from './lib/api'
import { countdownLabel, daysUntil, EXAM_LABELS, guidanceForDays } from './lib/exams'
import { summarizeRecentMood } from './lib/insights'
import { detectCrisis, SUPPORT_DISCLAIMER } from './lib/safety'
import {
  clearAll,
  loadEntries,
  loadProfile,
  saveEntries,
  saveProfile,
} from './lib/storage'
import type { JournalEntry, MoodLevel, UserProfile } from './lib/types'

type Tab = 'checkin' | 'reset' | 'companion' | 'patterns'

/** Stable unique id without pulling in a dependency. */
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile())
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadEntries())
  const [tab, setTab] = useState<Tab>('checkin')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latest, setLatest] = useState<JournalEntry | null>(null)
  const [crisis, setCrisis] = useState(false)

  // Persist whenever profile/entries change — the only "database" is the device.
  useEffect(() => {
    if (profile) saveProfile(profile)
  }, [profile])
  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const recentMoodSummary = useMemo(
    () => summarizeRecentMood(entries),
    [entries],
  )

  const phase = useMemo(() => {
    if (!profile) return null
    const days = daysUntil(profile.examDateISO, new Date())
    return { days, ...guidanceForDays(days) }
  }, [profile])

  if (!profile) {
    return (
      <div className="app-shell">
        <SiteHeader />
        <main id="main" className="app-main">
          <Onboarding onComplete={setProfile} />
          <GlobalDisclaimer />
        </main>
      </div>
    )
  }

  async function handleCheckIn(mood: MoodLevel, text: string, tags: string[]) {
    setError(null)
    setPending(true)

    // Local crisis check first — surface help instantly, regardless of network.
    const localCrisis = detectCrisis(text).isCrisis
    setCrisis(localCrisis)

    const entry: JournalEntry = {
      id: newId(),
      createdAtISO: new Date().toISOString(),
      mood,
      text,
      tags,
    }

    try {
      const analysis = await requestAnalysis({
        exam: profile!.exam,
        examDateISO: profile!.examDateISO,
        mood,
        text,
        tags,
        recentMoodSummary,
      })
      entry.analysis = analysis
      if (analysis.severity === 'crisis') setCrisis(true)
    } catch (err) {
      // Still save the entry so the student never loses their words.
      setError(
        err instanceof Error
          ? err.message
          : 'Could not analyse right now, but your entry is saved.',
      )
    } finally {
      setEntries((prev) => [...prev, entry])
      setLatest(entry)
      setPending(false)
    }
  }

  function handleReset() {
    if (
      !window.confirm(
        'Delete all your check-ins and profile from this device? This cannot be undone.',
      )
    ) {
      return
    }
    clearAll()
    setEntries([])
    setProfile(null)
    setLatest(null)
    setCrisis(false)
  }

  return (
    <div className="app-shell">
      <SiteHeader
        context={
          phase
            ? `${EXAM_LABELS[profile.exam].split(' ')[0]} · ${countdownLabel(
                phase.days,
              )}`
            : undefined
        }
        phaseLabel={phase?.label}
      />

      <main id="main" className="app-main">
        <nav className="tabs" aria-label="Sections">
          <TabButton id="checkin" tab={tab} setTab={setTab}>
            Check in
          </TabButton>
          <TabButton id="reset" tab={tab} setTab={setTab}>
            Reset
          </TabButton>
          <TabButton id="companion" tab={tab} setTab={setTab}>
            Companion
          </TabButton>
          <TabButton id="patterns" tab={tab} setTab={setTab}>
            Patterns
          </TabButton>
        </nav>

        {tab === 'checkin' && (
          <div role="tabpanel" id="panel-checkin" aria-labelledby="tab-checkin">
            {crisis && <SafetyCard />}
            <CheckIn pending={pending} error={error} onSubmit={handleCheckIn} />
            {latest?.analysis && (
              <>
                <InsightCard analysis={latest.analysis} />
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setTab('reset')}
                >
                  Try a guided reset →
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'reset' && (
          <div role="tabpanel" id="panel-reset" aria-labelledby="tab-reset">
            <Reset
              latest={latest ?? entries[entries.length - 1] ?? null}
              phase={phase?.phase}
            />
          </div>
        )}

        {tab === 'companion' && (
          <div role="tabpanel" id="panel-companion" aria-labelledby="tab-companion">
            <Companion profile={profile} recentMoodSummary={recentMoodSummary} />
          </div>
        )}

        {tab === 'patterns' && (
          <div role="tabpanel" id="panel-patterns" aria-labelledby="tab-patterns">
            <Dashboard entries={entries} />
          </div>
        )}

        <GlobalDisclaimer onReset={handleReset} />
      </main>
    </div>
  )
}

function SiteHeader({
  context,
  phaseLabel,
}: {
  context?: string
  phaseLabel?: string
}) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <div>
            <span className="brand">
              MindFuel<span className="brand__dot">.</span>
            </span>
            <span className="brand__tag">Exam wellness companion</span>
          </div>
          {context && (
            <span className="context-chip">
              <strong>{context}</strong>
              {phaseLabel ? ` · ${phaseLabel}` : ''}
            </span>
          )}
        </div>
      </header>
    </>
  )
}

function TabButton({
  id,
  tab,
  setTab,
  children,
}: {
  id: Tab
  tab: Tab
  setTab: (t: Tab) => void
  children: React.ReactNode
}) {
  return (
    <button
      className="tab"
      id={`tab-${id}`}
      role="tab"
      aria-selected={tab === id}
      aria-controls={`panel-${id}`}
      onClick={() => setTab(id)}
    >
      {children}
    </button>
  )
}

function GlobalDisclaimer({ onReset }: { onReset?: () => void }) {
  return (
    <p className="disclaimer">
      {SUPPORT_DISCLAIMER}
      {onReset && (
        <>
          {' '}
          <button
            type="button"
            className="btn btn--ghost"
            style={{ marginTop: '0.75rem', display: 'inline-block', padding: '0.4rem 0.9rem' }}
            onClick={onReset}
          >
            Delete my data
          </button>
        </>
      )}
    </p>
  )
}
