import { useEffect, useMemo, useRef, useState } from 'react'
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

  const shownAtRef = useRef<string>(isoNow())
  const firstInteractionMsRef = useRef<number | null>(null)
  const changeCountRef = useRef(0)
  const questionStartedPerfRef = useRef(performance.now())

  const items = bank?.items ?? []
  const current: QuestionItem | null = items[index] ?? null
  const isComplete = session.stage === 'questionnaire_complete'
  const progressLabel = bank
    ? `${Math.min(index + 1, items.length)} / ${items.length}`
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
          return
        }

        const nextId = progress.next_question_id
        const nextIndex = nextId
          ? b.items.findIndex((i) => i.id === nextId)
          : b.items.length
        setIndex(nextIndex >= 0 ? nextIndex : 0)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load questionnaire')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, onSessionUpdate])

  // Reset per-question timing when the visible item changes.
  useEffect(() => {
    if (!current) return
    shownAtRef.current = isoNow()
    firstInteractionMsRef.current = null
    changeCountRef.current = 0
    questionStartedPerfRef.current = performance.now()
    const prior = answered[current.id]
    setSelected(prior ? prior.answer_value : null)
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional reset on question id

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
    } else if (selected === null) {
      // first selection is not a "change"
    }
    setSelected(value)
  }

  const handleNext = async () => {
    if (!current || selected === null || !bank) return
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
      } else {
        setIndex((i) => i + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save answer')
    } finally {
      setBusy(false)
    }
  }

  const answeredCount = useMemo(
    () => Object.keys(answered).length,
    [answered],
  )

  if (loading) {
    return (
      <section className="panel">
        <h2>Questionnaire</h2>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (isComplete) {
    const q = session.questionnaire
    return (
      <section className="panel" aria-labelledby="q-done-title">
        <h2 id="q-done-title">Questionnaire complete</h2>
        <p className="status-ok">Your responses were saved for this session.</p>
        <p className="muted">
          This is a research prototype only. Scores are for research logging,
          not a medical diagnosis or clinical screening result.
        </p>
        {q && (
          <ul className="summary-list">
            <li>Items answered: {q.item_count ?? answeredCount}</li>
            <li>
              Research log score (non-diagnostic): {q.score ?? '—'}
            </li>
            {q.timing && (
              <li>
                Total time on items: {q.timing.total_time_ms} ms · mean time{' '}
                {q.timing.mean_total_time_on_question_ms} ms
              </li>
            )}
          </ul>
        )}
        <div className="button-row">
          <button type="button" className="btn" onClick={onBack}>
            Back to welcome
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
      <h2 id="q-title">Questionnaire</h2>
      <p className="muted bank-label">{bank.label}</p>
      <p className="muted">
        Adults 18+. One item at a time. Timing metrics are recorded for research
        only.
      </p>

      <div className="progress-block" aria-label={`Progress ${progressLabel}`}>
        <div className="progress-meta">
          <span>
            Question {index + 1} of {bank.items.length}
          </span>
          <span>{answeredCount} saved</span>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="question-text">{current.text}</p>

      <div className="scale-options" role="group" aria-label="Response scale">
        {scale.map((opt) => (
          <button
            key={opt.value}
            type="button"
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
