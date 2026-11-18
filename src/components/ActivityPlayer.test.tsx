import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getActivity } from '../lib/activities'
import ActivityPlayer from './ActivityPlayer'

function renderPlayer(
  id: string,
  extra: { askBefore?: boolean; before?: number } = {},
) {
  const onLog = vi.fn()
  render(
    <ActivityPlayer
      activity={getActivity(id)!}
      states={['future-fear']}
      source="library"
      haptics={false}
      onLog={onLog}
      {...extra}
    />,
  )
  return { onLog }
}

describe('ActivityPlayer safety', () => {
  it('scans worksheet text locally and shows helplines on crisis language', async () => {
    renderPlayer('decatastrophise')
    await userEvent.type(
      screen.getByLabelText(/worst that could happen/i),
      'honestly I want to die',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/14416/)
    // The canned "even the worst case has a next step" line is suppressed.
    expect(screen.queryByText(/even the worst case/i)).not.toBeInTheDocument()
  })

  it('shows the closing line for ordinary reflections', async () => {
    renderPlayer('decatastrophise')
    await userEvent.type(
      screen.getByLabelText(/worst that could happen/i),
      'I might not get my first-choice college',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(/even the worst case/i)).toBeInTheDocument()
  })

  it('brings up helplines when the before-rating is at the top of the scale', async () => {
    renderPlayer('box-breathing', { askBefore: true })
    fireEvent.change(screen.getByLabelText(/how strong is it right now/i), {
      target: { value: '10' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0)
  })

  it('brings up helplines when distress rises during an activity', async () => {
    renderPlayer('grounding-333', { before: 5 })
    expect(screen.queryByText(/14416/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /i’m done/i }))
    fireEvent.change(screen.getByLabelText(/how strong is it now/i), {
      target: { value: '8' },
    })
    await userEvent.click(screen.getByRole('button', { name: /not really/i }))
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/please reach out to someone now/i),
    ).toBeInTheDocument()
  })

  it('keeps crisis help through the after-check and never congratulates instead', async () => {
    renderPlayer('decatastrophise', { before: 6 })
    await userEvent.type(
      screen.getByLabelText(/worst that could happen/i),
      'I want to die',
    )
    await userEvent.click(screen.getByRole('button', { name: /i’m done/i }))
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText(/how strong is it now/i), {
      target: { value: '4' },
    })
    await userEvent.click(screen.getByRole('button', { name: /it helped/i }))
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/thank you for writing that down/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/that was you/i)).not.toBeInTheDocument()
  })

  it('scans the editable message box too', async () => {
    renderPlayer('reach-out')
    const box = screen.getByLabelText(/your message/i)
    await userEvent.clear(box)
    await userEvent.type(box, 'I want to end my life')
    expect(screen.getByRole('alert')).toHaveTextContent(/14416/)
  })
})
