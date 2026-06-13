/**
 * SiteHeader — the brand bar plus a context chip that surfaces the student's
 * exam and countdown, making the app's context-awareness visible at a glance.
 */

interface Props {
  /** e.g. "JEE · 9 days to go". Omitted before onboarding. */
  context?: string
  /** e.g. "Final sprint". */
  phaseLabel?: string
}

export default function SiteHeader({ context, phaseLabel }: Props) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <div>
            <span className="brand">
              MindFuel<span className="brand__dot">.</span>
            </span>
            <span className="brand__tag">Exam wellness companion</span>
          </div>
          {context && (
            <span className="context-chip">
              <strong>{context}</strong>
              {phaseLabel ? ` · ${phaseLabel}` : ''}
            </span>
          )}
        </div>
      </header>
    </>
  )
}
