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
  type SessionStage,
} from './lib/api'
import type { LocalFeatureSummary } from './lib/localFeatures'
import {
  clearSessionId,
  loadSessionId,
  saveSessionId,
} from './lib/sessionStorage'
import { Calibration } from './pages/Calibration'
import { CameraCheck } from './pages/CameraCheck'
import { Consent, type ConsentFormValues } from './pages/Consent'
import { Intake } from './pages/Intake'
import { Questionnaire } from './pages/Questionnaire'
import { StimulusTask } from './pages/StimulusTask'
import { Welcome } from './pages/Welcome'
import './App.css'

type View =
  | 'welcome'
  | 'consent'
  | 'intake'
  | 'questionnaire'
  | 'camera'
  | 'calibration'
  | 'stimulus'
  | 'session_done'
type BackendLabel = 'checking…' | 'ok' | 'error'

function stageToView(stage: SessionStage): View {
  if (stage === 'created') return 'consent'
  if (stage === 'consented') return 'intake'
  if (stage === 'intake_complete' || stage === 'questionnaire_in_progress') {
    return 'questionnaire'
  }
  // After questionnaire: camera → calibration → stimulus (client-local steps).
  if (stage === 'questionnaire_complete') return 'camera'
  return 'welcome'
}

function App() {
  const [backendLabel, setBackendLabel] = useState<BackendLabel>('checking…')
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [view, setView] = useState<View>('welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredId, setHasStoredId] = useState(false)
  const [featureSummary, setFeatureSummary] =
    useState<LocalFeatureSummary | null>(null)

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
    const stored = saveSessionId(next.id)
    setSession(next)
    setView((prev) => {
      // Preserve late client-only steps after questionnaire_complete.
      if (
        next.stage === 'questionnaire_complete' &&
        (prev === 'calibration' ||
          prev === 'stimulus' ||
          prev === 'session_done')
      ) {
        return prev
      }
      return stageToView(next.stage)
    })
    setHasStoredId(stored)
    setError(null)
  }, [])

  const showWelcome = useCallback(() => {
    setView('welcome')
    setError(null)
  }, [])

  const handleStart = async () => {
    setBusy(true)
    setError(null)
    try {
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

  const prefs = session?.intake?.accessibility_prefs
  const shellClasses = [
    'app-shell',
    prefs?.large_text ? 'a11y-large-text' : '',
    prefs?.reduced_motion ? 'a11y-reduced-motion' : '',
    prefs?.screen_reader_hints ? 'a11y-screen-reader-hints' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClasses}>
      <ResearchDisclaimer />
      <main
        className="app-main"
        {...(prefs?.screen_reader_hints
          ? { 'aria-describedby': 'a11y-hints-note' }
          : {})}
      >
        {prefs?.screen_reader_hints && (
          <p id="a11y-hints-note" className="sr-only">
            Screen reader hints are enabled for this session. Progress and
            errors are announced when they change.
          </p>
        )}
        <header>
          <h1>ASD Insight Companion</h1>
          <p className="tagline">
            Research-only ASD-trait prescreen prototype (Phase 3C: calibration
            + stimulus)
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
            onBack={showWelcome}
          />
        )}

        {view === 'intake' && session && (
          <Intake
            busy={busy}
            error={error}
            readOnlySummary={null}
            onSubmit={(p) => void handleIntake(p)}
            onBack={showWelcome}
          />
        )}

        {view === 'questionnaire' && session && (
          <Questionnaire
            sessionId={session.id}
            initialSession={session}
            onSessionUpdate={applySession}
            onBack={showWelcome}
          />
        )}

        {view === 'camera' && session && (
          <CameraCheck
            onBack={showWelcome}
            onComplete={() => {
              setView('calibration')
              setError(null)
            }}
          />
        )}

        {view === 'calibration' && (
          <Calibration
            onBack={() => setView('camera')}
            onComplete={() => {
              setView('stimulus')
              setError(null)
            }}
          />
        )}

        {view === 'stimulus' && (
          <StimulusTask
            onBack={() => setView('calibration')}
            onComplete={(summary) => {
              setFeatureSummary(summary)
              setView('session_done')
              setError(null)
            }}
          />
        )}

        {view === 'session_done' && (
          <section className="panel" aria-labelledby="done-title">
            <h2 id="done-title">Session complete (research prototype)</h2>
            <p className="status-ok">
              Calibration and stimulus steps finished. Webcam streams were
              stopped in this browser.
            </p>
            <p className="muted">
              No webcam video or images were uploaded. Optional local face
              sampling is summarized as numbers only for research logging later.
            </p>
            {featureSummary && (
              <ul className="summary-list">
                <li>Local samples: {featureSummary.sample_count}</li>
                <li>
                  Single-face fraction:{' '}
                  {(featureSummary.fraction_single_face * 100).toFixed(0)}%
                </li>
                <li>Media uploaded: {String(featureSummary.media_uploaded)}</li>
              </ul>
            )}
            <div className="button-row">
              <button type="button" className="btn" onClick={showWelcome}>
                Back to welcome
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
