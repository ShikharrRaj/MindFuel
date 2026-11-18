/**
 * SceneCanvas — draws one animated scene (device/scenes) on a canvas.
 *
 * Smoothness comes from a few rules:
 * - motion is computed from the clock, never by counting frames, so it
 *   stays even when a frame is late;
 * - still parts are painted once per size and reused every frame;
 * - the canvas resolution is capped (lib/sceneMath pixelScale) and drops by
 *   itself if a device keeps missing frames (which also makes the glass
 *   surfaces near-solid, via data-low-power);
 * - the browser pauses it in background tabs, and `still` (Pause motion or
 *   reduced motion) draws a single frame and stops.
 *
 * It is also interactive: the pointer's position and how much it is moving
 * are passed to the scene, which stirs whatever is nearby (see Pointer).
 */

import { useEffect, useRef } from 'react'
import { type Pointer, SCENES, type SceneKit } from '../device/scenes'
import { pixelScale } from '../lib/sceneMath'
import type { SceneId } from '../lib/sounds'

/** Where a still scene is drawn from (a moment with everything on screen). */
const STILL_AT = 14
/** Average frame time above this (s) means the device is struggling. */
const SLOW_FRAME = 1 / 42

const kit: SceneKit = {
  surface(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    return { canvas, ctx }
  },
}

interface Props {
  scene: SceneId
  still: boolean
}

export default function SceneCanvas({ scene, still }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    const view = canvas
    const renderer = SCENES[scene](kit)
    let width = 0
    let height = 0
    let quality = 1
    let frame = 0
    let started = 0
    let last = 0
    let slow = 0
    let measured = 0

    // The pointer stirs the scene (leaves, flowers, rain, water). The
    // canvas fills the viewport, so client coordinates are scene coordinates.
    const pointer: Pointer = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      energy: 0,
      active: false,
    }
    let lastMove = 0
    function onMove(e: PointerEvent) {
      const now = performance.now()
      if (pointer.active && now - lastMove < 120) {
        const span = Math.max(8, now - lastMove) / 1000
        pointer.vx += ((e.clientX - pointer.x) / span - pointer.vx) * 0.35
        pointer.vy += ((e.clientY - pointer.y) / span - pointer.vy) * 0.35
      }
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
      pointer.energy = Math.min(
        1,
        pointer.energy + Math.hypot(pointer.vx, pointer.vy) / 4000,
      )
      lastMove = now
    }
    // A tap (touch screens) is a brief, full stir where it lands.
    function onDown(e: PointerEvent) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.vx = 0
      pointer.vy = 0
      pointer.active = true
      pointer.energy = 1
    }
    function onLeave() {
      pointer.active = false
    }

    function draw(t: number, dt: number) {
      ctx!.setTransform(view.width / width, 0, 0, view.height / height, 0, 0)
      renderer.frame(ctx!, t, dt, pointer)
    }

    function fit() {
      width = Math.max(1, view.clientWidth)
      height = Math.max(1, view.clientHeight)
      const scale = pixelScale(width, height, window.devicePixelRatio) * quality
      view.width = Math.round(width * scale)
      view.height = Math.round(height * scale)
      renderer.resize(width, height, scale)
      // Paint at once, so the scene never shows a blank canvas.
      draw(still ? STILL_AT : (last - started) / 1000, 0)
    }

    function tick(now: number) {
      if (!started) started = last = now
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // Stirring fades when the pointer rests.
      pointer.energy *= Math.exp(-dt * 2.2)
      pointer.vx *= Math.exp(-dt * 6)
      pointer.vy *= Math.exp(-dt * 6)
      draw((now - started) / 1000, dt)
      // Keep missing frames on a weak device? Paint fewer pixels.
      measured += 1
      slow += dt
      if (measured === 90) {
        if (slow / measured > SLOW_FRAME && quality > 0.55) {
          quality *= 0.8
          // Also let the frosted glass over the scene go near-solid: live
          // blur is the other big cost on a weak device.
          document.documentElement.dataset.lowPower = ''
          fit()
        }
        measured = 0
        slow = 0
      }
      frame = requestAnimationFrame(tick)
    }

    fit()
    if (!still) {
      frame = requestAnimationFrame(tick)
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
      window.addEventListener('blur', onLeave)
    }

    let resizeTimer = 0
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            clearTimeout(resizeTimer)
            resizeTimer = window.setTimeout(fit, 120)
          })
    observer?.observe(view)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(resizeTimer)
      observer?.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [scene, still])

  return <canvas ref={ref} className="scene__canvas" aria-hidden="true" />
}
