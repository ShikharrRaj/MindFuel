import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFS } from '../lib/calm'
import { EMPTY_SAFETY_PLAN } from '../lib/safetyPlan'
import type { CalmStore } from '../hooks/useCalmStore'
import Calm from './Calm'

const store: CalmStore = {
  sessions: [],
  prefs: { ...DEFAULT_PREFS, haptics: false },
  plan: EMPTY_SAFETY_PLAN,
  logSession: vi.fn(),
  updatePrefs: vi.fn(),
  savePlan: vi.fn(),
  reset: vi.fn(),
}

const props = {
  view: 'now' as const,
  onViewChange: vi.fn(),
  latest: null,
  store,
}

describe('Calm crisis banner', () => {
  it('is a quiet banner when the flag was already set on opening', () => {
    render(<Calm {...props} crisis />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', {
        name: /you don't have to carry this alone/i,
      }),
    ).toBeInTheDocument()
  })

  it('is announced when the flag arrives while the tab is open', () => {
    const { rerender } = render(<Calm {...props} crisis={false} />)
    rerender(<Calm {...props} crisis />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /you don't have to carry this alone/i,
    )
  })
})
