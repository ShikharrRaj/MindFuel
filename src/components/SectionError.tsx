/**
 * SectionError — shown when one section fails (e.g. its code could not load
 * offline). The header, the other tabs and "Calm now" keep working, and the
 * helplines are right here.
 */

import HelpNow from './HelpNow'

export default function SectionError() {
  return (
    <section className="card" aria-labelledby="section-error-title">
      <h2 id="section-error-title">This section could not load</h2>
      <p className="muted" role="alert">
        Check your connection, then reload. Everything else still works,
        including the “Calm now” button at the top.
      </p>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
      <HelpNow title="If you need support right now" />
    </section>
  )
}
