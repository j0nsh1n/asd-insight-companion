import { useEffect, useState } from 'react'
import { ResearchDisclaimer } from './components/ResearchDisclaimer'
import { API_BASE_URL, fetchHealth, type HealthResponse } from './lib/api'
import './App.css'

type BackendStatus =
  | { state: 'loading' }
  | { state: 'ok'; data: HealthResponse }
  | { state: 'error'; message: string }

function App() {
  const [backend, setBackend] = useState<BackendStatus>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then((data) => {
        if (!cancelled) setBackend({ state: 'ok', data })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Unable to reach backend'
          setBackend({ state: 'error', message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app-shell">
      <ResearchDisclaimer />
      <main className="app-main">
        <header>
          <h1>ASD Insight Companion</h1>
          <p className="tagline">
            Research-only ASD-trait prescreen prototype (Phase 0 shell)
          </p>
        </header>

        <section className="status-card" aria-live="polite">
          <h2>Backend health</h2>
          <p className="muted">API base: {API_BASE_URL}</p>
          {backend.state === 'loading' && <p>Checking…</p>}
          {backend.state === 'ok' && (
            <p className="status-ok">
              Backend: ok ({backend.data.service} v{backend.data.version})
            </p>
          )}
          {backend.state === 'error' && (
            <p className="status-error">Backend: error — {backend.message}</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
