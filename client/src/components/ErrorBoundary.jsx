import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error('Unhandled UI error:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-grouped text-label flex items-center justify-center p-6">
        <div role="alert" className="card max-w-sm w-full p-8 text-center space-y-3">
          <h1 className="text-title2">This screen could not be shown</h1>
          <p className="text-subheadline text-secondary">
            The queue and bookings on the server are unaffected. Try again, or reload the page if it happens twice.
          </p>
          {this.state.error.message && (
            <p className="text-caption font-mono text-tertiary break-words">{this.state.error.message}</p>
          )}
          <div className="flex flex-col gap-2.5 pt-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Reload page
            </button>
            <button type="button" onClick={() => this.setState({ error: null })} className="btn-ghost">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
