/**
 * DataControls — the student's controls over their on-device data: download a
 * backup, restore one, turn the AI features off, and delete everything.
 * Clearing the browser erases MindFuel's data, so the backup is the only way
 * to keep it or move it to another device.
 */

import { useRef, useState } from 'react'
import { exportBackup, importBackup, MAX_BACKUP_BYTES } from '../lib/storage'
import DataAction from './DataAction'

interface Props {
  aiOn: boolean
  onAiOff: () => void
  onReset: () => void
}

/** File.text() where available; FileReader everywhere else. */
function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function backupFileName(now: Date): string {
  return `mindfuel-backup-${now.toISOString().slice(0, 10)}.json`
}

export default function DataControls({ aiOn, onAiOff, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const [status, setStatus] = useState('')
  // Each failure gets a fresh alert element, so the same message is announced
  // again on a second try.
  const [error, setError] = useState<{ text: string; id: number } | null>(null)

  function fail(text: string) {
    setStatus('')
    setError((prev) => ({ text, id: (prev?.id ?? 0) + 1 }))
  }

  function download() {
    setError(null)
    const now = new Date()
    const blob = new Blob([exportBackup(now)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(now)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus(
      'Backup downloaded. It contains your journal as plain text, so keep it somewhere private.',
    )
  }

  async function restore(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setStatus('')
    setError(null)
    if (file.size > MAX_BACKUP_BYTES) {
      fail('This file is too large to be a MindFuel backup.')
      return
    }
    const confirmed = window.confirm(
      'Replace the data on this device with this backup? What is here now will be overwritten.',
    )
    if (!confirmed) return
    try {
      const result = importBackup(await readText(file))
      if (!result.ok) {
        fail(result.error)
        return
      }
    } catch {
      fail('Could not read this file.')
      return
    }
    setStatus('Backup restored. Reloading…')
    window.location.reload()
  }

  function turnOffAi() {
    onAiOff()
    setError(null)
    setStatus(
      'AI features are off. Nothing is sent until you agree again. Everything else keeps working.',
    )
    // The button just removed itself: keep focus on what happened.
    statusRef.current?.focus()
  }

  return (
    <section className="data-controls" aria-labelledby="data-controls-title">
      <h2 id="data-controls-title" className="data-controls__title">
        Your data
      </h2>
      <p className="muted data-controls__lead">
        Everything is saved only in this browser. Clearing it erases your data,
        so keep a backup.
      </p>
      <ul className="data-actions">
        <li>
          <DataAction
            icon="download"
            title="Download a backup"
            hint="A file with everything, to keep safe or move to another device."
            onClick={download}
          />
        </li>
        <li>
          <DataAction
            icon="restore"
            title="Restore a backup"
            hint="Load a backup file. It replaces what is on this device now."
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => void restore(e.target.files?.[0])}
          />
        </li>
        {aiOn && (
          <li>
            <DataAction
              icon="ai-off"
              title="Turn off AI features"
              hint="Nothing is sent to the AI until you agree again."
              onClick={turnOffAi}
            />
          </li>
        )}
      </ul>
      <div className="data-danger">
        <DataAction
          icon="delete"
          title="Delete my data"
          hint="Erase everything MindFuel saved on this device. This cannot be undone."
          danger
          onClick={onReset}
        />
      </div>
      <p ref={statusRef} tabIndex={-1} className="field__hint" role="status">
        {status}
      </p>
      {error && (
        <p
          key={error.id}
          className="field__hint data-controls__error"
          role="alert"
        >
          {error.text}
        </p>
      )}
    </section>
  )
}
