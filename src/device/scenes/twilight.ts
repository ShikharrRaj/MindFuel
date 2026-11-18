/**
 * Twilight — "Tanpura drone": a river of diyas at dusk. Small oil lamps
 * drift downstream, bobbing and flickering, their reflections wavering on the
 * water; a thin crescent moon and the first stars above temples on the far
 * bank; light shimmering where the sky meets the river.
 */

import {
  falloff,
  seededRandom,
  springStep,
  TAU,
  wrap,
} from '../../lib/sceneMath'
import {
  drawLayer,
  fillVertical,
  glowSprite,
  ridge,
  stamp,
  stillLayer,
} from './paint'
import { createRipples } from './ripples'
import type { SceneFactory, Surface } from './types'

const RIVER = 0.63
const MOON = { x: 0.2, y: 0.17 }

/** A temple spire (shikhara) on the far bank. */
function spire(
  ctx: CanvasRenderingContext2D,
  x: number,
  base: number,
  h: number,
): void {
  const w = h * 0.36
  ctx.moveTo(x - w, base)
  ctx.bezierCurveTo(
    x - w * 0.9,
    base - h * 0.55,
    x - w * 0.35,
    base - h * 0.85,
    x,
    base - h,
  )
  ctx.bezierCurveTo(
    x + w * 0.35,
    base - h * 0.85,
    x + w * 0.9,
    base - h * 0.55,
    x + w,
    base,
  )
  ctx.closePath()
}

