import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getActivity } from './lib/activities'
import { APP_TITLE } from './lib/routes'
import { DEFAULT_AMBIENT } from './lib/sounds'
import {
  saveAmbient,
  saveConsent,
  saveEntries,
  saveProfile,
} from './lib/storage'
import { FakeAudioContext } from './test/fakeAudio'

describe('App wiring', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
  })

  it('opens the Calm and Focus tabs (lazy-loaded)', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Calm' }))
    expect(
      await screen.findByRole('heading', { name: /how are you right now/i }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'My plan' }))
    expect(
      screen.getByRole('heading', { name: /my plan for hard moments/i }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Focus' }))
    expect(
      await screen.findByRole('heading', { name: /study in blocks/i }),
    ).toBeInTheDocument()
  })

  it('opens the SOS overlay from the header, before or after onboarding', async () => {
    localStorage.clear()
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /calm now/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: /close calm now/i }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('serves the parent guide at #for-parents', async () => {
    window.history.replaceState(null, '', '/#for-parents')
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: /supporting your child/i }),
    ).toBeInTheDocument()
  })

  it('carries a recent crisis check-in into the Calm tab', async () => {
    saveEntries([
      {
        id: '1',
        createdAtISO: new Date().toISOString(),
        mood: 1,
        text: 'I want to die, I cannot do this anymore',
        tags: [],
      },
    ])
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Calm' }))
    expect(
      screen.getByRole('heading', {
        name: /you don't have to carry this alone/i,
      }),
    ).toBeInTheDocument()
  })
})

describe('App: legal pages, consent and crisis carry-over', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['#privacy', /privacy policy/i],
    ['#terms', /terms of use/i],
  ])(
    'serves %s as its own page, with Calm now still available',
    async (hash, name) => {
      window.history.replaceState(null, '', `/${hash}`)
      render(<App />)
      expect(
        await screen.findByRole('heading', { name, level: 1 }),
      ).toHaveFocus()
      expect(
        screen.getByRole('button', { name: /calm now/i }),
      ).toBeInTheDocument()
    },
  )

  it('links the legal pages from the footer', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: /about mindfuel/i })
    expect(within(nav).getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '#privacy',
    )
  })

  it('sends nothing to the AI until the student agrees', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(
      screen.getByRole('radio', { name: /low \(2 of 5\)/i }),
    )
    await userEvent.type(
      screen.getByLabelText(/what's on your mind/i),
      'Mock test went badly',
    )
    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: /save without ai/i }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/nothing was sent to the ai/i)).toBeInTheDocument()

    // The Companion shows the consent notice instead of a message box.
    await userEvent.click(screen.getByRole('tab', { name: 'Companion' }))
    expect(screen.queryByLabelText(/type a message/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /before mindfuel’s ai reads this/i }),
    ).toBeInTheDocument()
  })

  it('keeps helplines up after crisis words in an activity, even after closing it', async () => {
    const activity = getActivity('decatastrophise')!
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Calm' }))
    await userEvent.click(screen.getByRole('button', { name: 'Activities' }))
    await userEvent.click(
      screen.getByRole('button', { name: `Start ${activity.name}` }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.type(
      screen.getByLabelText(/worst that could happen/i),
      'honestly I want to die',
    )
    await userEvent.click(
      screen.getByRole('button', { name: /choose something else/i }),
    )
    expect(
      screen.getByRole('heading', {
        name: /you don't have to carry this alone/i,
      }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Check in' }))
    expect(
      screen.getByRole('heading', {
        name: /you don't have to carry this alone/i,
      }),
    ).toBeInTheDocument()
  })
})

describe('App: review fixes', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    saveProfile({ exam: 'JEE', examDateISO: '2027-01-22' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps a half-written check-in while a legal page is open, and returns focus', async () => {
    render(<App />)
    await userEvent.type(
      screen.getByLabelText(/what's on your mind/i),
      'half a thought',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Privacy' }))
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(
      await screen.findByRole('heading', { name: /privacy policy/i, level: 1 }),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /back to mindfuel/i }),
    )
    expect(screen.getByLabelText(/what's on your mind/i)).toHaveValue(
      'half a thought',
    )
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Check in' })).toHaveFocus(),
    )
  })

  it('"Skip to content" does not leave a standalone page', async () => {
    window.history.replaceState(null, '', '/#terms')
    render(<App />)
    await screen.findByRole('heading', { name: /terms of use/i, level: 1 })
    await userEvent.click(
      screen.getByRole('link', { name: /skip to content/i }),
    )
    expect(
      screen.getByRole('heading', { name: /terms of use/i, level: 1 }),
    ).toBeInTheDocument()
    expect(document.getElementById('main')).toHaveFocus()
  })

  it('never writes an entry back after "Delete my data" during a reflection', async () => {
    saveConsent()
    let finish: (r: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            finish = resolve
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          }),
      ),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await userEvent.click(
      screen.getByRole('radio', { name: /low \(2 of 5\)/i }),
    )
    await userEvent.type(
      screen.getByLabelText(/what's on your mind/i),
      'private words',
    )
    await userEvent.click(
      screen.getByRole('button', { name: /reflect with mindfuel/i }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: /delete my data/i }),
    )
    finish(Response.json({ analysis: {} }))
    await new Promise((r) => setTimeout(r, 0))

    expect(localStorage.getItem('mindfuel.entries.v1')).toBeNull()
    const all: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('mindfuel.')) all.push(key)
    }
    expect(all).toEqual([])
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /your private exam-wellness/i }),
      ).toHaveFocus(),
    )
  })
})

