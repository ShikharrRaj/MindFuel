/**
 * On-device persistence — the privacy backbone of MindFuel.
 *
 * Journals and mood logs are deeply personal. They live ONLY in the student's
 * own browser (localStorage); they are never uploaded to a database. The text
 * is sent to the AI for a single analysis call and not retained server-side.
 * This is both a responsible-design choice and a concrete Security story.
 *
 * All access is wrapped so a corrupted/blocked store (e.g. private mode) fails
 * soft rather than crashing the app.
 */

import type { JournalEntry, UserProfile } from './types'

const PROFILE_KEY = 'mindfuel.profile.v1'
const ENTRIES_KEY = 'mindfuel.entries.v1'

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

export function loadProfile(): UserProfile | null {
  const raw = safeGet(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveProfile(profile: UserProfile): void {
  safeSet(PROFILE_KEY, JSON.stringify(profile))
}

export function loadEntries(): JournalEntry[] {
  const raw = safeGet(ENTRIES_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as JournalEntry[]) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: JournalEntry[]): void {
  safeSet(ENTRIES_KEY, JSON.stringify(entries))
}

/** Erase everything MindFuel stored — exposed in the UI as "Delete my data". */
export function clearAll(): void {
  try {
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(ENTRIES_KEY)
  } catch {
    /* ignore */
  }
}
