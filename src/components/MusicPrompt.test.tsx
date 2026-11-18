import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AmbientPlayer } from '../hooks/useAmbientSound'
import { DEFAULT_AMBIENT } from '../lib/sounds'
import MusicPrompt from './MusicPrompt'

function player(patch: Partial<AmbientPlayer['prefs']> = {}): AmbientPlayer {
  return {
    supported: true,
    playing: null,
    played: false,
    prefs: { ...DEFAULT_AMBIENT, ...patch },
    play: vi.fn(),
    playDefault: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    setVolume: vi.fn(),
    setAsk: vi.fn(),
    setAutoplay: vi.fn(),
    setMotion: vi.fn(),
    setScenery: vi.fn(),
    reset: vi.fn(),
  }
}

describe('MusicPrompt', () => {
  it('offers sunset lake first, and plays only when chosen', async () => {
    const ambient = player()
    const onDone = vi.fn()
    render(<MusicPrompt ambient={ambient} onDone={onDone} />)
    expect(
      screen.getByRole('heading', { name: /calming music/i }),
    ).toBeInTheDocument()
    expect(ambient.play).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', { name: 'Play sunset lake' }),
    )
    expect(ambient.play).toHaveBeenCalledWith('lake')
    expect(onDone).toHaveBeenCalled()
  })

  it('welcomes a returning student back with their last sound', async () => {
    const ambient = player({ last: 'rain' })
    render(<MusicPrompt ambient={ambient} onDone={vi.fn()} />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Play rain' }))
    expect(ambient.play).toHaveBeenCalledWith('rain')
  })

  it('plays another sound straight from its chip', async () => {
    const ambient = player()
    render(<MusicPrompt ambient={ambient} onDone={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ocean waves' }))
    expect(ambient.play).toHaveBeenCalledWith('waves')
  })

  it('"Not now" and Escape decline without playing; "Don\'t ask" remembers', async () => {
    const ambient = player()
    const onDone = vi.fn()
    render(<MusicPrompt ambient={ambient} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onDone).toHaveBeenCalledTimes(1)

    screen.getByRole('button', { name: 'Not now' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(onDone).toHaveBeenCalledTimes(2)

    await userEvent.click(
      screen.getByRole('button', { name: /don.t ask me again/i }),
    )
    expect(ambient.setAsk).toHaveBeenCalledWith(false)
    expect(ambient.play).not.toHaveBeenCalled()
  })
})
