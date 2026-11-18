import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_SAFETY_PLAN } from '../lib/safetyPlan'
import SosOverlay from './SosOverlay'

function setup(plan = EMPTY_SAFETY_PLAN) {
  const props = {
    haptics: false,
    plan,
    onLog: vi.fn(),
    onClose: vi.fn(),
    onMoreTools: vi.fn(),
    onOpenPlan: vi.fn(),
  }
  render(<SosOverlay {...props} />)
  return props
}

describe('SosOverlay', () => {
  it('opens as a modal dialog and starts breathing straight away', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: /breathe with me/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /breathe with me/i }),
    ).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const { onClose } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('leads with helplines and the safety plan when things are still bad', async () => {
    const { onLog } = setup({ ...EMPTY_SAFETY_PLAN, people: ['Didi'] })
    await userEvent.click(screen.getByRole('button', { name: /skip ahead/i }))
    await userEvent.click(
      screen.getByRole('button', { name: /still really bad/i }),
    )

    expect(
      screen.getByRole('heading', { name: /support/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/14416/).length).toBeGreaterThan(0)
    expect(screen.getByText('Didi')).toBeInTheDocument()
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'not-really', source: 'sos' }),
    )
  })

  it('offers more tools when the student feels calmer', async () => {
    const { onMoreTools } = setup()
    await userEvent.click(screen.getByRole('button', { name: /skip ahead/i }))
    await userEvent.click(screen.getByRole('button', { name: /a bit calmer/i }))
    await userEvent.click(
      screen.getByRole('button', { name: /more ways to calm down/i }),
    )
    expect(onMoreTools).toHaveBeenCalled()
  })

  it('keeps Shift+Tab inside the dialog, even from the heading', async () => {
    render(
      <>
        <button type="button">Behind the dialog</button>
        <SosOverlay
          haptics={false}
          plan={EMPTY_SAFETY_PLAN}
          onLog={vi.fn()}
          onClose={vi.fn()}
          onMoreTools={vi.fn()}
          onOpenPlan={vi.fn()}
        />
      </>,
    )
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    )
  })

  it('moves focus to a new heading at each step, so it is announced', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /skip ahead/i }))
    expect(
      screen.getByRole('heading', { name: /how do you feel now/i }),
    ).toHaveFocus()
  })
})
