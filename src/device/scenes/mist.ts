/**
 * Mist — "Brown noise": a misty dawn in the pines. Sun rays breathe slowly
 * through the trees, fog banks drift between rows of pines that fade into
 * the distance, and motes of dust float in the early light.
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
  pines,
  puffSprite,
  ridge,
  stamp,
  stillLayer,
} from './paint'
import type { SceneFactory, Surface } from './types'

const SUN = { x: 0.78, y: 0.55 }
const RAYS = 8

export const mist: SceneFactory = (kit) => {
  const rand = seededRandom(23)
  const sunGlow = glowSprite(kit, '255,226,176', 128)
  const fog = puffSprite(kit, '248,244,236')
  const mote = glowSprite(kit, '255,240,210', 32)

  const rays = Array.from({ length: RAYS }, (_, i) => ({
    angle: -2.55 + (i / (RAYS - 1)) * 1.3,
    width: 0.025 + rand() * 0.03,
  }))
  const fogFar = [
    { x: 0.2, y: 0.625, w: 0.9, h: 0.08, v: 0.004, a: 0.6 },
    { x: 0.8, y: 0.64, w: 0.8, h: 0.07, v: 0.003, a: 0.5 },
  ]
  const fogNear = [
    { x: 0.4, y: 0.75, w: 1, h: 0.09, v: -0.003, a: 0.55 },
    { x: 1, y: 0.77, w: 0.8, h: 0.08, v: -0.004, a: 0.45 },
  ]
  const motes = Array.from({ length: 46 }, () => ({
    x: rand(),
    y: 0.35 + rand() * 0.5,
    p: rand() * TAU,
    s: 2 + rand() * 4,
  }))

  // The pointer swirls the motes in its wake and parts the fog a little.
  const moteX = new Float32Array(motes.length)
  const moteVX = new Float32Array(motes.length)
  const moteY = new Float32Array(motes.length)
  const moteVY = new Float32Array(motes.length)
  const fogs = [...fogFar, ...fogNear]
  const parted = new Float32Array(fogs.length)
  const parting = new Float32Array(fogs.length)

  let W = 0
  let H = 0
  let back: Surface | null = null
  let middle: Surface | null = null
  let front: Surface | null = null
  /** Each ray's gradient, built once per size (not every frame). */
  let rayFills: CanvasGradient[] = []

  return {
    resize(width, height, scale) {
      W = width
      H = height
      back = stillLayer(kit, W, H, scale, (ctx) => {
        fillVertical(ctx, W, 0, H, [
          [0, '#9eb0c2'],
          [0.35, '#d3d3d1'],
          [0.58, '#f3d3ab'],
          [0.66, '#f6dcb8'],
        ])
        stamp(ctx, sunGlow, SUN.x * W, SUN.y * H, H * 1.1, H * 1.1, 0.85)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#fff4dc'
        ctx.beginPath()
        ctx.arc(SUN.x * W, SUN.y * H, H * 0.03, 0, TAU)
        ctx.fill()
        const far = ridge(ctx, W, H, {
          y: 0.62,
          amplitude: 0.03,
          frequency: 3,
          seed: 5,
          fill: '#a5b2b7',
        })
        pines(
          ctx,
          W,
          far,
          {
            minHeight: H * 0.04,
            maxHeight: H * 0.075,
            spacing: H * 0.022,
            seed: 5,
          },
          '#a5b2b7',
        )
      })
      rayFills = [] // rebuilt for the new size on the next frame
      // The pine rows only fill the lower part: crop them to it.
      middle = stillLayer(
        kit,
        W,
        H,
        scale,
        (ctx) => {
          const mid = ridge(ctx, W, H, {
            y: 0.715,
            amplitude: 0.025,
            frequency: 4,
            seed: 17,
            fill: '#7b8c89',
          })
          pines(
            ctx,
            W,
            mid,
            {
              minHeight: H * 0.08,
              maxHeight: H * 0.14,
              spacing: H * 0.04,
              seed: 17,
            },
            '#7b8c89',
          )
        },
        H * 0.5,
      )
      front = stillLayer(
        kit,
        W,
        H,
        scale,
        (ctx) => {
          const near = ridge(ctx, W, H, {
            y: 0.875,
            amplitude: 0.02,
            frequency: 2.5,
            seed: 29,
            fill: '#334039',
          })
          pines(
            ctx,
            W,
            near,
            {
              minHeight: H * 0.16,
              maxHeight: H * 0.27,
              spacing: H * 0.085,
              seed: 29,
            },
            '#334039',
          )
        },
        H * 0.54,
      )
    },

    frame(ctx, t, dt, pointer) {
      if (!back || !middle || !front) return
      drawLayer(ctx, back, W, H)

      // Rays: soft wedges from the sun that slowly breathe. Only their own
      // area is filled, with gradients built once per size.
      const sx = SUN.x * W
      const sy = SUN.y * H
      const reach = Math.hypot(W, H)
      if (rayFills.length === 0) {
        rayFills = rays.map((r) => {
          const g = ctx.createLinearGradient(
            sx,
            sy,
            sx + Math.cos(r.angle) * reach,
            sy + Math.sin(r.angle) * reach,
          )
          g.addColorStop(0, 'rgba(255,244,214,0.34)')
          g.addColorStop(0.6, 'rgba(255,244,214,0)')
          return g
        })
      }
      rays.forEach((r, i) => {
        ctx.globalAlpha =
          0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.25 + i * 2.1))
        ctx.fillStyle = rayFills[i]
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(
          sx + Math.cos(r.angle - r.width) * reach,
          sy + Math.sin(r.angle - r.width) * reach,
        )
        ctx.lineTo(
          sx + Math.cos(r.angle + r.width) * reach,
          sy + Math.sin(r.angle + r.width) * reach,
        )
        ctx.closePath()
        ctx.fill()
      })

      // Fog banks drift, and lean away from a pointer moving through them.
      const bank = (i: number) => {
        const f = fogs[i]
        const x = (wrap(f.x + f.v * t, 1.8) - 0.4) * W
        let force = 0
        if (pointer.active && pointer.energy > 0.01) {
          const near = falloff(0, pointer.y - f.y * H, f.h * H * 1.2)
          force = Math.sign(x - pointer.x) * 320 * near * pointer.energy
        }
        springStep(parted, parting, i, force, dt, 4, 2.4)
        stamp(ctx, fog, x + parted[i], f.y * H, f.w * W, f.h * H, f.a)
      }
      for (let i = 0; i < fogFar.length; i++) bank(i)
      drawLayer(ctx, middle, W, H)
      for (let i = fogFar.length; i < fogs.length; i++) bank(i)

      // Motes float up in the light; the pointer's wake swirls them.
      motes.forEach((m, i) => {
        const restX =
          wrap(m.x - t * 0.004 + Math.sin(t * 0.3 + m.p) * 0.01, 1) * W
        const restY =
          (wrap(m.y - t * 0.006 + Math.cos(t * 0.23 + m.p) * 0.01 - 0.3, 0.6) +
            0.3) *
          H
        let fx = 0
        let fy = 0
        if (pointer.active && pointer.energy > 0.01) {
          const dx = restX + moteX[i] - pointer.x
          const dy = restY + moteY[i] - pointer.y
          const near = falloff(dx, dy, H * 0.13) * pointer.energy
          // Carried along with the pointer, and swirled around it.
          fx = (pointer.vx * 1.5 - dy * 6) * near
          fy = (pointer.vy * 1.5 + dx * 6) * near
        }
        springStep(moteX, moteVX, i, fx, dt, 2, 1.6)
        springStep(moteY, moteVY, i, fy, dt, 2, 1.6)
        // A flick sends them drifting, never flying off the screen.
        const cap = H * 0.15
        moteX[i] = Math.max(-cap, Math.min(cap, moteX[i]))
        moteY[i] = Math.max(-cap, Math.min(cap, moteY[i]))
        const a = (0.5 + 0.5 * Math.sin(t * 0.9 + m.p)) * 0.7
        stamp(
          ctx,
          mote,
          restX + moteX[i],
          restY + moteY[i],
          m.s * 3,
          m.s * 3,
          a,
        )
      })

      drawLayer(ctx, front, W, H)
    },
  }
}
