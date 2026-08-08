type WelcomeProps = {
  backendLabel: string
  busy: boolean
  error: string | null
  onStart: () => void
  onResume: (() => void) | null
}

export function Welcome({
  backendLabel,
  busy,
  error,
  onStart,
  onResume,
}: WelcomeProps) {
  return (
    <section className="panel" aria-labelledby="welcome-title">
      <h2 id="welcome-title">Welcome</h2>
      <p className="muted">
        This is a research-only, non-diagnostic ASD-trait prescreen prototype for
        adults 18 and older. Participation is anonymous. You must complete consent
        before any intake questions.
      </p>
      <p className="muted">Backend: {backendLabel}</p>
      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button type="button" className="btn primary" disabled={busy} onClick={onStart}>
          {busy ? 'Starting…' : 'Start anonymous session'}
        </button>
        {onResume && (
          <button type="button" className="btn" disabled={busy} onClick={onResume}>
            Resume saved session
          </button>
        )}
      </div>
    </section>
  )
}
