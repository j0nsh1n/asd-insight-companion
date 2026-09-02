import { useCallback, useEffect, useRef, useState } from 'react'
import { ResearchDisclaimer } from './components/ResearchDisclaimer'
import {
  API_BASE_URL,
  createSession,
  fetchHealth,
  getSession,
  postConsent,
  postFeatures,
  postIntake,
  type IntakePayload,
  type SessionResponse,
} from './lib/api'
import {
  type AssessmentView,
  VIEW_ANNOUNCEMENTS,
  canRequestResults,
  resolveView,
  viewFromServerStage,
} from './lib/assessmentFlow'
import { friendlyError, isFeaturesAlreadyRecorded } from './lib/friendlyError'
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
import type { FeaturePayload } from './lib/stimulusTracking'
import { ResultsPage } from './pages/ResultsPage'
import { StimulusTaskPage } from './pages/StimulusTaskPage'
import { Welcome } from './pages/Welcome'
import './App.css'

export type BackendLabel = 'checking…' | 'ok' | 'error'
type CalibrationOutcome = 'passed' | 'limited'

function App() {
  const [backendLabel, setBackendLabel] = useState<BackendLabel>('checking…')
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [view, setView] = useState<AssessmentView>('welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredId, setHasStoredId] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<FeaturePayload | null>(
    null,
  )
  const [calibrationOutcome, setCalibrationOutcome] =
    useState<CalibrationOutcome>('limited')
  const submitLock = useRef(false)

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
      if (next.stage === 'questionnaire_complete') {
        if (prev === 'welcome') {
          return next.features_recorded ? 'results' : 'camera'
        }
        return resolveView(next, prev)
      }
      return viewFromServerStage(next.stage)
    })
    setHasStoredId(stored)
    setError(null)
  }, [])

  const showWelcome = useCallback(() => {
    setView('welcome')
    setError(null)
  }, [])

  const startOver = useCallback(() => {
    clearSessionId()
    setSession(null)
    setView('welcome')
    setError(null)
    setPendingPayload(null)
    setCalibrationOutcome('limited')
    setHasStoredId(false)
    submitLock.current = false
  }, [])

  const handleStart = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setPendingPayload(null)
    setCalibrationOutcome('limited')
    try {
      const created = await createSession()
      applySession(created)
    } catch (err) {
      setError(friendlyError(err))
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
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleConsent = async (values: ConsentFormValues) => {
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await postConsent(session.id, values)
      applySession(next)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleFeatures = async (payload: FeaturePayload) => {
    if (submitLock.current) return
    submitLock.current = true
    setPendingPayload(payload)
    setBusy(true)
    setError(null)
    setView('submitting_features')
    try {
      await postFeatures(payload)
      if (session) {
        setSession({ ...session, features_recorded: true })
      }
      setView('results')
    } catch (err) {
      if (isFeaturesAlreadyRecorded(err)) {
        if (session) {
          setSession({ ...session, features_recorded: true })
        }
        setView('results')
      } else {
        setError(friendlyError(err))
        setView('feature_error')
      }
    } finally {
      setBusy(false)
      submitLock.current = false
    }
  }

  const handleIntake = async (payload: IntakePayload) => {
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await postIntake(session.id, payload)
      applySession(next)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const prefs = session?.intake?.accessibility_prefs
  const shown = resolveView(session, view)
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
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <ResearchDisclaimer />
      <main
        id="main-content"
        className="app-main"
        tabIndex={-1}
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
            Research-only ASD-trait prescreen prototype
          </p>
          {session && (
            <p className="muted session-meta">
              Session {session.id.slice(0, 8)}… · stage: {session.stage} · API{' '}
              {API_BASE_URL}
            </p>
          )}
        </header>
        <div className="sr-only" role="status" aria-live="polite">
          Current step: {VIEW_ANNOUNCEMENTS[shown]}
        </div>

        {shown === 'welcome' && (
          <Welcome
            backendLabel={backendLabel}
            busy={busy}
            error={error}
            onStart={() => void handleStart()}
            onResume={hasStoredId ? () => void handleResume() : null}
          />
        )}

        {shown === 'consent' && session && (
          <Consent
            busy={busy}
            error={error}
            onSubmit={(v) => void handleConsent(v)}
            onBack={showWelcome}
          />
        )}

        {shown === 'intake' && session && (
          <Intake
            busy={busy}
            error={error}
            readOnlySummary={null}
            onSubmit={(p) => void handleIntake(p)}
            onBack={showWelcome}
          />
        )}

        {shown === 'questionnaire' && session && (
          <Questionnaire
            sessionId={session.id}
            initialSession={session}
            onSessionUpdate={applySession}
            onBack={showWelcome}
          />
        )}

        {shown === 'camera' && session && (
          <CameraCheck
            cameraAllowed={session.consent.camera_optional === true}
            onBack={showWelcome}
            onComplete={() => {
              setView('calibration')
              setError(null)
            }}
          />
        )}

        {shown === 'calibration' && (
          <Calibration
            cameraAllowed={session?.consent.camera_optional === true}
            onBack={() => setView('camera')}
            onComplete={(outcome) => {
              setCalibrationOutcome(outcome)
              setView('stimulus')
              setError(null)
            }}
          />
        )}

        {shown === 'stimulus' && session && (
          <StimulusTaskPage
            sessionId={session.id}
            cameraAllowed={session.consent.camera_optional === true}
            onBack={() => setView('calibration')}
            onSkip={(payload) => {
              void handleFeatures(payload)
            }}
          />
        )}

        {shown === 'submitting_features' && (
          <section className="panel" aria-labelledby="submit-title">
            <h2 id="submit-title">Saving numeric notes</h2>
            <p role="status" aria-live="polite">
              Saving anonymous numeric tracking notes. Camera sampling has
              stopped in this browser. Nothing is being scored.
            </p>
          </section>
        )}

        {shown === 'feature_error' && (
          <section className="panel" aria-labelledby="feat-err-title">
            <h2 id="feat-err-title">Could not save tracking notes</h2>
            <p className="status-error" role="alert">
              {error ??
                'The numeric summary was not stored. You can try again or continue to the session summary.'}
            </p>
            <p className="muted">
              This is not a diagnosis. No video was uploaded.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn primary"
                disabled={busy || !pendingPayload}
                onClick={() => {
                  if (pendingPayload) void handleFeatures(pendingPayload)
                }}
              >
                {busy ? 'Saving…' : 'Retry'}
              </button>
              {canRequestResults(session) && (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    setError(null)
                    setView('results')
                  }}
                >
                  Continue to session summary
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => setView('stimulus')}
              >
                Return to video task
              </button>
              <button type="button" className="btn" onClick={startOver}>
                Start over
              </button>
            </div>
          </section>
        )}

        {shown === 'results' && session && canRequestResults(session) && (
          <ResultsPage
            sessionId={session.id}
            loadError={error}
            suppressEstimates={calibrationOutcome === 'limited'}
            onBack={showWelcome}
          />
        )}
      </main>
    </div>
  )
}

export default App
