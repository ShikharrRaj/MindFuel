/**
 * App — top-level orchestrator. Holds the profile + entries, persists them
 * on-device, and switches between the five surfaces (Check-in, Calm, Focus,
 * Companion, Patterns). Network/AI concerns live in lib/api; the Calm Toolkit's
 * on-device state lives in useCalmStore; presentational pieces live in their
 * own components. This file is about state + composition.
 *
 * Deep links: `#sos` opens the calm overlay straight away (for home-screen
 * shortcuts); `#for-parents`, `#privacy` and `#terms` open standalone pages.
 *
 * Nothing is sent to the AI until the student agrees (AiConsent); consent is
 * stored on the device and can be withdrawn from "Your data".
 *
 * Calm by default: on arrival MindFuel offers calming music (MusicPrompt),
 * played by one app-wide player. The focus timer also lives here, so it keeps
 * running on every tab and shows in a floating timer, the tab title and an
 * optional pop-out window.
 */

import {
  type ComponentType,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Calm, { type CalmView } from './components/Calm'
import CheckIn from './components/CheckIn'
import Companion from './components/Companion'
import CopingCard from './components/CopingCard'
import Dashboard from './components/Dashboard'
import DataControls from './components/DataControls'
import Disclaimer from './components/Disclaimer'
import Dock from './components/Dock'
import ErrorBoundary from './components/ErrorBoundary'
import FloatingTimer from './components/FloatingTimer'
import Greeting from './components/Greeting'
import InsightCard from './components/InsightCard'
import MusicControl from './components/MusicControl'
import MusicPrompt from './components/MusicPrompt'
import Onboarding from './components/Onboarding'
import PipTimer from './components/PipTimer'
import SafetyCard from './components/SafetyCard'
import SectionError from './components/SectionError'
import SiteHeader from './components/SiteHeader'
import SosOverlay from './components/SosOverlay'
import Tabs, { type TabItem } from './components/Tabs'
import { useAmbientSound } from './hooks/useAmbientSound'
import { useAutoplay } from './hooks/useAutoplay'
import { useCalmStore } from './hooks/useCalmStore'
import { useFocusSession } from './hooks/useFocusSession'
import { useReducedMotion } from './hooks/useReducedMotion'
import { usePipWindow } from './hooks/usePipWindow'
import { useTimerTitle } from './hooks/useTimerTitle'
import { requestAnalysis } from './lib/api'
import { entryNeedsHelp } from './lib/calm'
import {
  countdownLabel,
  daysUntil,
  EXAM_LABELS,
  guidanceForDays,
} from './lib/exams'
import { newId } from './lib/id'
import {
  PARENT_GUIDE_HASH,
  PRIVACY_HASH,
  SOS_HASH,
  TERMS_HASH,
} from './lib/routes'
import { summarizeRecentMood } from './lib/insights'
import { DEFAULT_SCENE, soundInfo, soundLabel } from './lib/sounds'
import { detectCrisis } from './lib/safety'
import {
  clearAll,
  clearConsent,
  isAppStorageEvent,
  loadConsent,
  loadEntries,
  loadProfile,
  saveConsent,
  saveEntries,
  saveProfile,
} from './lib/storage'
import type { JournalEntry, MoodLevel, UserProfile } from './lib/types'

type Tab = 'checkin' | 'calm' | 'focus' | 'companion' | 'patterns'

const TABS: TabItem<Tab>[] = [
  { id: 'checkin', label: 'Check in' },
  { id: 'calm', label: 'Calm' },
  { id: 'focus', label: 'Focus' },
  { id: 'companion', label: 'Companion' },
  { id: 'patterns', label: 'Patterns' },
]

/** Retry a failed chunk load once (flaky network, or a deploy swapped chunks). */
function lazyWithRetry<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
) {
  return lazy(() =>
    load().catch(
      () =>
        new Promise<{ default: ComponentType<P> }>((resolve, reject) => {
          setTimeout(() => load().then(resolve, reject), 1000)
        }),
    ),
  )
}

// Non-safety surfaces load on demand to keep first paint lean. Safety surfaces
// (Calm, the SOS overlay, helplines) stay in the main bundle so they always
// work, even offline after first load.
const Focus = lazyWithRetry(() => import('./components/Focus'))
const ParentGuide = lazyWithRetry(() => import('./components/ParentGuide'))
const LegalPage = lazyWithRetry(() => import('./components/LegalPage'))
// Decorative, so it loads only once music first plays.
const Scenery = lazyWithRetry(() => import('./components/Scenery'))

const loading = (
  <p className="muted" role="status">
    Loading…
  </p>
)

/** Hashes that open a standalone page over the app. */
const PAGE_HASHES = [PARENT_GUIDE_HASH, PRIVACY_HASH, TERMS_HASH]

