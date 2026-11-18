/**
 * Rain — "Rain": a rainy dusk over a lake in the hills. Rain falls in three
 * depths, each drop that lands rings the water, fog drifts along the ridges,
 * and a few warm windows on the far shore shine back from the lake. The
 * rain bends around the pointer, like an umbrella, and the lake ripples
 * where it passes.
 */

import { falloff, seededRandom, wrap } from '../../lib/sceneMath'
import {
  drawLayer,
  fillVertical,
  glowSprite,
  mistBand,
  puffSprite,
  ridge,
  stamp,
  stillLayer,
} from './paint'
import { createRipples } from './ripples'
import type { SceneFactory, Surface } from './types'

const LAKE = 0.77
const WIND = 0.18

interface Drop {
  x: number
  y: number
}

export const rain: SceneFactory = (kit) => {
  const rand = seededRandom(17)
  const warm = glowSprite(kit, '255,204,136')
  const fog = puffSprite(kit, '160,172,188')

  const sheets = [
    { count: 260, len: 0.012, speed: 0.5, alpha: 0.16, width: 0.7 },
    { count: 170, len: 0.022, speed: 0.85, alpha: 0.24, width: 1 },
    { count: 70, len: 0.04, speed: 1.45, alpha: 0.32, width: 1.4 },
  ].map((sheet) => ({
    ...sheet,
    drops: Array.from(
      { length: sheet.count },
      (): Drop => ({ x: rand(), y: rand() }),
    ),
  }))
  const fogs = [
    { x: 0.2, y: 0.6, w: 0.9, h: 0.07, v: 0.004, a: 0.28 },
    { x: 0.75, y: 0.68, w: 0.8, h: 0.06, v: -0.003, a: 0.22 },
  ]
  const windows = Array.from({ length: 9 }, () => ({
    x: 0.05 + rand() * 0.9,
    y: 0.7 + rand() * 0.05,
    r: 1.4 + rand() * 1.6,
  }))
  // Rings on the lake: raindrops landing, and the pointer passing over.
  const rings = createRipples(56)
  let spawn = 0

  let W = 0
  let H = 0
  let back: Surface | null = null

  return {
    resize(width, height, scale) {
      W = width
      H = height
      back = stillLayer(kit, W, H, scale, (ctx) => {
        fillVertical(ctx, W, 0, H * LAKE + 1, [
          [0, '#1a2130'],
          [0.5, '#2a3443'],
          [0.9, '#46505d'],
        ])
        ridge(ctx, W, H, {
          y: 0.6,
          amplitude: 0.07,
          frequency: 3,
          seed: 2,
          fill: '#3e4958',
        })
        mistBand(ctx, W, H * 0.63, H * 0.035, '150,162,178', 0.3)
        ridge(ctx, W, H, {
          y: 0.67,
          amplitude: 0.05,
          frequency: 4.5,
          seed: 6,
          fill: '#2f3946',
        })
        mistBand(ctx, W, H * 0.7, H * 0.03, '150,162,178', 0.24)
        const shore = ridge(ctx, W, H, {
          y: 0.745,
          amplitude: 0.02,
          frequency: 6,
          seed: 12,
          fill: '#222b35',
        })
        for (const w of windows) {
          const x = w.x * W
          const y = Math.min(shore(x) + 6, H * (LAKE - 0.01))
          stamp(ctx, warm, x, y, w.r * 14, w.r * 14, 0.55)
          ctx.globalAlpha = 1
          ctx.fillStyle = '#ffd896'
          ctx.fillRect(x - w.r, y - w.r * 0.7, w.r * 2, w.r * 1.4)
        }
        fillVertical(ctx, W, H * LAKE, H, [
          [0, '#3b4552'],
          [0.35, '#28313d'],
          [1, '#161c24'],
        ])
        // The windows' light, smeared down across the water.
        for (const w of windows) {
          stamp(ctx, warm, w.x * W, H * (LAKE + 0.06), w.r * 8, H * 0.12, 0.22)
        }
        ctx.globalAlpha = 1
      })
    },

    frame(ctx, t, dt, pointer) {
      if (!back) return
      drawLayer(ctx, back, W, H)

      for (const f of fogs) {
        const x = wrap(f.x + f.v * t, 1.8) - 0.4
        stamp(ctx, fog, x * W, f.y * H, f.w * W, f.h * H, f.a)
      }

      // New rings on the lake, about 14 a second, plus the pointer's.
      spawn += dt * 14
      while (spawn >= 1) {
        spawn -= 1
        const depth = rand()
        rings.spawn(
          rand() * W,
          H * (LAKE + 0.015 + depth ** 1.4 * (1 - LAKE - 0.02)),
          0.5 + depth * 1.6,
        )
      }
      rings.follow(pointer, H * (LAKE + 0.01), H)
      rings.draw(ctx, dt, '200,212,226', 0.5)

      // The umbrella: drops near the pointer are pushed out around it.
      const shelter = H * 0.09
      ctx.lineCap = 'round'
      for (const sheet of sheets) {
        const len = sheet.len * H
        ctx.globalAlpha = sheet.alpha
        ctx.strokeStyle = 'rgb(206,218,232)'
        ctx.lineWidth = sheet.width
        ctx.beginPath()
        for (const d of sheet.drops) {
          d.y += sheet.speed * dt
          d.x += sheet.speed * WIND * dt * (H / W)
          if (d.y > 1) {
            d.y -= 1 + sheet.len
            d.x = rand()
          }
          let x = wrap(d.x, 1) * W
          const y = d.y * H
          if (pointer.active) {
            const near = falloff(x - pointer.x, y - pointer.y, shelter)
            x += Math.sign(x - pointer.x) * near * shelter * 0.9
          }
          ctx.moveTo(x, y)
          ctx.lineTo(x + len * WIND, y + len)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
  }
}
