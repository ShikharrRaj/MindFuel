/**
 * JournalPrompts — "Need a prompt?" for days when the blank box is the hardest
 * part. Prompts come from a static library, matched to the tags picked and the
 * prep phase. No AI call.
 */

import { useState } from 'react'
import type { PrepPhase } from '../lib/exams'
import { promptsFor } from '../lib/journalPrompts'

interface Props {
  phase?: PrepPhase
  tags: string[]
  onPick: (prompt: string) => void
}

export default function JournalPrompts({ phase, tags, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const seed = new Date().getDate()
  const prompts = promptsFor({ phase, tags, seed })

  return (
    <div className="prompts">
      <button
        type="button"
        className="link-btn"
        aria-expanded={open}
        aria-controls="journal-prompts"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide prompts' : 'Need a prompt?'}
      </button>
      {open && (
        <ul id="journal-prompts" className="prompts__list">
          {prompts.map((p) => (
            <li key={p}>
              <button
                type="button"
                className="prompt-btn"
                onClick={() => onPick(p)}
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
