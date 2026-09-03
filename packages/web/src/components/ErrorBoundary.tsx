import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the default panel — the root boundary has no layout
   *  around it, the inner one sits inside the page shell. */
  fallback?: (reset: () => void) => ReactNode;
  /** Changing this value clears a caught error: the layout passes the current
   *  path, so navigating away from a broken page recovers instead of leaving
   *  the reader stuck on the error screen. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * The last line of defence for a rendering crash. Without one, React unmounts
 * the whole tree and the reader is left with a blank white page and no way
 * back; with one, the failure is contained and named, and the rest of the
 * application keeps working.
 *
 * A class is not a style choice here: `componentDidCatch` and
 * `getDerivedStateFromError` have no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nothing collects this remotely — no third-party service may be called
    // (brief §8.3) — so the browser console is where it stays.
    console.error('[web] rendering error', error, info.componentStack);
  }

  private readonly reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <div className="empty-state" role="alert">
        <h2>Cette page n’a pas pu s’afficher</h2>
        <p>
          Une erreur inattendue est survenue. Le reste du site reste accessible ; vous pouvez
          réessayer.
        </p>
        <p style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="button button--primary" onClick={this.reset}>
            Réessayer
          </button>
        </p>
      </div>
    );
  }
}
