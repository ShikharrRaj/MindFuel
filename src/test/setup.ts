import '@testing-library/jest-dom/vitest'

// Server tests (api/**) run in plain Node, with no DOM to patch.
const hasDom = typeof window !== 'undefined'

// jsdom doesn't implement matchMedia; our reduced-motion + theme hooks rely on it.
if (hasDom && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom doesn't implement scrollIntoView; the chat view calls it.
if (hasDom && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Node 25+ ships an experimental global `localStorage` that shadows jsdom's
// and lacks most methods unless Node runs with --localstorage-file. Use an
// in-memory Storage so tests behave the same on every Node version.
if (typeof globalThis.localStorage?.clear !== 'function') {
  class MemoryStorage implements Storage {
    #data = new Map<string, string>()
    get length() {
      return this.#data.size
    }
    clear() {
      this.#data.clear()
    }
    getItem(key: string) {
      return this.#data.get(key) ?? null
    }
    key(index: number) {
      return [...this.#data.keys()][index] ?? null
    }
    removeItem(key: string) {
      this.#data.delete(key)
    }
    setItem(key: string, value: string) {
      this.#data.set(key, String(value))
    }
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
}

// jsdom has no 2D canvas (and logs "not implemented"); scenes check for null
// and skip drawing. Scene drawing is tested with a fake context instead.
if (hasDom) {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement['getContext']
}
