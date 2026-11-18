/**
 * Scene maths — pure helpers for the animated backgrounds (device/scenes):
 * seeded randomness (a scene looks the same on every visit), smooth 1-D
 * noise for natural ridgelines, wrapping for drifting things, and the
 * resolution cap that keeps the canvas smooth on any screen.
 */

export const TAU = Math.PI * 2

/** Park–Miller pseudo-random numbers in [0, 1), from a fixed seed. */
export function seededRandom(seed: number): () => number {
  let s = Math.abs(Math.trunc(seed)) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const LATTICE = 256

/** Smooth 1-D value noise in [-1, 1]: continuous, with no sharp corners. */
export function noise1D(seed: number): (x: number) => number {
  const rand = seededRandom(seed)
  const lattice = Float32Array.from({ length: LATTICE }, () => rand() * 2 - 1)
  return (x) => {
    const i = Math.floor(x)
    const f = x - i
    const a = lattice[((i % LATTICE) + LATTICE) % LATTICE]
    const b = lattice[(((i + 1) % LATTICE) + LATTICE) % LATTICE]
    const u = f * f * (3 - 2 * f) // smoothstep
    return a + (b - a) * u
  }
}

/** Layered noise (fractal Brownian motion): big shapes with finer detail. */
export function fbm1D(seed: number, octaves = 4): (x: number) => number {
  const layers = Array.from({ length: octaves }, (_, i) =>
    noise1D(seed + i * 101),
  )
  return (x) => {
    let sum = 0
    let amp = 1
    let freq = 1
    let norm = 0
    for (const n of layers) {
      sum += n(x * freq) * amp
      norm += amp
      amp *= 0.5
      freq *= 2.03
    }
    return sum / norm
  }
}

/** `value` wrapped into [0, size), for things that drift off one edge. */
export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size
}

/**
 * Canvas pixels per CSS pixel: sharp on high-density screens, but capped so
 * a large screen never paints more than `maxPixels` per frame.
 */
export function pixelScale(
  width: number,
  height: number,
  devicePixelRatio: number,
  maxPixels = 3_200_000,
): number {
  if (width <= 0 || height <= 0) return 1
  const fit = Math.sqrt(maxPixels / (width * height))
  return Math.max(0.5, Math.min(devicePixelRatio || 1, 2, fit))
}

/**
 * How strongly something at offset (dx, dy) from the pointer feels it:
 * 1 right under it, easing to 0 at `radius`.
 */
export function falloff(dx: number, dy: number, radius: number): number {
  const d2 = dx * dx + dy * dy
  if (radius <= 0 || d2 >= radius * radius) return 0
  const k = 1 - Math.sqrt(d2) / radius
  return k * k
}

/**
 * One step of a damped spring pulled back to rest (0), pushed by `force`:
 * what makes a leaf swing when brushed, then settle. Updates `pos` and
 * `vel` at index i in place (no allocation, so it is cheap per frame).
 */
export function springStep(
  pos: Float32Array,
  vel: Float32Array,
  i: number,
  force: number,
  dt: number,
  stiffness = 16,
  damping = 4.5,
): void {
  const accel = force - stiffness * pos[i] - damping * vel[i]
  vel[i] += accel * dt
  pos[i] += vel[i] * dt
}