describe('App: a calm arrival and a timer that follows you', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    saveProfile({ name: 'Asha', exam: 'JEE', examDateISO: '2027-01-22' })
  })

  it('greets the student by name', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /^(good (morning|afternoon|evening)|still awake), asha\??$/i,
      }),
    ).toBeInTheDocument()
  })

  it('plays soft music by default from the first tap, and says so', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    render(<App />)
    const music = () => screen.getByRole('button', { name: /^music/i })
    // Nothing plays until the student does something (browsers insist).
    expect(music()).toHaveAccessibleName('Music (off)')
    expect(
      screen.queryByRole('region', { name: /calming music/i }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Calm' }))
    expect(music()).toHaveAccessibleName('Music (Sunset lake playing)')
    expect(
      screen.getByText(/soft music is playing: sunset lake/i),
    ).toBeInTheDocument()
    expect(document.documentElement.dataset.scene).toBe('park')
    vi.unstubAllGlobals()
  })

  it('with autoplay off, offers calming music on entry, then gets out of the way', async () => {
    saveAmbient({ ...DEFAULT_AMBIENT, autoplay: false })
    // Audio "supported"; "Not now" never starts playback.
    vi.stubGlobal('AudioContext', class {})
    render(<App />)
    const invite = screen.getByRole('region', { name: /calming music/i })
    expect(
      within(invite).getByRole('button', { name: 'Play sunset lake' }),
    ).toBeInTheDocument()
    await userEvent.click(
      within(invite).getByRole('button', { name: 'Not now' }),
    )
    expect(
      screen.queryByRole('region', { name: /calming music/i }),
    ).not.toBeInTheDocument()
    // Focus lands on the header's Music button, where music can be found later.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^music/i })).toHaveFocus(),
    )
    vi.unstubAllGlobals()
  })

  it('shows a floating timer on other tabs and the countdown in the tab title', async () => {
    const timer = () =>
      screen.queryByRole('complementary', { name: /focus timer/i })
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Focus' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focus' }),
    )
    expect(document.title).toMatch(/^2[45]:\d\d · Focus · MindFuel$/)
    // Not while the Focus panel itself is in view.
    expect(timer()).not.toBeInTheDocument()

    // On a laptop-sized screen it starts as a small pill in the margin.
    await userEvent.click(screen.getByRole('tab', { name: 'Check in' }))
    // Its name starts with the time it shows (WCAG 2.5.3 label in name).
    const pill = within(timer()!).getByRole('button', {
      name: /^2[45]:\d\d\s+left · focus\. show focus timer$/i,
    })
    await userEvent.click(pill)
    const dock = timer()!
    expect(
      within(dock).getByRole('button', { name: 'Hide focus timer' }),
    ).toHaveFocus()

    // Pausing straight away still counts as paused, not "not started".
    await userEvent.click(within(dock).getByRole('button', { name: 'Pause' }))
    expect(
      within(dock).getByRole('button', { name: 'Resume' }),
    ).toBeInTheDocument()
    expect(document.title).toMatch(/^Paused 2[45]:\d\d · Focus · MindFuel$/)

    // Tuck it away again; focus follows to the pill.
    await userEvent.click(
      within(dock).getByRole('button', { name: 'Hide focus timer' }),
    )
    const again = screen.getByRole('button', { name: /show focus timer/i })
    expect(again).toHaveFocus()
    await userEvent.click(again)

    await userEvent.click(screen.getByRole('button', { name: 'Open Focus' }))
    expect(screen.getByRole('tab', { name: 'Focus' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(timer()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(document.title).not.toMatch(/Focus · MindFuel/)
  })
})

