import { describe, expect, it } from 'vitest'
import type { SceneId } from '../../lib/sounds'
import { type Pointer, SCENES, type SceneKit } from '.'

/**
 * A stand-in 2D context that records drawing and flags any NaN or infinite
 * number it is given — bad geometry shows up here long before it would
 * flicker on screen.
 */
function fakeContext(
  problems: string[],
  calls: Map<string, number>,
  shape?: { sum: number },
) {
  const state: Record<string | symbol, unknown> = {}
  const check = (name: string, args: unknown[]) => {
    calls.set(name, (calls.get(name) ?? 0) + 1)
    // A fingerprint of everything drawn, to tell whether the pointer changed it.
    if (shape && /To$|^drawImage$|^ellipse$/.test(name)) {
      for (const a of args) if (typeof a === 'number') shape.sum += a
    }
    for (const a of args.flat()) {
      if (typeof a === 'number' && !Number.isFinite(a)) {
        problems.push(`${name}(${args.join(', ')})`)
      }
    }
  }
  const gradient = {
    addColorStop(offset: number) {
      if (!(offset >= 0 && offset <= 1)) problems.push(`colour stop ${offset}`)
    },
  }
  return new Proxy(state, {
    get(_, prop) {
      if (prop in state) return state[prop]
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return (...args: unknown[]) => {
          check(String(prop), args)
          return gradient
        }
      }
      return (...args: unknown[]) => check(String(prop), args)
    },
    set(_, prop, value) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        problems.push(`${String(prop)} = ${value}`)
      }
      state[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

function fakeKit(problems: string[], calls: Map<string, number>): SceneKit {
  return {
    surface: (width, height) => {
      if (!(width > 0 && height > 0))
        problems.push(`surface ${width}x${height}`)
      return {
        canvas: { width, height } as HTMLCanvasElement,
        ctx: fakeContext(problems, calls),
      }
    },
  }
}

const IDS = Object.keys(SCENES) as SceneId[]

const away: Pointer = { x: 0, y: 0, vx: 0, vy: 0, energy: 0, active: false }

/** A pointer sweeping across the lower half of a w × h screen at time t. */
function sweeping(w: number, h: number, t: number): Pointer {
  return {
    x: w * (0.5 + 0.48 * Math.sin(t * 0.9)),
    y: h * (0.62 + 0.3 * Math.sin(t * 1.3)),
    vx: w * 0.43 * Math.cos(t * 0.9),
    vy: h * 0.39 * Math.cos(t * 1.3),
    energy: 1,
    active: true,
  }
}

describe('animated scenes', () => {
  it('has a scene for every sound, plus the park for silence', () => {
    expect([...IDS].sort()).toEqual([
      'mist',
      'ocean',
      'park',
      'rain',
      'twilight',
      'valley',
    ])
  })

  it.each(IDS)('%s: draws clean geometry for minutes, at any size', (id) => {
    const problems: string[] = []
    const calls = new Map<string, number>()
    const kit = fakeKit(problems, calls)
    const scene = SCENES[id](kit)
    const ctx = fakeContext(problems, calls)
    let t = 0
    for (const [w, h, scale] of [
      [1440, 900, 1.5],
      [390, 844, 2],
      [844, 390, 1],
    ]) {
      scene.resize(w, h, scale)
      // Two minutes at 60 fps, plus a long gap (a background tab).
      // with the pointer sweeping through it half the time.
      for (let i = 0; i < 120 * 60; i += 7) {
        t += 7 / 60
        const pointer = i % 1400 < 700 ? sweeping(w, h, t) : away
        scene.frame(ctx, t, 1 / 60, pointer)
      }
      scene.frame(ctx, t + 600, 0.05, away)
      scene.frame(ctx, 14, 0, away) // a still frame
    }
    expect(problems).toEqual([])
    expect(calls.get('drawImage') ?? 0).toBeGreaterThan(100)
  })

  it.each(IDS)('%s: reacts when the pointer moves through it', (id) => {
    const drawn = (moving: boolean) => {
      const shape = { sum: 0 }
      const calls = new Map<string, number>()
      const problems: string[] = []
      const scene = SCENES[id](fakeKit(problems, calls))
      const ctx = fakeContext(problems, calls, shape)
      scene.resize(1440, 900, 1)
      for (let i = 0; i < 240; i++) {
        const t = i / 60
        scene.frame(ctx, t, 1 / 60, moving ? sweeping(1440, 900, t) : away)
      }
      expect(problems).toEqual([])
      return shape.sum
    }
    expect(drawn(true)).not.toBeCloseTo(drawn(false), 0)
  })

  it('draws nothing before it knows its size', () => {
    const problems: string[] = []
    const calls = new Map<string, number>()
    for (const id of IDS) {
      SCENES[id](fakeKit(problems, calls)).frame(
        fakeContext(problems, calls),
        1,
        0.016,
        away,
      )
    }
    expect(calls.get('drawImage') ?? 0).toBe(0)
    expect(problems).toEqual([])
  })
})
