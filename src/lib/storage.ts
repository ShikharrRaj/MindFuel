/**
 * On-device persistence — the privacy backbone of MindFuel.
 *
 * Journals and mood logs are deeply personal. They live ONLY in the student's
 * own browser (localStorage); they are never uploaded to a database. The text
 * is sent to the AI for a single analysis call and not retained server-side.
 * This is both a responsible-design choice and a concrete Security story.
 *
 * All access is wrapped so a corrupted/blocked store (e.g. private mode) fails
 * soft rather than crashing the app, and everything read back goes through a
 * validator. Because clearing the browser erases the data, students can
 * download a backup file and restore it (exportBackup / importBackup).
 */

import {
  type CalmPrefs,
  type CalmSession,
  normalizePrefs,
  normalizeSessions,
} from './calm'
import { normalizeEntries, normalizeProfile } from './normalize'
import { normalizePlan, type SafetyPlan } from './safetyPlan'
import { type AmbientPrefs, normalizeAmbient } from './sounds'
import type { JournalEntry, UserProfile } from './types'

const PROFILE_KEY = 'mindfuel.profile.v1'
const ENTRIES_KEY = 'mindfuel.entries.v1'
const CALM_SESSIONS_KEY = 'mindfuel.calm-sessions.v1'
const CALM_PREFS_KEY = 'mindfuel.calm-prefs.v1'
const SAFETY_PLAN_KEY = 'mindfuel.safety-plan.v1'
const CONSENT_KEY = 'mindfuel.consent.v1'
const AMBIENT_KEY = 'mindfuel.ambient.v1'

/** Every key MindFuel writes — "Delete my data" must clear all of them. */
const ALL_KEYS = [
  PROFILE_KEY,
  ENTRIES_KEY,
  CALM_SESSIONS_KEY,
  CALM_PREFS_KEY,
  SAFETY_PLAN_KEY,
  CONSENT_KEY,
  AMBIENT_KEY,
]

/**
 * What a backup file holds, with the validator each value must pass. AI
 * consent is deliberately excluded: it is given on each device, by its user.
 */
const BACKUP_KEYS: Record<string, (raw: unknown) => unknown> = {
  [PROFILE_KEY]: normalizeProfile,
  [ENTRIES_KEY]: normalizeEntries,
  [CALM_SESSIONS_KEY]: normalizeSessions,
  [CALM_PREFS_KEY]: normalizePrefs,
  [SAFETY_PLAN_KEY]: normalizePlan,
  [AMBIENT_KEY]: normalizeAmbient,
}

/** Keep the most recent calm sessions only; older ones add little signal. */
export const MAX_CALM_SESSIONS = 500

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode / quota) — operate in-memory only */
  }
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadProfile(): UserProfile | null {
  return normalizeProfile(safeParse(safeGet(PROFILE_KEY)))
}

export function saveProfile(profile: UserProfile): void {
  safeSet(PROFILE_KEY, JSON.stringify(profile))
}

export function loadEntries(): JournalEntry[] {
  return normalizeEntries(safeParse(safeGet(ENTRIES_KEY)))
}

/** No entries means no key, so an empty list never re-creates deleted data. */
export function saveEntries(entries: JournalEntry[]): void {
  if (entries.length > 0) {
    safeSet(ENTRIES_KEY, JSON.stringify(entries))
    return
  }
  try {
    localStorage.removeItem(ENTRIES_KEY)
  } catch {
    /* ignore */
  }
}

export function loadCalmSessions(): CalmSession[] {
  return normalizeSessions(safeParse(safeGet(CALM_SESSIONS_KEY)))
}

export function saveCalmSessions(sessions: CalmSession[]): void {
  safeSet(CALM_SESSIONS_KEY, JSON.stringify(sessions.slice(-MAX_CALM_SESSIONS)))
}

export function loadCalmPrefs(): CalmPrefs {
  return normalizePrefs(safeParse(safeGet(CALM_PREFS_KEY)))
}

export function saveCalmPrefs(prefs: CalmPrefs): void {
  safeSet(CALM_PREFS_KEY, JSON.stringify(prefs))
}

export function loadSafetyPlan(): SafetyPlan {
  return normalizePlan(safeParse(safeGet(SAFETY_PLAN_KEY)))
}

