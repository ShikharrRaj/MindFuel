/**
 * Offline soundscapes, synthesised with the Web Audio API: generative
 * "sunset lake" and "gentle keys" music, rain, ocean waves, a tanpura drone
 * and brown noise. Nothing is
 * downloaded, so they cost no bandwidth, work offline, and add only a few KB
 * of code. The catalogue (names, purposes) lives in lib/sounds.
 */

import type { SoundId } from '../lib/sounds'

export type { SoundId } from '../lib/sounds'

type AudioContextCtor = typeof AudioContext

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export function audioSupported(): boolean {
  return audioContextCtor() !== null
}

function noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const length = ctx.sampleRate * 3
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (kind === 'white') {
      data[i] = white * 0.5
    } else {
      // Integrated (random-walk) noise, gently pulled back toward zero.
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  }
  if (kind === 'brown') {
    // Remove the random walk's drift so the loop's end meets its start
    // (otherwise every loop point is an audible tick).
    const drift = data[length - 1] - data[0]
    for (let i = 0; i < length; i++) data[i] -= (drift * i) / (length - 1)
  }
  return buffer
}

function loop(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  return src
}

/**
 * Generative music: soft piano-like notes wandering a D major pentatonic scale
 * (no note can clash with another) over a quiet, slowly breathing pad, with a
 * gentle echo for space. Notes are scheduled a couple of seconds ahead on the
 * audio clock, so a briefly throttled background tab doesn't stutter.
 */
function startGentleKeys(
  ctx: AudioContext,
  master: GainNode,
  sources: AudioScheduledSourceNode[],
): ReturnType<typeof setInterval> {
  // Echo: a delay whose repeats get darker and quieter.
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.42
  const feedback = ctx.createGain()
  feedback.gain.value = 0.32
  const damp = ctx.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 1800
  delay.connect(damp).connect(feedback).connect(delay)
  const wet = ctx.createGain()
  wet.gain.value = 0.35
  delay.connect(wet).connect(master)
  const bus = ctx.createGain()
  bus.connect(master)
  bus.connect(delay)

  // Pad: the root and fifth, swelling very slowly.
  const pad = ctx.createGain()
  pad.gain.value = 0.05
  const padLfo = ctx.createOscillator()
  padLfo.frequency.value = 0.07
  const padDepth = ctx.createGain()
  padDepth.gain.value = 0.025
  padLfo.connect(padDepth).connect(pad.gain)
  pad.connect(master)
  for (const freq of [146.83, 220]) {
    const osc = ctx.createOscillator()
    osc.frequency.value = freq
    osc.connect(pad)
    osc.start()
    sources.push(osc)
  }
  padLfo.start()
  sources.push(padLfo)

  const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99]
  const STEPS = [-2, -1, -1, 1, 1, 2]
  let index = 3
  let nextAt = ctx.currentTime + 0.8

  function note(freq: number, t: number, peak: number) {
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(peak, t + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
    env.connect(bus)
    // A sine body plus a quiet triangle an octave up, for a soft bell tone.
    const body = ctx.createOscillator()
    body.frequency.value = freq
    const shimmer = ctx.createOscillator()
    shimmer.type = 'triangle'
    shimmer.frequency.value = freq * 2
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.value = 0.18
    body.connect(env)
    shimmer.connect(shimmerGain).connect(env)
    for (const osc of [body, shimmer]) {
      osc.start(t)
      osc.stop(t + 3.3)
    }
  }

  function schedule() {
    // If the scheduler was held up for longer than the look-ahead, skip the
    // missed notes rather than playing them all at once.
    if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.1
    while (nextAt < ctx.currentTime + 2) {
      const step = STEPS[Math.floor(Math.random() * STEPS.length)]
      index = Math.min(SCALE.length - 1, Math.max(0, index + step))
      note(SCALE[index], nextAt, 0.18)
      // Now and then a softer harmony note two scale steps below.
      if (Math.random() < 0.25) {
        note(SCALE[Math.max(0, index - 2)], nextAt + 0.03, 0.08)
      }
      nextAt += 1.4 + Math.random() * 1.8
      if (Math.random() < 0.15) nextAt += 2.5 // an occasional rest
    }
  }

  schedule()
  return setInterval(schedule, 500)
}

