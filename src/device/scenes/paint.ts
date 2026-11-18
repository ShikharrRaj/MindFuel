/**
 * Paint helpers shared by the scenes: gradients, soft glow sprites, natural
 * ridgelines, mist bands and pine rows. Glows are pre-rendered sprites (one
 * drawImage each) rather than canvas blur, which is what keeps frames cheap.
 */

import { fbm1D, seededRandom } from '../../lib/sceneMath'
import type { Ctx, SceneKit, Surface } from './types'

/** A vertical gradient across the full width between y0 and y1. */
export function fillVertical(
  ctx: Ctx,
  width: number,
  y0: number,
  y1: number,
  stops: [number, string][],
): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [offset, colour] of stops) g.addColorStop(offset, colour)
  ctx.fillStyle = g
  ctx.fillRect(0, y0, width, y1 - y0)
}

/** A round, soft light ("r,g,b"), drawn scaled wherever it is needed. */
export function glowSprite(kit: SceneKit, rgb: string, size = 64): Surface {
  const s = kit.surface(size, size)
  const half = size / 2
  const g = s.ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.16, `rgba(${rgb},0.8)`)
  g.addColorStop(0.42, `rgba(${rgb},0.22)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  s.ctx.fillStyle = g
  s.ctx.fillRect(0, 0, size, size)
  return s
}

/** A soft puff ("r,g,b"); stretch it when drawing for fog and cloud. */
export function puffSprite(kit: SceneKit, rgb: string, size = 128): Surface {
  const s = kit.surface(size, size)
  const half = size / 2
  const g = s.ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.5, `rgba(${rgb},0.5)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  s.ctx.fillStyle = g
  s.ctx.fillRect(0, 0, size, size)
  return s
}

/** Draw a sprite centred on (x, y), `w` × `h` CSS px, at `alpha`. */
export function stamp(
  ctx: Ctx,
  sprite: Surface,
  x: number,
  y: number,
  w: number,
  h = w,
  alpha = 1,
): void {
  ctx.globalAlpha = alpha
  ctx.drawImage(sprite.canvas, x - w / 2, y - h / 2, w, h)
}

/**
 * A still layer painted once at the canvas's pixel density. Give `top` when
 * its content only fills the lower part of the screen: the layer is cropped
 * to that band, so each frame fills fewer pixels.
 */
export function stillLayer(
  kit: SceneKit,
  width: number,
  height: number,
  scale: number,
  paint: (ctx: Ctx) => void,
  top = 0,
): Surface {
  const s = kit.surface(
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round((height - top) * scale)),
  )
  s.ctx.setTransform(scale, 0, 0, scale, 0, -top * scale)
  paint(s.ctx)
  s.top = top
  return s
}

/** Draw a still layer in place (cropped layers know where they start). */
export function drawLayer(
  ctx: Ctx,
  layer: Surface,
  width: number,
  height: number,
): void {
  const top = layer.top ?? 0
  ctx.globalAlpha = 1
  ctx.drawImage(layer.canvas, 0, top, width, height - top)
}

export interface RidgeOptions {
  /** Resting height, as a fraction of the height. */
  y: number
  /** How far it rises and falls, as a fraction of the height. */
  amplitude: number
  /** Hills across the width (bigger = busier ridgeline). */
  frequency: number
  seed: number
  fill: string | CanvasGradient
}

/**
 * A natural ridgeline filled down to the bottom. Returns its height at any
 * x, so trees, lights or temples can be placed on it.
 */
export function ridge(
  ctx: Ctx,
  width: number,
  height: number,
  o: RidgeOptions,
): (x: number) => number {
  const n = fbm1D(o.seed, 4)
  const at = (x: number) =>
    (o.y + n((x / width) * o.frequency) * o.amplitude) * height
  const step = Math.max(2, width / 260)
  ctx.beginPath()
  ctx.moveTo(0, height)
  for (let x = 0; x <= width + step; x += step) ctx.lineTo(x, at(x))
  ctx.lineTo(width, height)
  ctx.closePath()
  ctx.fillStyle = o.fill
  ctx.fill()
  return at
}

/** A soft horizontal band of mist centred on y. */
export function mistBand(
  ctx: Ctx,
  width: number,
  y: number,
  thickness: number,
  rgb: string,
  alpha: number,
): void {
  const g = ctx.createLinearGradient(0, y - thickness, 0, y + thickness)
  g.addColorStop(0, `rgba(${rgb},0)`)
  g.addColorStop(0.5, `rgba(${rgb},${alpha})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, y - thickness, width, thickness * 2)
}

/** A row of tiered pine silhouettes standing on a ridgeline. */
export function pines(
  ctx: Ctx,
  width: number,
  ground: (x: number) => number,
  o: { minHeight: number; maxHeight: number; spacing: number; seed: number },
  fill: string,
): void {
  const rand = seededRandom(o.seed)
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let x = -o.spacing; x < width + o.spacing; ) {
    const h = o.minHeight + rand() * (o.maxHeight - o.minHeight)
    const w = h * 0.36
    const base = ground(x) + 4
    // Three tiers, each a little narrower and higher.
    for (let tier = 0; tier < 3; tier++) {
      const top = base - h * (0.45 + tier * 0.275)
      const bottom = base - h * tier * 0.24
      const half = (w / 2) * (1 - tier * 0.22)
      ctx.moveTo(x - half, bottom)
      ctx.lineTo(x, top)
      ctx.lineTo(x + half, bottom)
      ctx.closePath()
    }
    ctx.rect(x - w * 0.04, base - h * 0.1, w * 0.08, h * 0.1)
    x += o.spacing * (0.55 + rand() * 0.9)
  }
  ctx.fill()
}