export function saveSafetyPlan(plan: SafetyPlan): void {
  safeSet(SAFETY_PLAN_KEY, JSON.stringify(plan))
}

export function loadAmbient(): AmbientPrefs {
  return normalizeAmbient(safeParse(safeGet(AMBIENT_KEY)))
}

export function saveAmbient(prefs: AmbientPrefs): void {
  safeSet(AMBIENT_KEY, JSON.stringify(prefs))
}

/**
 * Another tab changed (or, with a null key, cleared) MindFuel's data. Each
 * on-device store listens for these so it never writes stale data back.
 */
export function isAppStorageEvent(e: StorageEvent): boolean {
  return e.key === null || e.key.startsWith('mindfuel.')
}

// ---------------------------------------------------------------------------
// AI consent: journal text goes to the AI model only after the student agrees.
// Bump the version when what is sent (or to whom) changes, to ask again.

export const AI_CONSENT_VERSION = 1

export interface AiConsent {
  version: number
  atISO: string
}

export function loadConsent(): AiConsent | null {
  const raw = safeParse(safeGet(CONSENT_KEY))
  if (typeof raw !== 'object' || raw === null) return null
  const { version, atISO } = raw as Record<string, unknown>
  if (version !== AI_CONSENT_VERSION || typeof atISO !== 'string') return null
  return { version, atISO }
}

export function saveConsent(now = new Date()): AiConsent {
  const consent = { version: AI_CONSENT_VERSION, atISO: now.toISOString() }
  safeSet(CONSENT_KEY, JSON.stringify(consent))
  return consent
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Backup: a JSON file the student downloads and can restore later.

const BACKUP_APP = 'mindfuel'
const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

/** Everything worth restoring, as a pretty-printed JSON string. */
export function exportBackup(now = new Date()): string {
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(BACKUP_KEYS)) {
    const value = safeParse(safeGet(key))
    if (value !== null) data[key] = value
  }
  return JSON.stringify(
    {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAtISO: now.toISOString(),
      data,
    },
    null,
    2,
  )
}

export type ImportResult =
  | { ok: true; restored: number }
  | { ok: false; error: string }

const NOT_A_BACKUP =
  'This file is not a MindFuel backup. Choose the .json file you downloaded from MindFuel.'

/**
 * Replace this device's data with a backup. Every value is validated first;
 * nothing is written unless the whole file is acceptable, and a failed write
 * puts the previous data back.
 */
export function importBackup(text: string): ImportResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'This file is too large to be a backup.' }
  }
  const parsed = safeParse(text)
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: NOT_A_BACKUP }
  }
  const { app, version, data } = parsed as Record<string, unknown>
  if (app !== BACKUP_APP || typeof data !== 'object' || data === null) {
    return { ok: false, error: NOT_A_BACKUP }
  }
  if (typeof version !== 'number' || version > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'This backup is from a newer version of MindFuel.',
    }
  }

  const values = new Map<string, string>()
  for (const [key, value] of Object.entries(data)) {
    // Own keys only: "constructor" or "__proto__" must not reach a lookup.
    if (!Object.hasOwn(BACKUP_KEYS, key)) {
      return { ok: false, error: NOT_A_BACKUP }
    }
    const normalize = BACKUP_KEYS[key]
    const clean = normalize(value)
    if (clean !== null) values.set(key, JSON.stringify(clean))
  }
  if (values.size === 0) {
    return { ok: false, error: 'This backup is empty.' }
  }

  const previous = new Map<string, string | null>()
  for (const key of Object.keys(BACKUP_KEYS)) previous.set(key, safeGet(key))
  try {
    for (const key of Object.keys(BACKUP_KEYS)) {
      const next = values.get(key)
      if (next === undefined) localStorage.removeItem(key)
      else localStorage.setItem(key, next)
    }
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      } catch {
        /* best effort */
      }
    }
    return {
      ok: false,
      error:
        'Could not save the backup on this device (storage is full or blocked).',
    }
  }
  return { ok: true, restored: values.size }
}

/** Erase everything MindFuel stored — exposed in the UI as "Delete my data". */
export function clearAll(): void {
  try {
    for (const key of ALL_KEYS) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
