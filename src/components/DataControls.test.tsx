import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveProfile } from '../lib/storage'
import DataControls from './DataControls'

describe('DataControls', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('names each action by its title and describes what it does', () => {
    render(<DataControls aiOn={true} onAiOff={vi.fn()} onReset={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Download a backup' }),
    ).toHaveAccessibleDescription(/keep safe or move to another device/i)
    expect(
      screen.getByRole('button', { name: 'Restore a backup' }),
    ).toHaveAccessibleDescription(/replaces what is on this device/i)
    expect(
      screen.getByRole('button', { name: 'Delete my data' }),
    ).toHaveAccessibleDescription(/cannot be undone/i)
  })

  it('downloads a backup file', async () => {
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    const createObjectURL = vi.fn(() => 'blob:mindfuel')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    render(<DataControls aiOn={false} onAiOff={vi.fn()} onReset={vi.fn()} />)
    await userEvent.click(
      screen.getByRole('button', { name: /download a backup/i }),
    )
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      /keep it somewhere private/i,
    )
  })

  it('explains a bad restore file and changes nothing', async () => {
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = render(
      <DataControls aiOn={false} onAiOff={vi.fn()} onReset={vi.fn()} />,
    )
    const input = container.querySelector('input[type="file"]')!
    const file = new File(['{"hello": "world"}'], 'notes.json', {
      type: 'application/json',
    })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /not a mindfuel backup/i,
      ),
    )
    expect(localStorage.getItem('mindfuel.profile.v1')).not.toBeNull()
  })

  it('offers to turn the AI off only while it is on', async () => {
    const onAiOff = vi.fn()
    const { rerender } = render(
      <DataControls aiOn={true} onAiOff={onAiOff} onReset={vi.fn()} />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: /turn off ai features/i }),
    )
    expect(onAiOff).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(/nothing is sent/i)
    rerender(<DataControls aiOn={false} onAiOff={onAiOff} onReset={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /turn off ai features/i }),
    ).not.toBeInTheDocument()
  })
})

describe('DataControls announcements', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('announces the same error again on a second try', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = render(
      <DataControls aiOn={false} onAiOff={vi.fn()} onReset={vi.fn()} />,
    )
    const input = container.querySelector('input[type="file"]')!
    const bad = () => new File(['nope'], 'x.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [bad()] } })
    const first = await screen.findByRole('alert')
    fireEvent.change(input, { target: { files: [bad()] } })
    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(first))
  })

  it('keeps focus on the outcome after turning the AI off', async () => {
    render(<DataControls aiOn={true} onAiOff={vi.fn()} onReset={vi.fn()} />)
    await userEvent.click(
      screen.getByRole('button', { name: /turn off ai features/i }),
    )
    expect(screen.getByRole('status')).toHaveFocus()
  })
})
