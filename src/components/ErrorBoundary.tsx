/**
 * ErrorBoundary — a safety net so an unexpected render error never leaves a
 * student staring at a blank screen. It shows a calm, reassuring fallback and a
 * way to recover, in keeping with the supportive tone of the app.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
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
    // Log for debugging; never surfaces sensitive data to the student.
    console.error('Unexpected UI error:', error, info.componentStack)
  }

  private handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
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
        </section>
      </main>
    )
  }
}
