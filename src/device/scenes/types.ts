/**
 * Contracts for the animated scenes. A scene paints its still parts once per
 * size (resize) and then draws each frame from the clock (frame), so motion
 * stays smooth whatever the frame rate.
 */

export type Ctx = CanvasRenderingContext2D

/** An offscreen canvas: a pre-painted layer or sprite. */
export interface Surface {
  canvas: HTMLCanvasElement
  ctx: Ctx
  /** For a layer cropped to its content: where it starts (CSS px). */
  top?: number
}

/** What a scene may ask its host for (swapped for fakes in tests). */
export interface SceneKit {
  surface(width: number, height: number): Surface
}

/**
 * Where the pointer is, and how much it is stirring things. Scenes push
 * nearby objects with it (leaves, flowers, rain, water) and let them spring
 * back. All in CSS px; `active` is false when the pointer is away.
 */
export interface Pointer {
  x: number
  y: number
  /** Velocity in CSS px per second (smoothed). */
  vx: number
  vy: number
  /** 0–1: rises while the pointer moves (or taps), fades when it rests. */
  energy: number
  active: boolean
}

export interface SceneRenderer {
  /** New size in CSS px and pixel scale: re-paint the still layers. */
  resize(width: number, height: number, scale: number): void
  /**
   * Draw one frame in CSS px (the host has already applied the scale).
   * `t` is seconds since the scene started; `dt` seconds since last frame.
   */
  frame(ctx: Ctx, t: number, dt: number, pointer: Pointer): void
}

export type SceneFactory = (kit: SceneKit) => SceneRenderer
