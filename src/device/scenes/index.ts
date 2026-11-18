/**
 * The animated scene for each music scene id (see SceneId in lib/sounds).
 * Each is drawn live on a canvas by components/SceneCanvas.
 */

import type { SceneId } from '../../lib/sounds'
import { mist } from './mist'
import { ocean } from './ocean'
import { park } from './park'
import { rain } from './rain'
import type { SceneFactory } from './types'
import { twilight } from './twilight'
import { valley } from './valley'

export const SCENES: Record<SceneId, SceneFactory> = {
  park,
  valley,
  ocean,
  rain,
  twilight,
  mist,
}

export type { Pointer, SceneKit, SceneRenderer, Surface } from './types'