/**
 * Generative music for the park at sunset: a warm pad that drifts between
 * two chords, slow harp-like notes from a pentatonic scale (nothing can
 * clash), soft lapping water and, now and then, a distant bird. Notes are
 * scheduled ahead on the audio clock, like gentle keys.
 */
function startSunsetLake(
  ctx: AudioContext,
  master: GainNode,
  sources: AudioScheduledSourceNode[],
): ReturnType<typeof setInterval> {
  // Echo for the plucked notes.
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.38
  const feedback = ctx.createGain()
  feedback.gain.value = 0.3
  const damp = ctx.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 2200
  delay.connect(damp).connect(feedback).connect(delay)
  const wet = ctx.createGain()
  wet.gain.value = 0.32
  delay.connect(wet).connect(master)
  const bus = ctx.createGain()
  bus.connect(master)
  bus.connect(delay)

  // Pad: four soft voices that glide between Cmaj7 and Am9 every 16 s.
  const CHORDS = [
    [130.81, 196, 246.94, 329.63],
    [110, 164.81, 261.63, 392],
  ]
  const padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 850
  const pad = ctx.createGain()
  pad.gain.value = 0.045
  padFilter.connect(pad).connect(master)
  const voices = CHORDS[0].map((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.detune.value = (i - 1.5) * 4
    osc.connect(padFilter)
    osc.start()
    sources.push(osc)
    return osc
  })
  const swell = ctx.createOscillator()
  swell.frequency.value = 0.06
  const swellDepth = ctx.createGain()
  swellDepth.gain.value = 0.018
  swell.connect(swellDepth).connect(pad.gain)
  swell.start()
  sources.push(swell)

  // Water lapping at the shore: band-passed noise that swells and ebbs.
  const water = loop(ctx, noiseBuffer(ctx, 'white'))
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 480
  band.Q.value = 0.7
  const lap = ctx.createGain()
  lap.gain.value = 0.035
  const lapLfo = ctx.createOscillator()
  lapLfo.frequency.value = 0.18
  const lapDepth = ctx.createGain()
  lapDepth.gain.value = 0.022
  lapLfo.connect(lapDepth).connect(lap.gain)
  water.connect(band).connect(lap).connect(master)
  water.start()
  lapLfo.start()
  sources.push(water, lapLfo)

  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]
  let index = 2
  let chord = 0
  let nextNote = ctx.currentTime + 1.2
  let nextChord = ctx.currentTime + 16
  let nextBird = ctx.currentTime + 6 + Math.random() * 6

  function pluck(freq: number, t: number, peak: number) {
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(peak, t + 0.006)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
    env.connect(bus)
    // A sine body with a quiet third harmonic: harp-like, soft.
    const body = ctx.createOscillator()
    body.frequency.value = freq
    const ring = ctx.createOscillator()
    ring.frequency.value = freq * 3
    const ringGain = ctx.createGain()
    ringGain.gain.value = 0.08
    body.connect(env)
    ring.connect(ringGain).connect(env)
    for (const osc of [body, ring]) {
      osc.start(t)
      osc.stop(t + 2.5)
    }
  }

  function chirp(t: number) {
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.02, t + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
    env.connect(master)
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(2700, t)
    osc.frequency.exponentialRampToValueAtTime(3600, t + 0.05)
    osc.frequency.exponentialRampToValueAtTime(3000, t + 0.1)
    osc.connect(env)
    osc.start(t)
    osc.stop(t + 0.12)
  }

  function schedule() {
    const now = ctx.currentTime
    if (nextNote < now) nextNote = now + 0.1
    while (nextNote < now + 2) {
      const step = [-1, -1, 1, 1, 2, -2][Math.floor(Math.random() * 6)]
      index = Math.min(SCALE.length - 1, Math.max(0, index + step))
      pluck(SCALE[index], nextNote, 0.1)
      nextNote += 2.2 + Math.random() * 2.3
    }
    if (nextChord < now + 2) {
      chord = 1 - chord
      voices.forEach((osc, i) =>
        osc.frequency.setTargetAtTime(CHORDS[chord][i], nextChord, 2.5),
      )
      nextChord += 16
    }
    if (nextBird < now + 2) {
      const calls = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < calls; i++) chirp(nextBird + i * 0.16)
      nextBird += 7 + Math.random() * 9
    }
  }

  schedule()
  return setInterval(schedule, 500)
}

/** A playing soundscape. `stop()` fades out and releases the audio graph. */
export interface Soundscape {
  setVolume(volume: number): void
  stop(): void
}

