/**
 * Willow — a weeping willow for the park scene, backlit by the sunset.
 *
 * - A trunk forks into arching boughs over a soft, dark core of foliage.
 * - ~530 fronds spring from the boughs like a fountain: up and out, over,
 *   then down, so their arches form the rounded crown. Each ends at its own
 *   length and softens towards its tip; the sun-facing side catches light.
 * - Fronds sway more towards their tips, with a slow shared breeze on top.
 *
 * Sizes are fractions of the screen height, so the tree keeps its shape on
 * any width. Trunk, boughs and core are still (paintStill); the fronds are
 * drawn every frame (draw), in a handful of batched paths.
 */

import { falloff, seededRandom, springStep, TAU } from '../../lib/sceneMath'
import type { Ctx, Pointer } from './types'

/** Bough tips relative to the fork, as fractions of the height. */
const BOUGHS: [number, number][] = [
  [-0.19, -0.1],
  [-0.12, -0.18],
  [-0.04, -0.22],
  [0.05, -0.215],
  [0.13, -0.16],
  [0.2, -0.08],
]
const FORK = 0.25
/** Frond tones: shaded core, mid green, sun-caught. [top, tip] colours. */
const TONES: [string, string][] = [
  ['rgba(30,38,27,0.9)', 'rgba(30,38,27,0.45)'],
  ['rgba(64,78,44,0.85)', 'rgba(64,78,44,0.4)'],
  ['rgba(170,146,82,0.7)', 'rgba(170,146,82,0.25)'],
]
const WIDTHS = [1.1, 1.9]

interface Frond {
  x: number
  y: number
  len: number
  out: number
  tone: number
  width: number
  p: number
}

/** A point along a bough, from the fork (u = 0) to its tip (u = 1). */
function boughPoint(tip: [number, number], u: number): [number, number] {
  const [tx, ty] = tip
  const cx = tx * 0.45
  const cy = -FORK + ty - 0.07
  const x = 2 * (1 - u) * u * cx + u * u * tx
  const y = (1 - u) ** 2 * -FORK + 2 * (1 - u) * u * cy + u * u * (-FORK + ty)
  return [x, y]
}

