/**
 * Soundscapes — offline background sound for focus or winding down, on the
 * Focus tab. Sounds are synthesised in the browser (see device/soundscape),
 * so nothing downloads, and they play from the one app-wide player, so they
 * keep going while the student uses other tabs.
 */

import type { AmbientPlayer } from '../hooks/useAmbientSound'
import SoundPicker from './SoundPicker'

export default function Soundscapes({ ambient }: { ambient: AmbientPlayer }) {
  if (!ambient.supported) {
    return (
      <section className="card" aria-labelledby="sounds-title">
        <p className="card__eyebrow">Soundscapes</p>
        <h2 id="sounds-title">Background sounds</h2>
        <p className="muted">Sounds are not supported in this browser.</p>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="sounds-title">
      <p className="card__eyebrow">Soundscapes · work offline</p>
      <h2 id="sounds-title">Background sounds</h2>
      <p className="muted">
        They keep playing while you use other tabs. Change or stop them any time
        from Music at the top of the page.
      </p>
      <SoundPicker ambient={ambient} />
    </section>
  )
}