export const twilight: SceneFactory = (kit) => {
  const rand = seededRandom(31)
  const lamp = glowSprite(kit, '255,206,130')
  const moonGlow = glowSprite(kit, '252,238,214', 128)
  const firefly = glowSprite(kit, '255,222,140')

  const diyas = Array.from({ length: 34 }, () => ({
    x: rand(),
    d: rand(),
    p: rand() * TAU,
  })).sort((a, b) => a.d - b.d)
  const shimmers = Array.from({ length: 46 }, () => ({
    x: rand(),
    y: RIVER + 0.005 + rand() ** 2 * 0.2,
    w: 0.006 + rand() * 0.03,
    p: rand() * TAU,
  }))
  const flies = Array.from({ length: 10 }, () => ({
    x: rand(),
    y: 0.5 + rand() * 0.1,
    p: rand() * TAU,
  }))

  // The pointer nudges lamps aside on the water (they drift back), leaves
  // rings on the river, and draws the fireflies a little closer.
  const nudged = new Float32Array(diyas.length)
  const nudging = new Float32Array(diyas.length)
  const flyX = new Float32Array(flies.length)
  const flyY = new Float32Array(flies.length)
  const rings = createRipples(36)

  let W = 0
  let H = 0
  let back: Surface | null = null

  return {
    resize(width, height, scale) {
      W = width
      H = height
      const fine = seededRandom(77)
      back = stillLayer(kit, W, H, scale, (ctx) => {
        fillVertical(ctx, W, 0, H * RIVER + 1, [
          [0, '#1c1a36'],
          [0.4, '#3c2d52'],
          [0.72, '#7a4a62'],
          [0.9, '#c77b6c'],
          [1, '#eba67e'],
        ])
        for (let i = 0; i < 90; i++) {
          const size = 0.6 + fine() * 1.1
          ctx.fillStyle = `rgba(255,246,232,${0.2 + fine() * 0.6})`
          ctx.fillRect(fine() * W, fine() ** 1.4 * H * 0.35, size, size)
        }
        // A thin crescent: a disc with an offset disc cut away, cut on its
        // own sprite so the sky behind it is untouched.
        const r = H * 0.028
        stamp(ctx, moonGlow, MOON.x * W, MOON.y * H, r * 9, r * 9, 0.35)
        const size = Math.ceil(r * 2 * scale) + 2
        const moon = kit.surface(size, size)
        const c = size / 2
        const rr = r * scale
        moon.ctx.fillStyle = '#fbf1de'
        moon.ctx.beginPath()
        moon.ctx.arc(c, c, rr, 0, TAU)
        moon.ctx.fill()
        moon.ctx.globalCompositeOperation = 'destination-out'
        moon.ctx.beginPath()
        moon.ctx.arc(c + rr * 0.42, c - rr * 0.3, rr * 0.92, 0, TAU)
        moon.ctx.fill()
        stamp(ctx, moon, MOON.x * W, MOON.y * H, size / scale, size / scale, 1)
        ctx.globalAlpha = 1
        // The far bank, its temples and their lamps.
        const bank = ridge(ctx, W, H * RIVER + 1, {
          y: 0.965,
          amplitude: 0.025,
          frequency: 7,
          seed: 4,
          fill: '#2c2238',
        })
        ctx.fillStyle = '#2c2238'
        ctx.beginPath()
        for (const [x, h] of [
          [0.36, 0.06],
          [0.41, 0.085],
          [0.47, 0.11],
          [0.53, 0.08],
          [0.58, 0.065],
        ]) {
          spire(ctx, x * W, bank(x * W) + 3, h * H)
        }
        ctx.fill()
        for (let i = 0; i < 26; i++) {
          const x = (0.04 + fine() * 0.92) * W
          const y = bank(x) + H * 0.012
          stamp(ctx, lamp, x, y, 12, 12, 0.6)
        }
        ctx.globalAlpha = 1
        fillVertical(ctx, W, H * RIVER, H, [
          [0, '#c98071'],
          [0.16, '#7d4c62'],
          [0.6, '#3a2a45'],
          [1, '#1f1729'],
        ])
        // The moon's path on the water.
        stamp(
          ctx,
          moonGlow,
          MOON.x * W,
          H * (RIVER + 0.12),
          r * 3,
          H * 0.24,
          0.3,
        )
        ctx.globalAlpha = 1
      })
    },

    frame(ctx, t, dt, pointer) {
      if (!back) return
      drawLayer(ctx, back, W, H)

      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgb(255,222,186)'
      ctx.lineWidth = 1.2
      for (const s of shimmers) {
        const a = Math.max(0, Math.sin(t * 0.8 + s.p)) ** 2 * 0.55
        const x = (s.x + Math.sin(t * 0.3 + s.p) * 0.004) * W
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.moveTo(x - s.w * W, s.y * H)
        ctx.lineTo(x + s.w * W, s.y * H)
        ctx.stroke()
      }

      rings.follow(pointer, H * (RIVER + 0.01), H)
      rings.draw(ctx, dt, '255,214,170', 0.4)

      diyas.forEach((d, i) => {
        const size = 3 + d.d * 11
        const restX = (wrap(d.x + (0.004 + d.d * 0.01) * t, 1.2) - 0.1) * W
        const restY = H * (RIVER + 0.015 + 0.33 * d.d ** 1.5)
        let force = 0
        if (pointer.active) {
          const near = falloff(pointer.x - restX, pointer.y - restY, size * 7)
          force =
            (Math.sign(restX - pointer.x) * 240 + pointer.vx * 0.8) *
            near *
            (0.3 + 0.7 * pointer.energy)
        }
        springStep(nudged, nudging, i, force, dt, 6, 2.6)
        const x = restX + nudged[i]
        // Bobbing, and a little more while it is being pushed about.
        const y =
          restY +
          Math.sin(t * 0.9 + d.p) * H * 0.002 * (1 + 2 * d.d) +
          Math.sin(t * 6 + d.p) * Math.min(4, Math.abs(nudging[i]) * 0.02)
        const flicker =
          0.85 + 0.15 * Math.sin(t * 8.7 + d.p) * Math.sin(t * 5.3 + d.p * 2)
        // Reflection: broken, wavering strokes of light below the lamp.
        ctx.strokeStyle = 'rgb(255,206,130)'
        for (let j = 0; j < 3; j++) {
          const wob = Math.sin(t * 2.4 + d.p + j * 1.3) * size * 0.25
          ctx.globalAlpha = (0.42 - j * 0.12) * flicker
          ctx.lineWidth = size * (0.32 - j * 0.07)
          ctx.beginPath()
          ctx.moveTo(x - size * 0.3 + wob, y + size * (0.7 + j * 0.65))
          ctx.lineTo(x + size * 0.3 + wob, y + size * (0.7 + j * 0.65))
          ctx.stroke()
        }
        stamp(
          ctx,
          lamp,
          x,
          y - size * 0.35,
          size * 6 * flicker,
          size * 6 * flicker,
          0.6,
        )
        ctx.globalAlpha = 1
        ctx.fillStyle = '#9c5636'
        ctx.beginPath()
        ctx.ellipse(x, y, size * 0.55, size * 0.2, 0, 0, Math.PI)
        ctx.fill()
        ctx.fillStyle = '#ffe8ac'
        const fh = size * 0.75 * flicker
        ctx.beginPath()
        ctx.moveTo(x, y - fh)
        ctx.quadraticCurveTo(x + size * 0.22, y - fh * 0.35, x, y - size * 0.05)
        ctx.quadraticCurveTo(x - size * 0.22, y - fh * 0.35, x, y - fh)
        ctx.fill()
      })

      flies.forEach((f, i) => {
        const baseX = (f.x + Math.sin(t * 0.13 + f.p) * 0.03) * W
        const baseY = (f.y + Math.cos(t * 0.17 + f.p) * 0.02) * H
        const near = pointer.active
          ? falloff(pointer.x - baseX, pointer.y - baseY, H * 0.3)
          : 0
        const ease = Math.min(1, dt * 1.2)
        flyX[i] += ((pointer.x - baseX) * 0.33 * near - flyX[i]) * ease
        flyY[i] += ((pointer.y - baseY) * 0.33 * near - flyY[i]) * ease
        const pulse = (0.5 + 0.5 * Math.sin(t * 1.4 + f.p)) ** 2
        stamp(
          ctx,
          firefly,
          baseX + flyX[i],
          baseY + flyY[i],
          14,
          14,
          0.1 + pulse * 0.8,
        )
      })
      ctx.globalAlpha = 1
    },
  }
}