export function createWillow(seed: number) {
  const rand = seededRandom(seed)
  const fronds: Frond[] = []
  for (const tip of BOUGHS) {
    for (let i = 0; i < 88; i++) {
      // Fronds all along the bough's arch, from near the fork to the tip.
      const u = 0.1 + rand() ** 0.9 * 0.9
      const [x, y] = boughPoint(tip, u)
      const fx = x + (rand() - 0.5) * 0.03
      const fy = y + 0.005 + rand() * 0.03
      const sunny = fx > 0.04 && rand() < 0.32
      fronds.push({
        x: fx,
        y: fy,
        len: -fy * (0.42 + rand() * 0.52),
        out: Math.sign(fx || 1),
        tone: sunny ? 2 : Math.abs(fx) < 0.06 || rand() < 0.45 ? 0 : 1,
        width: rand() < 0.4 ? 1 : 0,
        p: rand() * TAU,
      })
    }
  }

  // How far each frond has been pushed by the pointer (px), and how fast.
  const pushed = new Float32Array(fronds.length)
  const pushing = new Float32Array(fronds.length)

  // Frond strokes fade towards their tips: one gradient per tone, per size.
  let gradientsFor = -1
  let gradients: CanvasGradient[] = []

  return {
    /** Trunk, boughs and core, with the trunk's base at (bx, by). */
    paintStill(ctx: Ctx, bx: number, by: number, H: number) {
      // Trunk, with a little root flare.
      ctx.fillStyle = '#211e1a'
      ctx.beginPath()
      ctx.moveTo(bx - H * 0.03, by + H * 0.004)
      ctx.quadraticCurveTo(
        bx - H * 0.012,
        by - H * 0.02,
        bx - H * 0.012,
        by - H * 0.1,
      )
      ctx.quadraticCurveTo(
        bx - H * 0.008,
        by - H * 0.2,
        bx - H * 0.004,
        by - H * FORK,
      )
      ctx.lineTo(bx + H * 0.012, by - H * FORK)
      ctx.quadraticCurveTo(
        bx + H * 0.02,
        by - H * 0.18,
        bx + H * 0.018,
        by - H * 0.08,
      )
      ctx.quadraticCurveTo(
        bx + H * 0.02,
        by - H * 0.02,
        bx + H * 0.04,
        by + H * 0.004,
      )
      ctx.closePath()
      ctx.fill()
      // Warm rim light down the sun-facing edge.
      ctx.strokeStyle = 'rgba(214,160,96,0.4)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(bx + H * 0.012, by - H * FORK)
      ctx.quadraticCurveTo(
        bx + H * 0.02,
        by - H * 0.18,
        bx + H * 0.018,
        by - H * 0.08,
      )
      ctx.stroke()

      // Boughs: slim, tapering arcs from the fork.
      ctx.strokeStyle = '#231f1b'
      ctx.lineCap = 'round'
      for (const tip of BOUGHS) {
        for (const [from, to, width] of [
          [0, 0.35, 0.0065],
          [0.35, 1, 0.0028],
        ]) {
          ctx.lineWidth = width * H
          ctx.beginPath()
          const [sx, sy] = boughPoint(tip, from)
          ctx.moveTo(bx + sx * H, by + sy * H)
          for (let u = from + 0.05; u <= to + 1e-6; u += 0.05) {
            const [x, y] = boughPoint(tip, u)
            ctx.lineTo(bx + x * H, by + y * H)
          }
          ctx.stroke()
        }
      }

      // A soft, dark core under the crown, so the canopy never looks thin.
      ctx.save()
      ctx.translate(bx + H * 0.005, by - H * 0.31)
      ctx.scale(1.2, 0.8)
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.14)
      core.addColorStop(0, 'rgba(28,35,25,0.8)')
      core.addColorStop(0.55, 'rgba(28,35,25,0.45)')
      core.addColorStop(1, 'rgba(28,35,25,0)')
      ctx.fillStyle = core
      ctx.fillRect(-H * 0.15, -H * 0.15, H * 0.3, H * 0.3)
      ctx.restore()
      ctx.globalAlpha = 1
    },

    /** The fronds, swaying, for the frame at time t. */
    /**
     * The fronds for the frame at time t. Fronds the pointer brushes past
     * are pushed along with it and away from it, then swing back.
     */
    draw(
      ctx: Ctx,
      bx: number,
      by: number,
      H: number,
      t: number,
      dt: number,
      pointer: Pointer,
    ) {
      if (gradientsFor !== H) {
        gradientsFor = H
        gradients = TONES.map(([top, tip]) => {
          const g = ctx.createLinearGradient(0, by - H * 0.42, 0, by)
          g.addColorStop(0, top)
          g.addColorStop(1, tip)
          return g
        })
      }
      const reach = H * 0.11
      fronds.forEach((f, i) => {
        let force = 0
        if (pointer.active && pointer.energy > 0.01) {
          const mx = bx + f.x * H + f.out * H * 0.04
          const my = by + f.y * H + f.len * H * 0.55
          const near = falloff(pointer.x - mx, pointer.y - my, reach)
          if (near > 0) {
            force =
              (pointer.vx * 1.4 + Math.sign(mx - pointer.x) * 260) *
              near *
              pointer.energy
          }
        }
        springStep(pushed, pushing, i, force, dt)
        // Never so far that a frond looks broken.
        const limit = f.len * H * 0.35
        if (pushed[i] > limit) pushed[i] = limit
        else if (pushed[i] < -limit) pushed[i] = -limit
      })
      const breeze = Math.sin(t * 0.23) * 0.5 + Math.sin(t * 0.11 + 1) * 0.3
      ctx.globalAlpha = 1
      ctx.lineCap = 'round'
      for (let tone = 0; tone < TONES.length; tone++) {
        ctx.strokeStyle = gradients[tone]
        for (let w = 0; w < WIDTHS.length; w++) {
          ctx.lineWidth = WIDTHS[w]
          ctx.beginPath()
          fronds.forEach((f, i) => {
            if (f.tone !== tone || f.width !== w) return
            const len = f.len * H
            const sway =
              (Math.sin(t * 0.5 + f.p) * 0.05 +
                Math.sin(t * 0.19 + f.p * 2) * 0.025 +
                breeze * 0.03) *
                len +
              pushed[i]
            const x = bx + f.x * H
            const y = by + f.y * H
            const out = f.out * H
            // Like a fountain: up and out along the bough, over, then
            // down, the tip swinging most. The arches make the crown.
            ctx.moveTo(x, y)
            ctx.bezierCurveTo(
              x + out * 0.03,
              y - H * 0.035,
              x + out * 0.06 + sway * 0.4,
              y + len * 0.15,
              x + out * 0.05 + sway,
              y + len,
            )
          })
          ctx.stroke()
        }
      }
    },
  }
}
