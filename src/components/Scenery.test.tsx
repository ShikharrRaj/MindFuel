import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Scenery from './Scenery'

const scenes = (root: HTMLElement) => [...root.querySelectorAll('.scene')]

describe('Scenery', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is decorative: a canvas hidden from assistive technology', () => {
    const { container } = render(<Scenery scene="valley" still={false} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('canvas.scene__canvas')).not.toBeNull()
  })

  it('crossfades to a new scene, then lets the old one go', () => {
    const { container, rerender } = render(
      <Scenery scene="valley" still={false} />,
    )
    rerender(<Scenery scene="ocean" still={false} />)
    const [leaving, entering] = scenes(container)
    expect(leaving).toHaveClass('scene--leaving')
    expect(entering).not.toHaveClass('scene--leaving')
    act(() => vi.advanceTimersByTime(1600))
    expect(scenes(container)).toHaveLength(1)
  })

  it('fades out when the music stops', () => {
    const { container, rerender } = render(<Scenery scene="rain" still />)
    rerender(<Scenery scene={null} still />)
    expect(scenes(container)[0]).toHaveClass('scene--leaving')
    act(() => vi.advanceTimersByTime(1600))
    expect(scenes(container)).toHaveLength(0)
  })
})