function clearHash(): void {
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    loadProfile(),
  )
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadEntries())
  const [tab, setTab] = useState<Tab>('checkin')
  // Once opened, the Focus panel stays mounted (hidden) so a break activity in
  // progress survives switching tabs. (The timer itself lives in useFocusSession.)
  const [focusVisited, setFocusVisited] = useState(false)
  const [calmView, setCalmView] = useState<CalmView>('now')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [consent, setConsent] = useState(() => loadConsent())
  const [latest, setLatest] = useState<JournalEntry | null>(null)
  const [crisis, setCrisis] = useState(false)
  const [justReset, setJustReset] = useState(false)
  const [hash, setHash] = useState(() => window.location.hash)
  const [sosOpen, setSosOpen] = useState(
    () => window.location.hash === SOS_HASH,
  )
  const calm = useCalmStore()
  const ambient = useAmbientSound()
  const focus = useFocusSession(calm.prefs.haptics)
  const pip = usePipWindow('Focus timer · MindFuel')
  const { clear: clearFocus } = focus
  const { close: closePip } = pip
  useTimerTitle(focus)

  // The calming scene: the one that goes with the music, or a sunset over
  // a park lake while nothing plays. It loads after first paint, then stays
  // mounted so it can crossfade.
  const scene = ambient.prefs.scenery
    ? ambient.playing
      ? soundInfo(ambient.playing).scene
      : DEFAULT_SCENE
    : null
  const [sceneryLoaded, setSceneryLoaded] = useState(false)
  if (scene && !sceneryLoaded) setSceneryLoaded(true)
  useEffect(() => {
    // Lets the CSS step the colour washes aside and back text with paper.
    if (scene) document.documentElement.dataset.scene = scene
    else delete document.documentElement.dataset.scene
    return () => {
      delete document.documentElement.dataset.scene
    }
  }, [scene])

  // "Pause motion" (WCAG 2.2.2) stills the whole page through one attribute.
  const motionOn = ambient.prefs.motion
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    if (motionOn) delete document.documentElement.dataset.motion
    else document.documentElement.dataset.motion = 'off'
  }, [motionOn])
  // The music prompt is answered once per visit.
  const [musicAnswered, setMusicAnswered] = useState(false)
  // Soft default music, from the first tap or key press.
  const autoplayed = useAutoplay(ambient)
  // Bumped by "Delete my data": a reflection still in flight from before the
  // reset must not write its entry back.
  const generation = useRef(0)
  const inflight = useRef<AbortController | null>(null)

  // Persist whenever profile/entries change — the only "database" is the device.
  useEffect(() => {
    if (profile) saveProfile(profile)
  }, [profile])
  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  useEffect(() => {
    function onHashChange() {
      const next = window.location.hash
      if (next === SOS_HASH) {
        setSosOpen(true)
        // The pop-out floats over every window, and must never sit on top of
        // the helplines (convention 3).
        closePip()
      }
      // Only real pages change the view (e.g. not the skip link's #main).
      if (next === '' || PAGE_HASHES.includes(next)) setHash(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [closePip])

  // Another tab changed or deleted the data: follow it, so a deleted entry or
  // withdrawn consent is not brought back from this tab.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!isAppStorageEvent(e)) return
      if (e.key === null || e.newValue === null) {
        // Deleted elsewhere: a reflection in flight here must not save.
        generation.current += 1
        inflight.current?.abort()
        inflight.current = null
        setPending(false)
      }
      const nextProfile = loadProfile()
      if (!nextProfile) {
        // Deleted elsewhere: forget this tab's study session too.
        clearFocus()
        closePip()
      }
      setProfile(nextProfile)
      setEntries(loadEntries())
      setConsent(loadConsent())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [clearFocus, closePip])

  // Warm the Focus chunk after first paint, so the tab still opens offline.
  useEffect(() => {
    const id = setTimeout(() => void import('./components/Focus'), 3000)
    return () => clearTimeout(id)
  }, [])

  const recentMoodSummary = useMemo(
    () => summarizeRecentMood(entries),
    [entries],
  )

  const phase = useMemo(() => {
    if (!profile) return null
    const days = daysUntil(profile.examDateISO, new Date())
    return { days, ...guidanceForDays(days) }
  }, [profile])

  const latestEntry = latest ?? entries[entries.length - 1] ?? null

  // A crisis flag from this session, or ANY flagged check-in in the last 24h
  // (survives a reload, and a calmer later entry does not clear it): every
  // surface leads with helplines.
  const needsHelp = useMemo(() => {
    const now = new Date()
    return crisis || entries.some((e) => entryNeedsHelp(e, now))
  }, [crisis, entries])

  async function handleCheckIn(
    mood: MoodLevel,
    text: string,
    tags: string[],
    wantsAi: boolean,
  ): Promise<void> {
    if (!profile) return
    setError(null)
    setNotice(null)

    // Local crisis check first — surface help instantly, regardless of
    // network. Sticky for this session: a calmer entry later does not hide it.
    if (detectCrisis(text).isCrisis) setCrisis(true)

    const entry: JournalEntry = {
      id: newId(),
      createdAtISO: new Date().toISOString(),
      mood,
      text,
      tags,
    }

    // Consent is re-read from storage (not state): it may have been given in
    // this same click, or withdrawn in another tab.
    if (!wantsAi || !loadConsent()) {
      setEntries((prev) => [...prev, entry])
      setLatest(entry)
      setNotice('Saved on this device. Nothing was sent to the AI.')
      return
    }

    const gen = generation.current
    const controller = new AbortController()
    inflight.current = controller
    setPending(true)

    try {
      const analysis = await requestAnalysis(
        {
          exam: profile.exam,
          examDateISO: profile.examDateISO,
          mood,
          text,
          tags,
          recentMoodSummary,
        },
        controller.signal,
      )
      entry.analysis = analysis
      if (analysis.severity === 'crisis') setCrisis(true)
      if (gen === generation.current) {
        setNotice('Your reflection is ready, just below.')
      }
    } catch (err) {
      if (gen === generation.current) {
        // Still save the entry so the student never loses their words.
        setError(
          err instanceof Error
            ? err.message
            : 'Could not analyse right now, but your entry is saved.',
        )
      }
    } finally {
      if (inflight.current === controller) inflight.current = null
      if (gen === generation.current) {
        setEntries((prev) => [...prev, entry])
        setLatest(entry)
        setPending(false)
      }
    }
  }

  function handleReset(): void {
    const confirmed = window.confirm(
      'Delete all your check-ins, calm history, safety plan and profile from this device? This cannot be undone.',
    )
    if (!confirmed) return
    generation.current += 1
    inflight.current?.abort()
    inflight.current = null
    clearAll()
    calm.reset()
    ambient.reset()
    // The study session is usage history too: nothing of it may linger.
    clearFocus()
    closePip()
    setEntries([])
    setProfile(null)
    setLatest(null)
    setCrisis(false)
    setConsent(null)
    setNotice(null)
    setError(null)
    setPending(false)
    setJustReset(true)
  }

  function giveConsent(): void {
    setConsent(saveConsent())
  }

  function withdrawConsent(): void {
    clearConsent()
    setConsent(null)
  }

  function changeTab(next: Tab): void {
    setTab(next)
    if (next === 'focus') setFocusVisited(true)
  }

  // From the floating timer: back to the Focus tab (closing any open page).
  function openFocus(): void {
    if (hash !== '') {
      clearHash()
      setHash('')
    }
    changeTab('focus')
    requestAnimationFrame(() => document.getElementById('tab-focus')?.focus())
  }

  function endFocusSession(): void {
    focus.reset()
    pip.close()
    document.getElementById('main')?.focus()
  }

  function openSos(): void {
    setSosOpen(true)
    closePip() // never let the pop-out sit over the helplines
  }

  function openCalm(view: CalmView): void {
    setCalmView(view)
    setTab('calm')
  }

  function closeSos(): void {
    setSosOpen(false)
    if (window.location.hash === SOS_HASH) clearHash()
  }

  const sos = sosOpen && (
    <SosOverlay
      haptics={calm.prefs.haptics}
      plan={calm.plan}
      onLog={calm.logSession}
      onClose={closeSos}
      onMoreTools={() => {
        closeSos()
        if (profile) openCalm('now')
      }}
      onOpenPlan={() => {
        closeSos()
        if (profile) openCalm('plan')
      }}
    />
  )

  // Leaving a standalone page returns focus to where the student was.
  function back(): void {
    clearHash()
    setHash('')
    requestAnimationFrame(() => {
      const target = profile
        ? document.getElementById(`tab-${tab}`)
        : document.getElementById('onboarding-title')
      target?.focus()
    })
  }

  // Standalone pages open OVER the app, which stays mounted (hidden), so a
  // half-written check-in, the chat or a running Focus block are not lost.
  const page =
    hash === PARENT_GUIDE_HASH ? (
      <ParentGuide onBack={back} />
    ) : hash === PRIVACY_HASH ? (
      <LegalPage doc="privacy" onBack={back} />
    ) : hash === TERMS_HASH ? (
      <LegalPage doc="terms" onBack={back} />
    ) : null

  const contextLabel =
    profile && phase
      ? `${EXAM_LABELS[profile.exam].split(' ')[0]} · ${countdownLabel(phase.days)}`
      : undefined

  // Offered as the student enters the app (after onboarding on a first visit).
  // (Only when music doesn't start by itself.)
  const showMusicPrompt =
    ambient.supported &&
    !ambient.prefs.autoplay &&
    ambient.prefs.ask &&
    !musicAnswered &&
    !ambient.played

  const app = profile ? (
    <>
      <Greeting
        name={profile.name}
        motion={motionOn}
        onMotionChange={ambient.setMotion}
      />
      {showMusicPrompt && (
        <MusicPrompt ambient={ambient} onDone={() => setMusicAnswered(true)} />
      )}
      <Tabs tabs={TABS} active={tab} onChange={changeTab} />

      {tab === 'checkin' && (
        <div
          role="tabpanel"
          id="panel-checkin"
          aria-labelledby="tab-checkin"
          className="panel"
        >
          {needsHelp && <SafetyCard />}
          <CheckIn
            pending={pending}
            error={error}
            notice={notice}
            phase={phase?.phase}
            aiConsent={consent !== null}
            onConsent={giveConsent}
            onCrisis={() => setCrisis(true)}
            onSubmit={handleCheckIn}
          />
          {latest?.analysis && (
            <>
              <InsightCard analysis={latest.analysis} />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => openCalm('now')}
              >
                {needsHelp
                  ? 'While you reach out, try a calming activity'
                  : 'Find a calming activity'}{' '}
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'calm' && (
        <div
          role="tabpanel"
          id="panel-calm"
          aria-labelledby="tab-calm"
          className="panel"
        >
          <Calm
            view={calmView}
            onViewChange={setCalmView}
            latest={latestEntry}
            phase={phase?.phase}
            store={calm}
            crisis={needsHelp}
            onCrisis={() => setCrisis(true)}
          />
        </div>
      )}

      {(tab === 'focus' || focusVisited) && (
        <div
          role="tabpanel"
          id="panel-focus"
          aria-labelledby="tab-focus"
          className="panel"
          hidden={tab !== 'focus'}
        >
          <ErrorBoundary fallback={<SectionError />}>
            <Suspense fallback={loading}>
              <Focus store={calm} session={focus} ambient={ambient} pip={pip} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {tab === 'companion' && (
        <div
          role="tabpanel"
          id="panel-companion"
          aria-labelledby="tab-companion"
          className="panel"
        >
          <Companion
            profile={profile}
            recentMoodSummary={recentMoodSummary}
            aiConsent={consent !== null}
            onConsent={giveConsent}
          />
        </div>
      )}

      {tab === 'patterns' && (
        <div
          role="tabpanel"
          id="panel-patterns"
          aria-labelledby="tab-patterns"
          className="panel"
        >
          <Dashboard entries={entries} />
          {calm.sessions.length > 0 && <CopingCard sessions={calm.sessions} />}
        </div>
      )}

      <DataControls
        aiOn={consent !== null}
        onAiOff={withdrawConsent}
        onReset={handleReset}
      />
    </>
  ) : (
    <Onboarding
      focusTitle={justReset}
      onComplete={(p) => {
        setJustReset(false)
        setProfile(p)
      }}
    />
  )

  // The timer follows the student wherever the Focus panel is out of view.
  const showTimer =
    profile !== null && focus.active && (tab !== 'focus' || page !== null)

  return (
    <div className="app-shell">
      {sceneryLoaded && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Scenery scene={scene} still={!motionOn || reducedMotion} />
          </Suspense>
        </ErrorBoundary>
      )}
      <div inert={sosOpen}>
        <SiteHeader
          context={contextLabel}
          phaseLabel={phase?.label}
          music={<MusicControl ambient={ambient} />}
          onSos={openSos}
        />
      </div>

      <main id="main" tabIndex={-1} className="app-main" inert={sosOpen}>
        {page && (
          <ErrorBoundary fallback={<SectionError />}>
            <Suspense fallback={loading}>{page}</Suspense>
          </ErrorBoundary>
        )}
        <div hidden={page !== null}>{app}</div>
        <Disclaimer />
      </main>

      {showTimer && (
        <>
          <Dock inert={sosOpen}>
            <FloatingTimer
              session={focus}
              pip={pip}
              onOpenFocus={openFocus}
              onEnd={endFocusSession}
            />
          </Dock>
          {/* Outside the dock, so phase changes are read even while it is
              tucked away. (The Focus panel's own region is hidden here.) */}
          <p role="status" className="sr-only">
            {focus.announcement}
          </p>
        </>
      )}
      {pip.win && <PipTimer win={pip.win} session={focus} />}
      {/* Music that starts by itself is announced, with where to stop it. */}
      <p role="status" className="sr-only">
        {autoplayed && ambient.playing
          ? `Soft music is playing: ${soundLabel(ambient.playing)}. Change or stop it from Music at the top.`
          : ''}
      </p>
      {sos}
    </div>
  )
}
