import { describe, expect, it } from 'vitest'
import {
  falloff,
  fbm1D,
  noise1D,
  pixelScale,
  seededRandom,
  springStep,
  wrap,
} from './sceneMath'

describe('scene maths', () => {
  it('repeats the same random sequence for a seed, within [0, 1)', () => {
    const a = seededRandom(7)
    const b = seededRandom(7)
    const xs = Array.from({ length: 100 }, () => a())
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(seededRandom(0)()).toBeGreaterThanOrEqual(0)
  })

  it('makes smooth noise: bounded, continuous, the same for a seed', () => {
    const n = noise1D(3)
    const f = fbm1D(3)
    for (let x = -20; x < 20; x += 0.01) {
      expect(Math.abs(n(x))).toBeLessThanOrEqual(1)
      expect(Math.abs(f(x))).toBeLessThanOrEqual(1)
      // No jumps between neighbouring samples.
      expect(Math.abs(n(x + 0.001) - n(x))).toBeLessThan(0.01)
    }
    expect(noise1D(3)(4.2)).toBe(n(4.2))
  })

  it('wraps drifting values into range, either way', () => {
    expect(wrap(1.25, 1)).toBeCloseTo(0.25)
    expect(wrap(-0.25, 1)).toBeCloseTo(0.75)
  })

  it('keeps high-density screens sharp but caps the pixels per frame', () => {
    expect(pixelScale(390, 844, 3)).toBe(2)
    expect(pixelScale(1280, 800, 1)).toBe(1)
    const big = pixelScale(2560, 1440, 2)
    expect(2560 * 1440 * big * big).toBeLessThanOrEqual(3_200_000 + 1)
    expect(pixelScale(0, 0, 2)).toBe(1)
    expect(pixelScale(8000, 8000, 1)).toBe(0.5)
  })

  it('feels the pointer most right under it, and not at all past its reach', () => {
    expect(falloff(0, 0, 100)).toBe(1)
    expect(falloff(50, 0, 100)).toBeCloseTo(0.25)
    expect(falloff(100, 0, 100)).toBe(0)
    expect(falloff(0, 300, 100)).toBe(0)
    expect(falloff(0, 0, 0)).toBe(0)
  })

  it('springs: pushed away, then settles back to rest', () => {
    const pos = new Float32Array(1)
    const vel = new Float32Array(1)
    for (let i = 0; i < 30; i++) springStep(pos, vel, 0, 400, 1 / 60)
    expect(pos[0]).toBeGreaterThan(5)
    for (let i = 0; i < 600; i++) springStep(pos, vel, 0, 0, 1 / 60)
    expect(Math.abs(pos[0])).toBeLessThan(0.05)
  })
})
