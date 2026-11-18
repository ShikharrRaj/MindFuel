/**
 * ErrorBoundary — a safety net so an unexpected render error never leaves a
 * student staring at a blank screen. It shows a calm, reassuring fallback and a
 * way to recover, in keeping with the supportive tone of the app.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../device/errorReporter'
import HelpNow from './HelpNow'

interface Props {
  children: ReactNode
  /**
   * Inline fallback for one section, so the rest of the app (incl. the SOS
   * button) keeps working. Omitted at the root: a full-page fallback is shown.
   */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log for debugging, and send a scrubbed report (no journal text).
    console.error('Unexpected UI error:', error, info.componentStack)
    reportError(error, 'boundary')
  }

  private handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <main className="app-main">
        <section className="card" role="alert">
          <h1>Something went off-track</h1>
          <p className="lead">
            Sorry — something on our side hiccupped. Your saved check-ins are
            safe on your device. Let&apos;s try again.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={this.handleReload}
          >
            Reload MindFuel
          </button>
          <HelpNow title="If you need support right now" />
        </section>
      </main>
    )
  }
}
