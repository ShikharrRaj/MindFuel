/**
 * Ripples — expanding, fading rings on water: raindrops landing, or the
 * pointer trailing across a lake. A fixed pool, recycled in place, so
 * spawning many costs nothing extra.
 */

import type { Ctx, Pointer } from './types'

const LIFE = 1.6

export function createRipples(max: number) {
  const rings = Array.from({ length: max }, () => ({
    x: 0,
    y: 0,
    age: LIFE,
    size: 1,
  }))
  let cursor = 0
  let lastX = -1e9
  let lastY = -1e9

  function spawn(x: number, y: number, size: number) {
    const ring = rings[cursor]
    cursor = (cursor + 1) % max
    ring.x = x
    ring.y = y
    ring.size = size
    ring.age = 0
  }

  return {
    spawn,

    /**
     * Rings in the pointer's wake while it moves over the water between
     * `top` and `bottom` (CSS px): one every ~22px of travel.
     */
    follow(pointer: Pointer, top: number, bottom: number) {
      if (!pointer.active || pointer.energy < 0.05) return
      if (pointer.y < top || pointer.y > bottom) return
      const moved = Math.hypot(pointer.x - lastX, pointer.y - lastY)
      if (moved < 22) return
      lastX = pointer.x
      lastY = pointer.y
      const depth = (pointer.y - top) / Math.max(1, bottom - top)
      spawn(pointer.x, pointer.y, 0.8 + depth * 1.6)
    },

    /** Age and draw the rings. */
    draw(ctx: Ctx, dt: number, rgb: string, alpha = 0.5) {
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgb(${rgb})`
      for (const r of rings) {
        if (r.age >= LIFE) continue
        r.age += dt
        const k = Math.min(1, r.age / LIFE)
        const rx = (3 + 20 * k) * r.size
        ctx.globalAlpha = (1 - k) * alpha
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, rx, rx * 0.26, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
  }
}
