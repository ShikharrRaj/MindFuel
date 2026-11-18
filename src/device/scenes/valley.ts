/**
 * Valley — "Gentle keys": a starlit meadow. Stars twinkle one by one and a
 * shooting star crosses now and then; mist drifts over a valley of warm
 * village lights below layered mountains; in the foreground, glowing flowers
 * and grass sway in a light breeze while fireflies wander.
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
  mistBand,
  puffSprite,
  ridge,
  stamp,
  stillLayer,
} from './paint'
import type { SceneFactory, Surface } from './types'

const FLOWERS = ['245,154,70', '247,186,86', '238,132,96', '246,229,202']
/** The meadow starts this far down (fraction of the height). */
const MEADOW = 0.85

export const valley: SceneFactory = (kit) => {
  const rand = seededRandom(11)
  const star = glowSprite(kit, '255,246,230')
  const warm = glowSprite(kit, '255,200,128')
  const firefly = glowSprite(kit, '255,222,140')
  const blooms = FLOWERS.map((rgb) => glowSprite(kit, rgb))
  const mist = puffSprite(kit, '214,222,240')

  const stars = Array.from({ length: 120 }, () => ({
    x: rand(),
    y: rand() ** 1.3 * 0.58,
    r: 0.7 + rand() ** 4 * 2.4,
    phase: rand() * TAU,
    speed: 0.4 + rand() * 1.6,
  }))
  const fogs = [
    { x: 0.15, y: 0.705, w: 0.85, h: 0.06, v: 0.004, a: 0.22 },
    { x: 0.7, y: 0.742, w: 0.75, h: 0.05, v: -0.003, a: 0.18 },
    { x: 0.45, y: 0.675, w: 0.95, h: 0.045, v: 0.002, a: 0.14 },
  ]
  const blades = Array.from({ length: 340 }, () => ({
    x: rand() * 1.04 - 0.02,
    d: rand(),
    h: 0.4 + rand() * 0.6,
    p: rand() * TAU,
  }))
  const flowers = Array.from({ length: 170 }, () => ({
    x: rand() * 1.04 - 0.02,
    d: rand(),
    c: Math.floor(rand() * FLOWERS.length),
    p: rand() * TAU,
    s: 0.7 + rand() * 0.6,
  })).sort((a, b) => a.d - b.d)
  const flies = Array.from({ length: 22 }, () => ({
    x: rand(),
    y: 0.7 + rand() * 0.26,
    ax: 0.012 + rand() * 0.022,
    ay: 0.008 + rand() * 0.018,
    f: 0.05 + rand() * 0.08,
    p: rand() * TAU,
    g: rand() * TAU,
  }))
  // Flower heads move every frame; reuse these instead of allocating.
  const headX = new Float32Array(flowers.length)
  const headY = new Float32Array(flowers.length)
  // Flowers the pointer brushes past swing on springs; fireflies drift
  // a little towards it, curious.
  const bent = new Float32Array(flowers.length)
  const bending = new Float32Array(flowers.length)
  const flyX = new Float32Array(flies.length)
  const flyY = new Float32Array(flies.length)
  let meteor: {
    x: number
    y: number
    vx: number
    vy: number
    age: number
  } | null = null
  let nextMeteor = 3 + rand() * 5

  let W = 0
  let H = 0
  let back: Surface | null = null
  let front: Surface | null = null

  return {
    resize(width, height, scale) {
      W = width
      H = height
      const fine = seededRandom(5)
      back = stillLayer(kit, W, H, scale, (ctx) => {
        fillVertical(ctx, W, 0, H, [
          [0, '#0a1020'],
          [0.4, '#141e37'],
          [0.6, '#283154'],
          [0.7, '#463f5c'],
          [0.78, '#5a495e'],
        ])
        // Warm haze on the horizon and the faint band of the Milky Way.
        ctx.save()
        ctx.translate(W * 0.5, H * 0.7)
        ctx.scale(1, 0.3)
        const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.75)
        haze.addColorStop(0, 'rgba(176,124,112,0.42)')
        haze.addColorStop(1, 'rgba(176,124,112,0)')
        ctx.fillStyle = haze
        ctx.fillRect(-W, -W, W * 2, W * 2)
        ctx.restore()
        ctx.save()
        ctx.translate(W * 0.56, H * 0.24)
        ctx.rotate(-0.34)
        ctx.scale(1, 0.13)
        const milky = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.7)
        milky.addColorStop(0, 'rgba(96,116,176,0.3)')
        milky.addColorStop(1, 'rgba(96,116,176,0)')
        ctx.fillStyle = milky
        ctx.fillRect(-W, -W, W * 2, W * 2)
        ctx.restore()
        // Faint, still stars.
        for (let i = 0; i < 700; i++) {
          const size = 0.5 + fine() * 0.9
          ctx.fillStyle = `rgba(255,250,240,${0.12 + fine() * 0.45})`
          ctx.fillRect(fine() * W, fine() ** 1.2 * H * 0.62, size, size)
        }
        ridge(ctx, W, H, {
          y: 0.6,
          amplitude: 0.08,
          frequency: 3,
          seed: 3,
          fill: '#323b5a',
        })
        mistBand(ctx, W, H * 0.645, H * 0.03, '200,210,236', 0.2)
        ridge(ctx, W, H, {
          y: 0.665,
          amplitude: 0.05,
          frequency: 5,
          seed: 9,
          fill: '#262e49',
        })
        mistBand(ctx, W, H * 0.705, H * 0.03, '210,218,240', 0.2)
        // Village lights scattered over the valley floor.
        for (let i = 0; i < 60; i++) {
          const x = (0.04 + fine() * 0.92) * W
          const y = (0.69 + fine() ** 0.7 * 0.06) * H
          const r = 2 + fine() ** 2 * 5
          stamp(ctx, warm, x, y, r * 4, r * 4, 0.45)
          ctx.globalAlpha = 0.95
          ctx.fillStyle = '#ffd99c'
          ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6)
        }
        ctx.globalAlpha = 1
        ridge(ctx, W, H, {
          y: 0.745,
          amplitude: 0.035,
          frequency: 4,
          seed: 21,
          fill: '#1c2337',
        })
      })
      front = stillLayer(
        kit,
        W,
        H,
        scale,
        (ctx) => {
          const g = ctx.createLinearGradient(0, H * 0.8, 0, H)
          g.addColorStop(0, '#171e1d')
          g.addColorStop(1, '#0c110e')
          ridge(ctx, W, H, {
            y: 0.835,
            amplitude: 0.025,
            frequency: 2.2,
            seed: 33,
            fill: g,
          })
        },
        H * 0.78,
      )
    },

    frame(ctx, t, dt, pointer) {
      const here = pointer.active
      if (!back || !front) return
      drawLayer(ctx, back, W, H)

      // Stars brighten softly under the pointer.
      for (const s of stars) {
        const lit = here
          ? falloff(pointer.x - s.x * W, pointer.y - s.y * H, H * 0.14)
          : 0
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
        const size = s.r * 8 * (1 + lit * 0.7)
        stamp(
          ctx,
          star,
          s.x * W,
          s.y * H,
          size,
          size,
          Math.min(1, a + lit * 0.6),
        )
      }

      // A shooting star every 8–18 s: a short, fading streak.
      nextMeteor -= dt
      if (!meteor && nextMeteor <= 0) {
        meteor = {
          x: 0.08 + rand() * 0.6,
          y: 0.04 + rand() * 0.2,
          vx: 0.34 + rand() * 0.2,
          vy: 0.1 + rand() * 0.08,
          age: 0,
        }
      }
      if (meteor) {
        meteor.age += dt
        const k = meteor.age / 0.9
        if (k >= 1) {
          meteor = null
          nextMeteor = 8 + rand() * 10
        } else {
          const hx = (meteor.x + meteor.vx * meteor.age) * W
          const hy = (meteor.y + meteor.vy * meteor.age) * H
          const tx = hx - meteor.vx * 0.13 * W
          const ty = hy - meteor.vy * 0.13 * H
          const g = ctx.createLinearGradient(tx, ty, hx, hy)
          g.addColorStop(0, 'rgba(255,248,235,0)')
          g.addColorStop(1, `rgba(255,248,235,${Math.sin(Math.PI * k) * 0.9})`)
          ctx.globalAlpha = 1
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(tx, ty)
          ctx.lineTo(hx, hy)
          ctx.stroke()
        }
      }

      for (const f of fogs) {
        const x = wrap(f.x + f.v * t, 1.8) - 0.4
        stamp(ctx, mist, x * W, f.y * H, f.w * W, f.h * H, f.a)
      }

      drawLayer(ctx, front, W, H)

      // Grass, one path for all the blades.
      ctx.strokeStyle = 'rgba(44,62,40,0.95)'
      ctx.lineWidth = 1.1
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const b of blades) {
        const base = (MEADOW + 0.01 + b.d * 0.15) * H
        const len = (0.012 + b.d * 0.04) * H * b.h
        const x = b.x * W
        // Grass leans away from a pointer close by.
        const near = here
          ? falloff(pointer.x - x, pointer.y - (base - len), H * 0.08)
          : 0
        const sway =
          Math.sin(t * 1.1 + b.p + b.x * 3) * len * 0.28 +
          Math.sign(x - pointer.x) *
            near *
            len *
            0.7 *
            (0.35 + 0.65 * pointer.energy)
        ctx.moveTo(x, base)
        ctx.quadraticCurveTo(
          x + sway * 0.3,
          base - len * 0.6,
          x + sway,
          base - len,
        )
      }
      ctx.stroke()

      // Flowers: stems first (one path), then the glowing heads.
      ctx.strokeStyle = '#2b3a25'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      flowers.forEach((f, i) => {
        const base = (MEADOW + 0.015 + f.d * 0.15) * H
        const len = (0.02 + f.d * 0.055) * H
        const x = f.x * W
        let force = 0
        if (here && pointer.energy > 0.01) {
          const near = falloff(
            pointer.x - x,
            pointer.y - (base - len),
            H * 0.09,
          )
          force =
            (pointer.vx * 1.2 + Math.sign(x - pointer.x) * 300) *
            near *
            pointer.energy
        }
        springStep(bent, bending, i, force, dt)
        bent[i] = Math.max(-len * 0.6, Math.min(len * 0.6, bent[i]))
        const sway =
          Math.sin(t * (0.7 + f.s * 0.4) + f.p + f.x * 4) * len * 0.2 + bent[i]
        headX[i] = x + sway
        headY[i] = base - len
        ctx.moveTo(x, base)
        ctx.quadraticCurveTo(
          x + sway * 0.2,
          base - len * 0.6,
          headX[i],
          headY[i],
        )
      })
      ctx.stroke()
      flowers.forEach((f, i) => {
        const x = headX[i]
        const y = headY[i]
        const size = 1.8 + f.d * 6
        stamp(
          ctx,
          blooms[f.c],
          x,
          y,
          size * 6,
          size * 6,
          0.5 + 0.15 * Math.sin(t * 1.3 + f.p),
        )
        ctx.globalAlpha = 1
        ctx.fillStyle = `rgb(${FLOWERS[f.c]})`
        ctx.beginPath()
        ctx.arc(x, y, size * 0.55, 0, TAU)
        ctx.fill()
        ctx.fillStyle = '#ffeab8'
        ctx.beginPath()
        ctx.arc(x, y, size * 0.2, 0, TAU)
        ctx.fill()
      })

      flies.forEach((f, i) => {
        const baseX =
          (f.x +
            Math.sin(t * f.f * 2 + f.p) * f.ax +
            Math.sin(t * f.f * 4.6 + f.p * 2) * f.ax * 0.5) *
          W
        const baseY =
          (f.y +
            Math.cos(t * f.f * 1.6 + f.p) * f.ay +
            Math.sin(t * f.f * 3.7 + f.g) * f.ay * 0.5) *
          H
        // Within reach, drift a third of the way towards the pointer.
        const near = here
          ? falloff(pointer.x - baseX, pointer.y - baseY, H * 0.3)
          : 0
        const ease = Math.min(1, dt * 1.2)
        flyX[i] += ((pointer.x - baseX) * 0.33 * near - flyX[i]) * ease
        flyY[i] += ((pointer.y - baseY) * 0.33 * near - flyY[i]) * ease
        const x = baseX + flyX[i]
        const y = baseY + flyY[i]
        const pulse = (0.5 + 0.5 * Math.sin(t * 1.7 + f.g)) ** 2
        stamp(ctx, firefly, x, y, 16, 16, 0.15 + pulse * 0.85)
      })
      ctx.globalAlpha = 1
    },
  }
}