export function startSoundscape(
  id: SoundId,
  volume: number,
  /** Seconds to fade in (longer when music starts on its own). */
  fadeIn = 1.5,
): Soundscape | null {
  const Ctor = audioContextCtor()
  if (!Ctor) return null
  const ctx = new Ctor()
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn)
  master.connect(ctx.destination)

  const sources: AudioScheduledSourceNode[] = []
  let timer: ReturnType<typeof setInterval> | null = null

  if (id === 'brown-noise') {
    const src = loop(ctx, noiseBuffer(ctx, 'brown'))
    src.connect(master)
    src.start()
    sources.push(src)
  }

  if (id === 'rain') {
    // Band-limited white noise with a slow wobble in loudness.
    const src = loop(ctx, noiseBuffer(ctx, 'white'))
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 500
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 5000
    const wobble = ctx.createGain()
    wobble.gain.value = 0.7
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.15
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.2
    lfo.connect(lfoDepth).connect(wobble.gain)
    src.connect(high).connect(low).connect(wobble).connect(master)
    src.start()
    lfo.start()
    sources.push(src, lfo)
  }

  if (id === 'waves') {
    // Noise through a low-pass filter that opens and closes with the swell,
    // so each wave rushes in brighter and drains away softer (~9 s apart).
    const src = loop(ctx, noiseBuffer(ctx, 'white'))
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 700
    const swell = ctx.createGain()
    swell.gain.value = 0.55
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.11
    const loudness = ctx.createGain()
    loudness.gain.value = 0.4
    const brightness = ctx.createGain()
    brightness.gain.value = 450
    lfo.connect(loudness).connect(swell.gain)
    lfo.connect(brightness).connect(lowpass.frequency)
    src.connect(lowpass).connect(swell).connect(master)
    src.start()
    lfo.start()
    sources.push(src, lfo)
  }

  if (id === 'keys') {
    timer = startGentleKeys(ctx, master, sources)
  }

  if (id === 'lake') {
    timer = startSunsetLake(ctx, master, sources)
  }

  if (id === 'tanpura') {
    // Four plucked strings (Pa, Sa, Sa, low Sa) repeating, each a soft sawtooth
    // through a low-pass filter with a long decay, overlapping into a drone.
    const SA = 130.81
    const pattern = [SA * 0.75, SA, SA, SA / 2]
    let step = 0
    const pluck = () => {
      const t = ctx.currentTime
      const freq = pattern[step % pattern.length]
      step++
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1400
      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, t)
      env.gain.exponentialRampToValueAtTime(0.18, t + 0.04)
      env.gain.exponentialRampToValueAtTime(0.0001, t + 4.5)
      filter.connect(env).connect(master)
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = freq
        osc.detune.value = detune
        osc.connect(filter)
        osc.start(t)
        osc.stop(t + 4.6)
      }
    }
    pluck()
    timer = setInterval(pluck, 1150)
  }

  return {
    setVolume(v: number) {
      // Cancel a fade-in still under way, or it would end at the old volume.
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.setTargetAtTime(v, t, 0.2)
    },
    stop() {
      if (timer) clearInterval(timer)
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + 0.6)
      setTimeout(() => {
        for (const s of sources) {
          try {
            s.stop()
          } catch {
            /* already stopped */
          }
        }
        void ctx.close()
      }, 700)
    },
  }
}

let chimeContext: AudioContext | null = null

/**
 * Create/resume the chime's audio context from a user tap. iOS only lets audio
 * start inside a gesture, so the focus coach calls this on "Start".
 */
export function primeAudio(): void {
  const Ctor = audioContextCtor()
  if (!Ctor) return
  chimeContext ??= new Ctor()
  if (chimeContext.state === 'suspended') void chimeContext.resume()
}

/** A short, soft two-note chime for the focus timer. */
export function playChime(): void {
  primeAudio()
  const ctx = chimeContext
  if (!ctx) return
  const t = ctx.currentTime
  ;[659.25, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t + i * 0.25)
    env.gain.exponentialRampToValueAtTime(0.2, t + i * 0.25 + 0.03)
    env.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.25 + 1.2)
    osc.connect(env).connect(ctx.destination)
    osc.start(t + i * 0.25)
    osc.stop(t + i * 0.25 + 1.3)
  })
}
