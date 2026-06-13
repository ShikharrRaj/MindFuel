/**
 * App — top-level orchestrator. Holds the profile + entries, persists them
 * on-device, and switches between the four surfaces (Check-in, Reset,
 * Companion, Patterns). Network/AI concerns live in lib/api; presentational
 * pieces live in their own components. This file is about state + composition.
 */

import { useEffect, useMemo, useState } from 'react'
import CheckIn from './components/CheckIn'
import Companion from './components/Companion'
import Dashboard from './components/Dashboard'
import Disclaimer from './components/Disclaimer'
import InsightCard from './components/InsightCard'
import Onboarding from './components/Onboarding'
import Reset from './components/Reset'
import SafetyCard from './components/SafetyCard'
import SiteHeader from './components/SiteHeader'
import Tabs, { type TabItem } from './components/Tabs'
import { requestAnalysis } from './lib/api'
import {
  countdownLabel,
  daysUntil,
  EXAM_LABELS,
  guidanceForDays,
} from './lib/exams'
import { summarizeRecentMood } from './lib/insights'
import { detectCrisis } from './lib/safety'
import {
  clearAll,
  loadEntries,
  loadProfile,
  saveEntries,
  saveProfile,
} from './lib/storage'
import type { JournalEntry, MoodLevel, UserProfile } from './lib/types'

type Tab = 'checkin' | 'reset' | 'companion' | 'patterns'

const TABS: TabItem<Tab>[] = [
  { id: 'checkin', label: 'Check in' },
  { id: 'reset', label: 'Reset' },
  { id: 'companion', label: 'Companion' },
  { id: 'patterns', label: 'Patterns' },
]

/** Stable unique id without pulling in a dependency. */
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    loadProfile(),
  )
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

  async function handleCheckIn(
    mood: MoodLevel,
    text: string,
    tags: string[],
  ): Promise<void> {
    if (!profile) return
    setError(null)
    setPending(true)

    // Local crisis check first — surface help instantly, regardless of network.
    setCrisis(detectCrisis(text).isCrisis)

    const entry: JournalEntry = {
      id: newId(),
      createdAtISO: new Date().toISOString(),
      mood,
      text,
      tags,
    }

    try {
      const analysis = await requestAnalysis({
        exam: profile.exam,
        examDateISO: profile.examDateISO,
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

  function handleReset(): void {
    const confirmed = window.confirm(
      'Delete all your check-ins and profile from this device? This cannot be undone.',
    )
    if (!confirmed) return
    clearAll()
    setEntries([])
    setProfile(null)
    setLatest(null)
    setCrisis(false)
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <SiteHeader />
        <main id="main" className="app-main">
          <Onboarding onComplete={setProfile} />
          <Disclaimer />
        </main>
      </div>
    )
  }

  const contextLabel = phase
    ? `${EXAM_LABELS[profile.exam].split(' ')[0]} · ${countdownLabel(phase.days)}`
    : undefined

  return (
    <div className="app-shell">
      <SiteHeader context={contextLabel} phaseLabel={phase?.label} />

      <main id="main" className="app-main">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

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
          <div
            role="tabpanel"
            id="panel-companion"
            aria-labelledby="tab-companion"
          >
            <Companion
              profile={profile}
              recentMoodSummary={recentMoodSummary}
            />
          </div>
        )}

        {tab === 'patterns' && (
          <div
            role="tabpanel"
            id="panel-patterns"
            aria-labelledby="tab-patterns"
          >
            <Dashboard entries={entries} />
          </div>
        )}

        <Disclaimer onReset={handleReset} />
      </main>
    </div>
  )
}
