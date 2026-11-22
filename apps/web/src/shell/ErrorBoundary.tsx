import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ETERNALL crashed', error, info.componentStack);
  }

  private download = () => {
    const raw = window.localStorage.getItem('eternall:vault:plain') ?? '{}';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eternall-backup.json';
    a.click();
  };

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="recovery" role="alert">
        <h1 className="display page-title">A page tore.</h1>
        <p className="muted">Something unexpected went wrong. Your archive is safe in this browser — reload to continue, or download a backup first.</p>
        <div className="recovery__actions">
          <button type="button" className="btn btn--primary btn--m" onClick={() => window.location.reload()}>Reload</button>
          <button type="button" className="btn btn--ghost btn--m" onClick={this.download}>Download backup</button>
        </div>
      </main>
    );
  }
}