describe('App: review regressions (music, timer, title, SOS)', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    document.title = APP_TITLE
    saveProfile({ name: 'Asha', exam: 'JEE', examDateISO: '2027-01-22' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
    delete document.documentElement.dataset.scene
  })

  it('shows the park at rest, the music’s scene while it plays, and can turn it off', async () => {
    saveAmbient({ ...DEFAULT_AMBIENT, autoplay: false })
    vi.stubGlobal('AudioContext', FakeAudioContext)
    render(<App />)
    // With no music playing: a sunset over the park lake (lazy-loaded).
    expect(document.documentElement.dataset.scene).toBe('park')
    await waitFor(() =>
      expect(document.querySelector('.scenery .scene')).not.toBeNull(),
    )

    await userEvent.click(screen.getByRole('button', { name: /^music/i }))
    const menu = screen.getByRole('group', { name: 'Calming music' })
    expect(within(menu).getByText(/sunset by the lake/i)).toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Gentle keys' }),
    )
    await waitFor(() =>
      expect(document.documentElement.dataset.scene).toBe('valley'),
    )
    expect(within(menu).getByText(/valley of flowers/i)).toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Ocean waves' }),
    )
    await waitFor(() =>
      expect(document.documentElement.dataset.scene).toBe('ocean'),
    )
    await userEvent.click(
      within(menu).getByRole('checkbox', { name: /show a calming scene/i }),
    )
    expect(document.documentElement.dataset.scene).toBeUndefined()
  })

  it('does not offer music again after it was played and stopped from the menu', async () => {
    saveAmbient({ ...DEFAULT_AMBIENT, autoplay: false })
    vi.stubGlobal('AudioContext', FakeAudioContext)
    render(<App />)
    expect(screen.getByRole('region', { name: /calming music/i })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /^music/i }))
    const menu = screen.getByRole('group', { name: 'Calming music' })
    await userEvent.click(within(menu).getByRole('button', { name: 'Rain' }))
    expect(
      screen.queryByRole('region', { name: /calming music/i }),
    ).not.toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Stop music' }),
    )
    expect(
      screen.queryByRole('region', { name: /calming music/i }),
    ).not.toBeInTheDocument()
  })

  it('"Delete my data" also ends the focus session and its tab title', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Focus' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focus' }),
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Check in' }))
    expect(document.title).toMatch(/Focus · MindFuel/)

    await userEvent.click(
      screen.getByRole('button', { name: /delete my data/i }),
    )
    expect(document.title).toBe(APP_TITLE)
    expect(
      screen.queryByRole('complementary', { name: /focus timer/i }),
    ).not.toBeInTheDocument()
  })

  it('leaves no stale title after ending a session while a page is open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const pass = (minutes: number) =>
      act(() => {
        vi.setSystemTime(Date.now() + minutes * 60_000)
        vi.advanceTimersByTime(300)
      })
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Focus' }))
    await user.click(await screen.findByRole('button', { name: 'Start focus' }))
    pass(25)
    pass(5)
    expect(document.title).toBe('Ready for block 2 · MindFuel')

    act(() => {
      window.history.replaceState(null, '', '/#privacy')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await screen.findByRole('heading', { name: /privacy policy/i, level: 1 })
    await user.click(screen.getByRole('button', { name: /show focus timer/i }))
    await user.click(screen.getByRole('button', { name: 'Done for now' }))
    expect(document.title).toBe('Privacy policy · MindFuel')
    await user.click(screen.getByRole('button', { name: /back to mindfuel/i }))
    expect(document.title).toBe(APP_TITLE)
  })

  it('closes the pop-out timer when Calm now opens, so it never covers helplines', async () => {
    const pop = Object.assign(new EventTarget(), {
      document: document.implementation.createHTMLDocument(''),
      close: vi.fn(),
      setInterval: window.setInterval.bind(window),
      clearInterval: window.clearInterval.bind(window),
    })
    vi.stubGlobal('documentPictureInPicture', {
      requestWindow: () => Promise.resolve(pop),
    })
    render(<App />)
    await userEvent.click(screen.getByRole('tab', { name: 'Focus' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Pop out timer' }),
    )
    expect(
      await screen.findByRole('button', { name: 'Close pop-out' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /calm now/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(pop.close).toHaveBeenCalled()
  })
})
