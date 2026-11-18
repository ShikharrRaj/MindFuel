import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_SAFETY_PLAN } from '../lib/safetyPlan'
import SafetyPlanBuilder from './SafetyPlanBuilder'

describe('SafetyPlanBuilder', () => {
  it('adds an item to a step and saves the plan', async () => {
    const onSave = vi.fn()
    render(<SafetyPlanBuilder plan={EMPTY_SAFETY_PLAN} onSave={onSave} />)

    await userEvent.type(
      screen.getByLabelText(/add to 1\. my warning signs/i),
      'I stop replying to messages{Enter}',
    )

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        warningSigns: ['I stop replying to messages'],
      }),
    )
  })

  it('removes an item', async () => {
    const onSave = vi.fn()
    render(
      <SafetyPlanBuilder
        plan={{ ...EMPTY_SAFETY_PLAN, reasons: ['my little brother'] }}
        onSave={onSave}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: /remove “my little brother”/i }),
    )
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ reasons: [] }),
    )
  })

  it('always includes the national helplines', () => {
    render(<SafetyPlanBuilder plan={EMPTY_SAFETY_PLAN} onSave={vi.fn()} />)
    expect(screen.getByRole('link', { name: '14416' })).toHaveAttribute(
      'href',
      'tel:14416',
    )
  })
})
