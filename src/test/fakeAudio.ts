/**
 * A do-nothing Web Audio context for tests: enough of the API for
 * device/soundscape to build its graphs, so hooks and the App can "play"
 * sounds under jsdom (which has no AudioContext).
 */

function param() {
  return {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  }
}

function node(): Record<string, unknown> {
  return {
    connect: (next: unknown) => next,
    disconnect() {},
    start() {},
    stop() {},
    gain: param(),
    frequency: param(),
    detune: param(),
    delayTime: param(),
    Q: param(),
    type: '',
    buffer: null,
    loop: false,
  }
}

export class FakeAudioContext {
  static created = 0
  currentTime = 0
  sampleRate = 100
  state = 'running'
  destination = node()
  constructor() {
    FakeAudioContext.created += 1
  }
  createGain = node
  createOscillator = node
  createBiquadFilter = node
  createDelay = node
  createBufferSource = node
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
  close() {
    return Promise.resolve()
  }
  resume() {
    return Promise.resolve()
  }
}
