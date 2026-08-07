import { useCallback, useEffect, useState } from 'react'
import { ResearchDisclaimer } from './components/ResearchDisclaimer'
import {
  API_BASE_URL,
  createSession,
  fetchHealth,
  getSession,
  postConsent,
  postIntake,
  type IntakePayload,
  type SessionResponse,
} from './lib/api'
import {
  clearSessionId,
  loadSessionId,
  saveSessionId,
} from './lib/sessionStorage'
import { Consent, type ConsentFormValues } from './pages/Consent'
import { Intake } from './pages/Intake'
import { Welcome } from './pages/Welcome'
import './App.css'

type View = 'welcome' | 'consent' | 'intake'
type BackendLabel = 'checking…' | 'ok' | 'error'

function stageToView(stage: SessionResponse['stage']): View {
  if (stage === 'created') return 'consent'
  return 'intake'
}

function App() {
  const [backendLabel, setBackendLabel] = useState<BackendLabel>('checking…')
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [view, setView] = useState<View>('welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredId, setHasStoredId] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then(() => {
        if (!cancelled) setBackendLabel('ok')
      })
      .catch(() => {
        if (!cancelled) setBackendLabel('error')
      })
    setHasStoredId(Boolean(loadSessionId()))
    return () => {
      cancelled = true
    }
  }, [])

  const applySession = useCallback((next: SessionResponse) => {
    saveSessionId(next.id)
    setSession(next)
    setView(stageToView(next.stage))
    setHasStoredId(true)
    setError(null)
  }, [])

  const handleStart = async () => {
    setBusy(true)
    setError(null)
    try {
      clearSessionId()
      const created = await createSession()
      applySession(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start session')
    } finally {
      setBusy(false)
    }
  }

  const handleResume = async () => {
    const id = loadSessionId()
    if (!id) {
      setError('No saved session id in this browser tab.')
      setHasStoredId(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const resumed = await getSession(id)
      applySession(resumed)
    } catch (err) {
      clearSessionId()
      setHasStoredId(false)
      setSession(null)
      setView('welcome')
      setError(
        err instanceof Error
          ? err.message
          : 'Could not resume session (it may have expired)',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleConsent = async (values: ConsentFormValues) => {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const next = await postConsent(session.id, values)
      applySession(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consent failed')
    } finally {
      setBusy(false)
    }
  }

  const handleIntake = async (payload: IntakePayload) => {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const next = await postIntake(session.id, payload)
      applySession(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Intake failed')
    } finally {
      setBusy(false)
    }
  }

  const goWelcome = () => {
    setView('welcome')
    setError(null)
  }

  const goBackFromIntake = () => {
    // Cannot undo consent server-side; return to welcome overview only.
    setView('welcome')
    setError(null)
  }

  return (
    <div className="app-shell">
      <ResearchDisclaimer />
      <main className="app-main">
        <header>
          <h1>ASD Insight Companion</h1>
          <p className="tagline">
            Research-only ASD-trait prescreen prototype (Phase 1: consent &
            intake)
          </p>
          {session && (
            <p className="muted session-meta">
              Session {session.id.slice(0, 8)}… · stage: {session.stage} · API{' '}
              {API_BASE_URL}
            </p>
          )}
        </header>

        {view === 'welcome' && (
          <Welcome
            backendLabel={backendLabel}
            busy={busy}
            error={error}
            onStart={() => void handleStart()}
            onResume={hasStoredId ? () => void handleResume() : null}
          />
        )}

        {view === 'consent' && session && (
          <Consent
            busy={busy}
            error={error}
            onSubmit={(v) => void handleConsent(v)}
            onBack={goWelcome}
          />
        )}

        {view === 'intake' && session && (
          <Intake
            busy={busy}
            error={error}
            readOnlySummary={
              session.stage === 'intake_complete' && session.intake
                ? {
                    age_range: session.intake.age_range,
                    language: session.intake.language,
                    accessibility_prefs: session.intake.accessibility_prefs,
                    optional_context: session.intake.optional_context,
                  }
                : null
            }
            onSubmit={(p) => void handleIntake(p)}
            onBack={goBackFromIntake}
          />
        )}
      </main>
    </div>
  )
}

export default App
