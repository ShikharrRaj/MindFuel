/**
 * Park — the scene when no music is playing: sunset over a park lake. The
 * sun sinks behind a line of trees on the far shore; clouds drift; the lake
 * holds the sky, with the sun's path glittering and gentle ripples; a
 * weeping willow (see willow.ts) sways over a bench and a glowing lamp; two ducks
 * glide across, and now and then a few birds cross the sky.
 */

import { falloff, seededRandom, TAU, wrap } from '../../lib/sceneMath'
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
import { createWillow } from './willow'

const HORIZON = 0.6
const BANK = 0.855
const SUN = { x: 0.8, y: 0.585 }
/** The willow's trunk stands here (fraction of the width), on the bank. */
const WILLOW_X = 0.1
const LAMP = { x: 0.24, y: 0.89 }

export const park: SceneFactory = (kit) => {
  const rand = seededRandom(43)
  const sunGlow = glowSprite(kit, '255,206,140', 128)
  const sparkle = glowSprite(kit, '255,234,190')
  const lampGlow = glowSprite(kit, '255,214,150')
  const cloudLight = puffSprite(kit, '255,196,168')
  const cloudShade = puffSprite(kit, '120,100,146')

  const clouds = [
    { x: 0.2, y: 0.22, w: 0.5, h: 0.04, v: 0.0025 },
    { x: 0.62, y: 0.3, w: 0.55, h: 0.035, v: 0.002 },
    { x: 1.0, y: 0.17, w: 0.45, h: 0.03, v: 0.003 },
    { x: 0.42, y: 0.4, w: 0.4, h: 0.022, v: 0.0035 },
  ]
  const glints = Array.from({ length: 90 }, () => ({
    d: rand(),
    x: rand() - 0.5,
    p: rand() * TAU,
    s: 1.4 + rand() * 2.4,
  }))
  const ripples = Array.from({ length: 70 }, () => ({
    x: rand(),
    d: rand(),
    w: 0.01 + rand() * 0.04,
    p: rand() * TAU,
  }))
  const willow = createWillow(43)
  const rings = createRipples(36)
  const reeds = Array.from({ length: 46 }, () => ({
    x: 0.28 + rand() * 0.72,
    h: 0.025 + rand() * 0.045,
    p: rand() * TAU,
  }))
  const ducks = [
    { x: 0.1, y: 0.75, v: 0.006, s: 1 },
    { x: 0.7, y: 0.69, v: -0.004, s: 0.7 },
  ]
  let flock: { x: number; y: number; age: number } | null = null
  let nextFlock = 6 + rand() * 6

  let W = 0
  let H = 0
  let back: Surface | null = null
  let front: Surface | null = null

  return {
    resize(width, height, scale) {
      W = width
      H = height
      const fine = seededRandom(9)
      back = stillLayer(kit, W, H, scale, (ctx) => {
        fillVertical(ctx, W, 0, H * HORIZON + 1, [
          [0, '#2f3b63'],
          [0.32, '#6f6292'],
          [0.62, '#d0868d'],
          [0.84, '#f0a56e'],
          [1, '#f8d49a'],
        ])
        stamp(ctx, sunGlow, SUN.x * W, SUN.y * H, H * 1.1, H * 0.9, 0.85)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#fff0c6'
        ctx.beginPath()
        ctx.arc(SUN.x * W, SUN.y * H, H * 0.04, 0, TAU)
        ctx.fill()
        // The far shore: a line of rounded park trees, hazy with distance.
        const shore = ridge(ctx, W, H * HORIZON + 1, {
          y: 0.985,
          amplitude: 0.012,
          frequency: 6,
          seed: 7,
          fill: '#4a3f5c',
        })
        ctx.fillStyle = '#4a3f5c'
        ctx.beginPath()
        for (let x = 0; x < W; x += 8 + fine() * 26) {
          const r = H * (0.01 + fine() * 0.026)
          ctx.moveTo(x + r, shore(x))
          ctx.arc(x, shore(x) - r * 0.4, r, 0, TAU)
        }
        ctx.fill()
        // Lamps along the far path.
        for (let i = 0; i < 14; i++) {
          const x = (0.03 + fine() * 0.94) * W
          stamp(ctx, lampGlow, x, H * (HORIZON - 0.004), 12, 12, 0.7)
        }
        ctx.globalAlpha = 1
        // The lake holds the sky, upside down.
        fillVertical(ctx, W, H * HORIZON, H, [
          [0, '#f2c391'],
          [0.12, '#d79085'],
          [0.4, '#8a6b8f'],
          [1, '#3d3f62'],
        ])
        stamp(
          ctx,
          sunGlow,
          SUN.x * W,
          H * (HORIZON + 0.11),
          W * 0.12,
          H * 0.26,
          0.4,
        )
        ctx.globalAlpha = 1
      })
      front = stillLayer(
        kit,
        W,
        H,
        scale,
        (ctx) => {
          // The near bank, the willow's trunk and canopy, a bench, a lamp.
          const g = ctx.createLinearGradient(0, H * BANK, 0, H)
          g.addColorStop(0, '#3a3a33')
          g.addColorStop(1, '#1f201c')
          ridge(ctx, W, H, {
            y: BANK + 0.02,
            amplitude: 0.014,
            frequency: 2.5,
            seed: 19,
            fill: g,
          })
          willow.paintStill(ctx, WILLOW_X * W, H * (BANK + 0.035), H)
          // A bench, facing the lake.
          const bx = W * 0.15
          const by = H * 0.905
          ctx.fillStyle = '#1d1c19'
          ctx.fillRect(bx, by - H * 0.03, H * 0.11, H * 0.006)
          ctx.fillRect(bx, by - H * 0.05, H * 0.11, H * 0.005)
          ctx.fillRect(bx, by - H * 0.04, H * 0.11, H * 0.004)
          ctx.fillRect(bx + H * 0.006, by - H * 0.05, H * 0.004, H * 0.05)
          ctx.fillRect(bx + H * 0.1, by - H * 0.05, H * 0.004, H * 0.05)
          // The lamp post.
          const lx = LAMP.x * W
          ctx.fillRect(lx - 1.5, H * (LAMP.y - 0.13), 3, H * 0.13)
          ctx.fillRect(
            lx - H * 0.008,
            H * (LAMP.y - 0.145),
            H * 0.016,
            H * 0.018,
          )
        },
        H * 0.3,
      )
    },

    frame(ctx, t, dt, pointer) {
      if (!back || !front) return
      drawLayer(ctx, back, W, H)

      for (const c of clouds) {
        const x = wrap(c.x + c.v * t, 1.8) - 0.4
        stamp(ctx, cloudShade, x * W, c.y * H, c.w * W, c.h * H * 2.2, 0.4)
        stamp(
          ctx,
          cloudLight,
          (x + 0.02) * W,
          (c.y + c.h * 0.55) * H,
          c.w * W * 0.8,
          c.h * H,
          0.65,
        )
      }

      // Now and then a few birds cross the sky in a loose V.
      nextFlock -= dt
      if (!flock && nextFlock <= 0)
        flock = { x: -0.1, y: 0.18 + rand() * 0.16, age: 0 }
      if (flock) {
        flock.age += dt
        const fx = (flock.x + flock.age * 0.03) * W
        if (fx > W * 1.15) {
          flock = null
          nextFlock = 14 + rand() * 12
        } else {
          ctx.globalAlpha = 0.6
          ctx.strokeStyle = '#3a3048'
          ctx.lineWidth = 1.3
          ctx.lineCap = 'round'
          for (let i = 0; i < 5; i++) {
            const side = i % 2 === 0 ? 1 : -1
            const x = fx - Math.ceil(i / 2) * 18
            const y = flock.y * H + side * Math.ceil(i / 2) * 9
            const flap = Math.sin(t * 3 + i)
            ctx.beginPath()
            ctx.moveTo(x - 5, y + flap * 2)
            ctx.quadraticCurveTo(x - 2.5, y - 2.5, x, y)
            ctx.quadraticCurveTo(x + 2.5, y - 2.5, x + 5, y + flap * 2)
            ctx.stroke()
          }
        }
      }

      // Ripples: short strokes that shimmer and drift on the lake.
      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgb(255,222,194)'
      ctx.lineWidth = 1.1
      for (const r of ripples) {
        const y = H * (HORIZON + 0.006 + (BANK - HORIZON) * r.d ** 1.5)
        const x = wrap(r.x + t * 0.002 * (1 + r.d), 1) * W
        const half = r.w * W * (0.5 + r.d)
        ctx.globalAlpha =
          Math.max(0, Math.sin(t * 0.6 + r.p)) ** 2 * (0.15 + 0.3 * r.d)
        ctx.beginPath()
        ctx.moveTo(x - half, y)
        ctx.lineTo(x + half, y)
        ctx.stroke()
      }

      for (const g of glints) {
        const y = H * (HORIZON + 0.004 + (BANK - HORIZON) * g.d ** 1.6)
        const spread = (0.01 + 0.06 * g.d ** 1.2) * W
        const a = Math.max(0, Math.sin(t * (1.4 + 2.2 * g.d) + g.p)) ** 3
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

      // The pointer leaves rings on the lake as it passes over the water.
      rings.follow(pointer, H * (HORIZON + 0.01), H * BANK)
      rings.draw(ctx, dt, '255,226,200', 0.45)

      // Ducks gliding, each with a fading V of wake behind it.
      for (const d of ducks) {
        const x = (wrap(d.x + d.v * t, 1.3) - 0.15) * W
        const y = d.y * H + Math.sin(t * 1.2 + d.x * 9) * 0.8
        const s = H * 0.012 * d.s
        const dir = Math.sign(d.v)
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = 'rgb(255,226,200)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x - dir * s * 1.2, y + s * 0.5)
        ctx.lineTo(x - dir * s * 7, y + s * 0.5 - s * 1.6)
        ctx.moveTo(x - dir * s * 1.2, y + s * 0.5)
        ctx.lineTo(x - dir * s * 7, y + s * 0.5 + s * 1.6)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillStyle = '#2b2733'
        ctx.beginPath()
        ctx.ellipse(x, y, s * 1.5, s * 0.6, 0, 0, TAU)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x + dir * s * 1.1, y - s * 0.75, s * 0.42, 0, TAU)
        ctx.fill()
      }

      drawLayer(ctx, front, W, H)

      // Reeds along the near edge of the water.
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#2a2c24'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      for (const r of reeds) {
        const x = r.x * W
        const base = H * (BANK + 0.018)
        const len = r.h * H
        // Reeds lean away from a pointer passing close by.
        const near = pointer.active
          ? falloff(pointer.x - x, pointer.y - (base - len * 0.6), H * 0.07)
          : 0
        const sway =
          Math.sin(t * 0.9 + r.p) * len * 0.12 +
          Math.sign(x - pointer.x) *
            near *
            len *
            0.5 *
            (0.35 + 0.65 * pointer.energy)
        ctx.moveTo(x, base)
        ctx.quadraticCurveTo(
          x + sway * 0.4,
          base - len * 0.6,
          x + sway,
          base - len,
        )
      }
      ctx.stroke()

      willow.draw(ctx, WILLOW_X * W, H * (BANK + 0.035), H, t, dt, pointer)

      // The lamp glows a little brighter as the pointer comes near.
      const lampY = H * (LAMP.y - 0.136)
      const warmth = pointer.active
        ? falloff(pointer.x - LAMP.x * W, pointer.y - lampY, H * 0.2)
        : 0
      const glow = (0.85 + 0.15 * Math.sin(t * 0.7)) * (1 + warmth * 0.6)
      stamp(
        ctx,
        lampGlow,
        LAMP.x * W,
        lampY,
        90 * glow,
        90 * glow,
        0.55 + warmth * 0.35,
      )
      ctx.globalAlpha = 1
    },
  }
}
