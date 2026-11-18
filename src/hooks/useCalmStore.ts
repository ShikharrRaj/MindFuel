/**
 * useCalmStore — on-device state for the Calm Toolkit: completed sessions
 * (with before/after ratings), remembered preferences, and the safety plan.
 * Everything persists to localStorage only; nothing is sent to a server.
 */

import { useCallback, useEffect, useState } from 'react'
import type { CalmPrefs, CalmSession } from '../lib/calm'
import { newId } from '../lib/id'
import type { SafetyPlan } from '../lib/safetyPlan'
import {
  isAppStorageEvent,
  loadCalmPrefs,
  loadCalmSessions,
  loadSafetyPlan,
  saveCalmPrefs,
  saveCalmSessions,
  saveSafetyPlan,
} from '../lib/storage'

/** What a player reports when an activity finishes. */
export type SessionInput = Omit<CalmSession, 'id' | 'atISO'>

export interface CalmStore {
  sessions: CalmSession[]
  prefs: CalmPrefs
  plan: SafetyPlan
  logSession: (input: SessionInput) => void
  updatePrefs: (patch: Partial<CalmPrefs>) => void
  savePlan: (plan: SafetyPlan) => void
  /** Reset in-memory state after "Delete my data" has cleared storage. */
  reset: () => void
}

export function useCalmStore(): CalmStore {
  const [sessions, setSessions] = useState<CalmSession[]>(() =>
    loadCalmSessions(),
  )
  const [prefs, setPrefs] = useState<CalmPrefs>(() => loadCalmPrefs())
  const [plan, setPlan] = useState<SafetyPlan>(() => loadSafetyPlan())
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    if (!cleared) saveCalmSessions(sessions)
  }, [sessions, cleared])
  useEffect(() => {
    if (!cleared) saveCalmPrefs(prefs)
  }, [prefs, cleared])

  const logSession = useCallback((input: SessionInput) => {
    setCleared(false)
    setSessions((prev) => [
      ...prev,
      { ...input, id: newId(), atISO: new Date().toISOString() },
    ])
    if (input.outcome === 'not-for-me') {
      setPrefs((p) =>
        p.notForMe.includes(input.activityId)
          ? p
          : { ...p, notForMe: [...p.notForMe, input.activityId] },
      )
    }
  }, [])

  const updatePrefs = useCallback((patch: Partial<CalmPrefs>) => {
    setCleared(false)
    setPrefs((p) => ({ ...p, ...patch }))
  }, [])

  const savePlan = useCallback((next: SafetyPlan) => {
    setCleared(false)
    const stamped = { ...next, updatedAtISO: new Date().toISOString() }
    setPlan(stamped)
    saveSafetyPlan(stamped)
  }, [])

  const reset = useCallback(() => {
    // Storage was already wiped by clearAll(); stop the effects re-writing it.
    setCleared(true)
    setSessions([])
    setPrefs(loadCalmPrefs())
    setPlan(loadSafetyPlan())
  }, [])

  // Another tab changed or deleted the data: follow it, never write it back.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!isAppStorageEvent(e)) return
      if (e.key === null || e.newValue === null) {
        reset()
        return
      }
      setSessions(loadCalmSessions())
      setPrefs(loadCalmPrefs())
      setPlan(loadSafetyPlan())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [reset])

  return { sessions, prefs, plan, logSession, updatePrefs, savePlan, reset }
}
