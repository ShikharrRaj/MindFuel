/**
 * Ocean — "Ocean waves": a golden-hour sea. Wave crests roll towards the
 * shore in perspective, the low sun's path glitters on the water, clouds and
 * a few gulls drift by, and the foam washes up the sand and back about every
 * nine seconds, the same rhythm as the waves in the sound.
 */

import { seededRandom, TAU, wrap } from '../../lib/sceneMath'
import {
  drawLayer,
  fillVertical,
  glowSprite,
  puffSprite,
  ridge,
  stamp,
  stillLayer,
} from './paint'
import { createRipples } from './ripples'
import type { SceneFactory, Surface } from './types'

const HORIZON = 0.58
const SHORE = 0.86
/** One swell, in step with the ~0.11 Hz swell of the sound. */
const SURF = 9.1
const SUN = { x: 0.18, y: 0.555 }
const CRESTS = 16

export const ocean: SceneFactory = (kit) => {
  const rand = seededRandom(5)
  const sparkle = glowSprite(kit, '255,236,192')
  const cloudLight = puffSprite(kit, '255,206,170')
  const cloudShade = puffSprite(kit, '112,96,138')
  const sunGlow = glowSprite(kit, '255,214,150', 128)

  const glints = Array.from({ length: 120 }, () => ({
    d: rand(),
    x: rand() - 0.5,
    p: rand() * TAU,
    s: 1.4 + rand() * 2.6,
  }))
  const clouds = [
    { x: 0.25, y: 0.3, w: 0.55, h: 0.035, v: 0.003 },
    { x: 0.72, y: 0.23, w: 0.6, h: 0.03, v: 0.002 },
    { x: 1.05, y: 0.37, w: 0.42, h: 0.024, v: 0.004 },
    { x: 0.5, y: 0.44, w: 0.48, h: 0.02, v: 0.0025 },
  ]
  const gulls = Array.from({ length: 3 }, () => ({
    x: rand(),
    y: 0.22 + rand() * 0.16,
    v: 0.007 + rand() * 0.006,
    p: rand() * TAU,
    s: 5 + rand() * 4,
  }))
  const crests = Array.from({ length: CRESTS }, (_, i) => ({
    k: i / (CRESTS - 1),
    phase: rand() * TAU,
    dash: 0.4 + rand() * 0.5,
  }))

  // The pointer trails rings across the water and makes the glitter flare.
  const rings = createRipples(36)
  // A pool of glints that sparkle under the pointer, wherever it is.
  const sparks = Array.from({ length: 24 }, () => ({
    dx: (rand() - 0.5) * 2,
    dy: (rand() - 0.5) * 2,
    p: rand() * TAU,
  }))

  let W = 0
  let H = 0
  let back: Surface | null = null
  let sand: Surface | null = null

  function shoreLine(x: number, t: number, reach: number): number {
    return (
      H * (SHORE - 0.014 + reach * 0.065) +
      Math.sin((x / W) * 11 + t * 0.6) * H * 0.004 +
      Math.sin((x / W) * 29 - t * 0.9) * H * 0.0018
    )
  }

  return {
    resize(width, height, scale) {
      W = width
      H = height
      back = stillLayer(kit, W, H, scale, (ctx) => {
        fillVertical(ctx, W, 0, H * HORIZON + 1, [
          [0, '#25304f'],
          [0.3, '#4c4a75'],
          [0.62, '#a8708a'],
          [0.86, '#e9a17c'],
          [1, '#f7cf95'],
        ])
        stamp(ctx, sunGlow, SUN.x * W, SUN.y * H, H * 0.9, H * 0.9, 0.75)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#fff1cc'
        ctx.beginPath()
        ctx.arc(SUN.x * W, SUN.y * H, H * 0.036, 0, TAU)
        ctx.fill()
        // A far headland on the right.
        ctx.save()
        ctx.beginPath()
        ctx.rect(W * 0.62, 0, W * 0.38, H * HORIZON + 1)
        ctx.clip()
        ridge(ctx, W, H * HORIZON + 1, {
          y: 0.95,
          amplitude: 0.06,
          frequency: 3,
          seed: 14,
          fill: '#4a3d5c',
        })
        ctx.restore()
        fillVertical(ctx, W, H * HORIZON, H, [
          [0, '#d79a82'],
          [0.12, '#a07589'],
          [0.45, '#5b5b7c'],
          [1, '#343e5d'],
        ])
        // The sun's warm column on the water.
        stamp(
          ctx,
          sunGlow,
          SUN.x * W,
          H * (HORIZON + (SHORE - HORIZON) * 0.45),
          W * 0.16,
          H * (SHORE - HORIZON) * 1.1,
          0.35,
        )
      })
      sand = stillLayer(
        kit,
        W,
        H,
        scale,
        (ctx) => {
          const g = ctx.createLinearGradient(0, H * SHORE, 0, H)
          g.addColorStop(0, '#80604f')
          g.addColorStop(1, '#3f302a')
          ridge(ctx, W, H, {
            y: SHORE + 0.01,
            amplitude: 0.008,
            frequency: 2,
            seed: 8,
            fill: g,
          })
        },
        H * (SHORE - 0.01),
      )
    },

    frame(ctx, t, dt, pointer) {
      if (!back || !sand) return
      drawLayer(ctx, back, W, H)

      for (const c of clouds) {
        const x = wrap(c.x + c.v * t, 1.8) - 0.4
        stamp(ctx, cloudShade, x * W, c.y * H, c.w * W, c.h * H * 2.2, 0.45)
        stamp(
          ctx,
          cloudLight,
          (x + 0.02) * W,
          (c.y + c.h * 0.5) * H,
          c.w * W * 0.8,
          c.h * H,
          0.6,
        )
      }

      ctx.strokeStyle = '#3b3043'
      ctx.lineWidth = 1.4
      ctx.lineCap = 'round'
      for (const g of gulls) {
        const x = (wrap(g.x + g.v * t, 1.3) - 0.15) * W
        const y = (g.y + Math.sin(t * 0.3 + g.p) * 0.01) * H
        const flap = Math.sin(t * 3.2 + g.p)
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.moveTo(x - g.s, y + flap * g.s * 0.35)
        ctx.quadraticCurveTo(x - g.s * 0.5, y - g.s * 0.45, x, y)
        ctx.quadraticCurveTo(
          x + g.s * 0.5,
          y - g.s * 0.45,
          x + g.s,
          y + flap * g.s * 0.35,
        )
        ctx.stroke()
      }

      // Crests: broken, moving highlights, larger and faster nearer the shore.
      const step = Math.max(4, W / 180)
      for (const c of crests) {
        const y0 = H * (HORIZON + (SHORE - HORIZON) * c.k ** 1.7)
        const amp = H * (0.0012 + 0.008 * c.k ** 1.5)
        const wave = W * (0.05 + 0.15 * c.k)
        const speed = 0.25 + 0.6 * c.k
        ctx.globalAlpha = 1
        ctx.strokeStyle = `rgba(250,222,198,${0.1 + 0.5 * c.k})`
        ctx.lineWidth = 0.6 + 1.9 * c.k
        ctx.setLineDash([wave * c.dash, wave * (1 - c.dash) + 8])
        ctx.lineDashOffset = -t * speed * wave * 0.25
        ctx.beginPath()
        for (let x = -step; x <= W + step; x += step) {
          const y =
            y0 +
            amp * Math.sin((x / wave) * TAU - t * speed + c.phase) +
            amp *
              0.45 *
              Math.sin((x / (wave * 0.47)) * TAU + t * speed * 1.3 + c.phase)
          if (x === -step) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.setLineDash([])

      for (const g of glints) {
        const y = H * (HORIZON + 0.004 + (SHORE - HORIZON) * g.d ** 1.6)
        const spread = (0.012 + 0.09 * g.d ** 1.2) * W
        const a = Math.max(0, Math.sin(t * (1.6 + 2.6 * g.d) + g.p)) ** 3
        const size = g.s * (0.6 + g.d) * 3
        stamp(
          ctx,
          sparkle,
          SUN.x * W + g.x * spread * 2,
          y,
          size * 1.6,
          size * 0.7,
          a,
        )
      }

      // Under the pointer the water catches the light, and rings follow it.
      const overSea =
        pointer.active && pointer.y > H * HORIZON && pointer.y < H * SHORE
      if (overSea && pointer.energy > 0.02) {
        const depth = (pointer.y - H * HORIZON) / (H * (SHORE - HORIZON))
        const spread = H * (0.02 + depth * 0.05)
        for (const s of sparks) {
          const a = Math.max(0, Math.sin(t * 5 + s.p)) ** 3 * pointer.energy
          const size = 6 + depth * 8
          stamp(
            ctx,
            sparkle,
            pointer.x + s.dx * spread * 1.6,
            pointer.y + s.dy * spread * 0.35,
            size * 1.6,
            size * 0.7,
            a,
          )
        }
      }
      rings.follow(pointer, H * (HORIZON + 0.01), H * SHORE)
      rings.draw(ctx, dt, '250,224,202', 0.4)
      ctx.globalAlpha = 1

      drawLayer(ctx, sand, W, H)

      // The wash: a sheet of water and its foam edge, in and out.
      const reach = 0.5 - 0.5 * Math.cos((TAU * wrap(t, SURF)) / SURF)
      const top = H * (SHORE - 0.02)
      ctx.beginPath()
      ctx.moveTo(-step, top)
      for (let x = -step; x <= W + step; x += step)
        ctx.lineTo(x, shoreLine(x, t, reach))
      ctx.lineTo(W + step, top)
      ctx.closePath()
      ctx.fillStyle = `rgba(176,170,188,${0.28 + reach * 0.18})`
      ctx.fill()
      ctx.beginPath()
      for (let x = -step; x <= W + step; x += step) {
        const y = shoreLine(x, t, reach)
        if (x === -step) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(255,246,236,0.25)'
      ctx.lineWidth = 7
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,246,236,0.85)'
      ctx.lineWidth = 2.4
      ctx.stroke()
      ctx.globalAlpha = 1
    },
  }
}
