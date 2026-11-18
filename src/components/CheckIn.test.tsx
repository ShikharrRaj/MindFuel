import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CheckIn from './CheckIn'

describe('CheckIn', () => {
  it('blocks submission and shows errors until mood + text are provided', async () => {
    const onSubmit = vi.fn()
    render(
      <CheckIn
        pending={false}
        error={null}
        aiConsent
        onConsent={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/pick a mood first/i)).toBeInTheDocument()
  })

  it('submits mood, text, and selected tags, then clears the form', async () => {
    const onSubmit = vi.fn()
    render(
      <CheckIn
        pending={false}
        error={null}
        aiConsent
        onConsent={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(
      screen.getByRole('radio', { name: /low \(2 of 5\)/i }),
    )
    const textarea = screen.getByLabelText(/what's on your mind/i)
    await userEvent.type(textarea, 'Mock test went badly today')
    await userEvent.click(screen.getByRole('button', { name: /mock test/i }))

    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )

    expect(onSubmit).toHaveBeenCalledWith(
      2,
      'Mock test went badly today',
      ['mock test'],
      true,
    )
    expect((textarea as HTMLTextAreaElement).value).toBe('')
  })

  it('disables the submit button while a reflection is pending', () => {
    render(
      <CheckIn
        pending={true}
        error={null}
        aiConsent
        onConsent={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /reflecting/i })).toBeDisabled()
  })
})

describe('CheckIn consent', () => {
  async function fill(text = 'Mock test went badly today') {
    await userEvent.click(
      screen.getByRole('radio', { name: /low \(2 of 5\)/i }),
    )
    await userEvent.type(screen.getByLabelText(/what's on your mind/i), text)
    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )
  }

  it('asks before the first AI reflection, and can save without AI', async () => {
    const onSubmit = vi.fn()
    render(
      <CheckIn
        pending={false}
        error={null}
        aiConsent={false}
        onConsent={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    await fill()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: /before mindfuel’s ai reads this/i }),
    ).toHaveFocus()

    await userEvent.click(
      screen.getByRole('button', { name: /save without ai/i }),
    )
    expect(onSubmit).toHaveBeenCalledWith(
      2,
      'Mock test went badly today',
      [],
      false,
    )
  })

  it('needs the age confirmation before agreeing', async () => {
    const onSubmit = vi.fn()
    const onConsent = vi.fn()
    render(
      <CheckIn
        pending={false}
        error={null}
        aiConsent={false}
        onConsent={onConsent}
        onSubmit={onSubmit}
      />,
    )
    await fill()
    await userEvent.click(
      screen.getByRole('button', { name: /agree and continue/i }),
    )
    expect(onConsent).not.toHaveBeenCalled()
    expect(screen.getByText(/tick this box first/i)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('checkbox', { name: /18 or older/i }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: /agree and continue/i }),
    )
    expect(onConsent).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      2,
      'Mock test went badly today',
      [],
      true,
    )
  })

  it('checks for crisis language before asking for consent', async () => {
    const onCrisis = vi.fn()
    render(
      <CheckIn
        pending={false}
        error={null}
        aiConsent={false}
        onConsent={vi.fn()}
        onCrisis={onCrisis}
        onSubmit={vi.fn()}
      />,
    )
    await fill('I want to die, I cannot do this anymore')
    expect(onCrisis).toHaveBeenCalledTimes(1)
  })
})

describe('CheckIn focus and guards', () => {
  function setup(onSubmit = vi.fn()) {
    render(
      <CheckIn
        pending={false}
        error={null}
        aiConsent={false}
        onConsent={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    return onSubmit
  }

  async function reflect(text = 'Mock test went badly today') {
    await userEvent.click(
      screen.getByRole('radio', { name: /low \(2 of 5\)/i }),
    )
    await userEvent.type(screen.getByLabelText(/what's on your mind/i), text)
    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )
  }

  it('moves focus to the status line after saving without AI', async () => {
    setup()
    await reflect()
    await userEvent.click(
      screen.getByRole('button', { name: /save without ai/i }),
    )
    expect(screen.getByRole('status')).toHaveFocus()
  })

  it('focuses the age checkbox, marked invalid, when agreeing without it', async () => {
    setup()
    await reflect()
    await userEvent.click(
      screen.getByRole('button', { name: /agree and continue/i }),
    )
    const box = screen.getByRole('checkbox', { name: /18 or older/i })
    expect(box).toHaveFocus()
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription(/tick this box/i)
  })

  it('does not save an entry emptied while consent was being asked', async () => {
    const onSubmit = setup()
    await reflect()
    await userEvent.clear(screen.getByLabelText(/what's on your mind/i))
    await userEvent.click(
      screen.getByRole('button', { name: /save without ai/i }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/add a few words/i)).toBeInTheDocument()
  })

  it('shows helplines next to an AI error', () => {
    render(
      <CheckIn
        pending={false}
        error="The companion is briefly overloaded."
        aiConsent
        onConsent={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('link', { name: /14416/ })).toHaveAttribute(
      'href',
      'tel:14416',
    )
  })
})
