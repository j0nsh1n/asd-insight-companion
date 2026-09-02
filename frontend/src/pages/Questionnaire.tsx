import { useEffect, useRef, useState } from 'react'
import type {
  QuestionBank,
  QuestionItem,
  ScaleOption,
  SessionResponse,
  StoredQuestionResponse,
} from '../lib/api'
import {
  fetchQuestionBank,
  fetchQuestionnaireProgress,
  postQuestionResponse,
  postQuestionnaireComplete,
} from '../lib/api'
import {
  friendlyError,
  isQuestionnaireAlreadyComplete,
} from '../lib/friendlyError'

type QuestionnaireProps = {
  sessionId: string
  initialSession: SessionResponse
  onSessionUpdate: (session: SessionResponse) => void
  onBack: () => void
}

function isoNow(): string {
  return new Date().toISOString()
}

export function Questionnaire({
  sessionId,
  initialSession,
  onSessionUpdate,
  onBack,
}: QuestionnaireProps) {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [session, setSession] = useState(initialSession)
  const [answered, setAnswered] = useState<
    Record<string, StoredQuestionResponse>
  >({})
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** All required items answered but complete not yet finalized (resume path). */
  const [readyToFinish, setReadyToFinish] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')

  const shownAtRef = useRef<string>(isoNow())
  const firstInteractionMsRef = useRef<number | null>(null)
  const changeCountRef = useRef(0)
  const questionStartedPerfRef = useRef(performance.now())
  const questionHeadingRef = useRef<HTMLParagraphElement | null>(null)
  const submitLockRef = useRef(false)

  const items = bank?.items ?? []
  const current: QuestionItem | null =
    readyToFinish || index >= items.length ? null : (items[index] ?? null)
  const isComplete = session.stage === 'questionnaire_complete'
  const progressLabel = bank
    ? `${Math.min(index + 1, Math.max(items.length, 1))} / ${items.length}`
    : '…'

  const scale: ScaleOption[] = bank?.scale ?? []

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [b, progress] = await Promise.all([
          fetchQuestionBank(),
          fetchQuestionnaireProgress(sessionId),
        ])
        if (cancelled) return
        setBank(b)
        setSession(progress.session)
        onSessionUpdate(progress.session)
        setAnswered(progress.answered)

        if (progress.session.stage === 'questionnaire_complete') {
          setIndex(b.items.length)
          setReadyToFinish(false)
          return
        }

        const nextId = progress.next_question_id
        if (
          nextId === null &&
          progress.session.stage === 'questionnaire_in_progress' &&
          progress.answered_count >= progress.required_count
        ) {
          // Last answers saved but complete never finished — offer Finish.
          setReadyToFinish(true)
          setIndex(b.items.length)
          setLiveMessage(
            'All questions answered. Use Finish questionnaire to complete.',
          )
          return
        }

        setReadyToFinish(false)
        const nextIndex = nextId
          ? b.items.findIndex((i) => i.id === nextId)
          : 0
        setIndex(nextIndex >= 0 ? nextIndex : 0)
      } catch (err) {
        if (!cancelled) {
          setError(friendlyError(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, onSessionUpdate])

  // Reset per-question timing when the visible item changes; announce progress.
  useEffect(() => {
    if (!current || !bank) return
    shownAtRef.current = isoNow()
    firstInteractionMsRef.current = null
    changeCountRef.current = 0
    questionStartedPerfRef.current = performance.now()
    const prior = answered[current.id]
    setSelected(prior ? prior.answer_value : null)
    setLiveMessage(
      `Question ${index + 1} of ${bank.items.length}. ${current.text}`,
    )
    // Move focus to question text for keyboard / SR continuity.
    questionHeadingRef.current?.focus()
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- reset on question id only

  const markInteraction = () => {
    if (firstInteractionMsRef.current === null) {
      firstInteractionMsRef.current = Math.max(
        0,
        Math.round(performance.now() - questionStartedPerfRef.current),
      )
    }
  }

  const handleSelect = (value: number) => {
    markInteraction()
    if (selected !== null && selected !== value) {
      changeCountRef.current += 1
    }
    setSelected(value)
  }

  const applyAlreadyComplete = async () => {
    const progress = await fetchQuestionnaireProgress(sessionId)
    setSession(progress.session)
    onSessionUpdate(progress.session)
    setReadyToFinish(false)
    setLiveMessage('Questionnaire complete.')
  }

  const handleFinish = async () => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setBusy(true)
    setError(null)
    try {
      const completed = await postQuestionnaireComplete(sessionId)
      setSession(completed)
      onSessionUpdate(completed)
      setReadyToFinish(false)
      setLiveMessage('Questionnaire complete.')
    } catch (err) {
      if (isQuestionnaireAlreadyComplete(err)) {
        try {
          await applyAlreadyComplete()
        } catch (inner) {
          setError(friendlyError(inner))
        }
      } else {
        setError(friendlyError(err))
      }
    } finally {
      submitLockRef.current = false
      setBusy(false)
    }
  }

  const handleNext = async () => {
    if (!current || selected === null || !bank) return
    if (submitLockRef.current) return
    submitLockRef.current = true
    setBusy(true)
    setError(null)
    const answeredAt = isoNow()
    const totalMs = Math.max(
      0,
      Math.round(performance.now() - questionStartedPerfRef.current),
    )
    const ttf =
      firstInteractionMsRef.current === null
        ? totalMs
        : firstInteractionMsRef.current

    try {
      const result = await postQuestionResponse({
        session_id: sessionId,
        question_id: current.id,
        answer_value: selected,
        shown_at: shownAtRef.current,
        answered_at: answeredAt,
        time_to_first_interaction_ms: ttf,
        total_time_on_question_ms: Math.max(totalMs, ttf),
        answer_change_count: changeCountRef.current,
      })
      setSession(result.session)
      onSessionUpdate(result.session)
      setAnswered((prev) => ({
        ...prev,
        [result.response.question_id]: result.response,
      }))

      const isLast = index >= bank.items.length - 1
      if (isLast) {
        const completed = await postQuestionnaireComplete(sessionId)
        setSession(completed)
        onSessionUpdate(completed)
        setIndex(bank.items.length)
        setReadyToFinish(false)
        setLiveMessage('Questionnaire complete.')
      } else {
        setIndex((i) => i + 1)
      }
    } catch (err) {
      if (isQuestionnaireAlreadyComplete(err)) {
        try {
          await applyAlreadyComplete()
        } catch (inner) {
          setError(friendlyError(inner))
        }
      } else {
        setError(friendlyError(err))
      }
    } finally {
      submitLockRef.current = false
      setBusy(false)
    }
  }

  const answeredCount = Object.keys(answered).length

  if (loading) {
    return (
      <section className="panel">
        <h2>Questionnaire</h2>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (isComplete) {
    return (
      <section className="panel" aria-labelledby="q-done-title">
        <h2 id="q-done-title">Questionnaire complete</h2>
        <p className="status-ok">
          The questionnaire portion of this research session is complete. Your
          responses were saved.
        </p>
        <p className="muted">
          This is a research prototype only. It does not diagnose autism or any
          medical condition, and results are not clinical advice.
        </p>
        <div className="button-row">
          <button type="button" className="btn" onClick={onBack}>
            Back to welcome
          </button>
        </div>
      </section>
    )
  }

  if (readyToFinish && bank) {
    return (
      <section className="panel" aria-labelledby="q-finish-title">
        <h2 id="q-finish-title">Finish questionnaire</h2>
        <p className="muted">
          All {bank.required_count} required items are saved. Confirm to
          complete this research questionnaire portion.
        </p>
        <div className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </div>
        {error && (
          <p className="status-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <button type="button" className="btn" disabled={busy} onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void handleFinish()}
          >
            {busy ? 'Saving…' : 'Finish questionnaire'}
          </button>
        </div>
      </section>
    )
  }

  if (!bank || !current) {
    return (
      <section className="panel">
        <h2>Questionnaire</h2>
        <p className="status-error" role="alert">
          {error ?? 'No questions available.'}
        </p>
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
      </section>
    )
  }

  const pct = Math.round((index / bank.items.length) * 100)

  return (
    <section className="panel" aria-labelledby="q-title">
      <h2 id="q-title">Self-report questionnaire</h2>
      <aside
        className="placeholder-instrument-banner"
        role="note"
        aria-label="Placeholder instrument notice"
      >
        Placeholder questionnaire for development purposes only. Not a validated
        clinical instrument.
      </aside>
      <p className="muted bank-label">{bank.label}</p>
      <p className="muted">
        Adults 18+. Research prescreening items, one at a time. Timing metadata
        (time to first response, total time on question, answer changes) is
        recorded for research only.
      </p>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      <div className="progress-block" aria-label={`Progress ${progressLabel}`}>
        <div className="progress-meta">
          <span>
            Question {index + 1} of {bank.items.length}
          </span>
          <span>{answeredCount} saved</span>
        </div>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p
        className="question-text"
        id={`question-text-${current.id}`}
        ref={questionHeadingRef}
        tabIndex={-1}
      >
        {current.text}
      </p>

      <div
        className="scale-options"
        role="group"
        aria-labelledby={`question-text-${current.id}`}
      >
        {scale.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected === opt.value}
            className={
              selected === opt.value ? 'btn scale-btn selected' : 'btn scale-btn'
            }
            disabled={busy}
            onClick={() => handleSelect(opt.value)}
          >
            <span className="scale-value">{opt.value}</span>
            <span className="scale-label">{opt.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}

      <div className="button-row">
        <button type="button" className="btn" disabled={busy} onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || selected === null}
          onClick={() => void handleNext()}
        >
          {busy
            ? 'Saving…'
            : index >= bank.items.length - 1
              ? 'Save and finish'
              : 'Next'}
        </button>
      </div>
    </section>
  )
}
