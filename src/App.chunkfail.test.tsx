import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { saveProfile } from './lib/storage'

// Simulate the Focus chunk failing to load (offline, or a deploy swapped it).
vi.mock('./components/Focus', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

describe('a failed lazy chunk', () => {
  it('only takes down its own section; SOS and helplines survive', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Focus' }))
    expect(
      await screen.findByText(
        /this section could not load/i,
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /calm now/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Calm' })).toBeInTheDocument()
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0)
  })
})
