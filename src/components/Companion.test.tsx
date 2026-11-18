import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import Companion from './Companion'

function Harness() {
  const [consent, setConsent] = useState(false)
  return (
    <Companion
      profile={{ exam: 'JEE', examDateISO: '2027-01-22' }}
      recentMoodSummary="no prior check-ins yet"
      aiConsent={consent}
      onConsent={() => setConsent(true)}
    />
  )
}

describe('Companion consent', () => {
  it('replaces the message box until agreed, then focuses it', async () => {
    render(<Harness />)
    expect(screen.queryByLabelText(/type a message/i)).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('checkbox', { name: /18 or older/i }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: /agree and continue/i }),
    )
    expect(screen.getByLabelText(/type a message/i)).toHaveFocus()
  })
})
