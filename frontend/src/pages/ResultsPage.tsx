import { useEffect, useState } from 'react'
import { DataQualityCard } from '../components/DataQualityCard'
import { ResearchTaskSummary } from '../components/ResearchTaskSummary'
import { SafetyNotice } from '../components/SafetyNotice'
import { fetchResearchSummary } from '../lib/api'
import type { ResearchSessionSummary } from '../types/assessment'

type ResultsPageProps = {
  sessionId: string
  loadError: string | null
  onBack: () => void
}

function friendlyLoadError(message: string): string {
  if (message === 'session_not_found') {
    return 'This research session was not found.'
  }
  if (message === 'consent_required') {
    return 'Consent is required before a session summary can be shown.'
  }
  return message
}

export function ResultsPage({
  sessionId,
  loadError,
  onBack,
}: ResultsPageProps) {
  const [summary, setSummary] = useState<ResearchSessionSummary | null>(null)
  const [error, setError] = useState<string | null>(loadError)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchResearchSummary(sessionId)
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSummary(null)
          setError(
            err instanceof Error
              ? friendlyLoadError(err.message)
              : 'Could not load the research-session summary',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <section className="panel results-panel" aria-labelledby="results-title">
      <h2 id="results-title">Research-session summary</h2>
      <SafetyNotice />

      {loading && <p>Loading stored research-task notes…</p>}
      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <>
          <p className="muted">
            Session status:{' '}
            <strong>{summary.status.replaceAll('_', ' ')}</strong>
          </p>
          <p>{summary.explanation.summary}</p>
          <DataQualityCard quality={summary.data_quality} />
          <section className="result-card" aria-labelledby="available-title">
            <h2 id="available-title">What this session includes</h2>
            {summary.explanation.available_data.length > 0 ? (
              <ul>
                {summary.explanation.available_data.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>No stored research-task data is available to display.</p>
            )}
          </section>
          <section className="result-card" aria-labelledby="limited-title">
            <h2 id="limited-title">Unavailable or limited data</h2>
            <ul>
              {summary.explanation.unavailable_or_limited_data.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <ResearchTaskSummary
            observations={summary.research_task_observations}
          />
          <section className="result-card" aria-labelledby="limits-title">
            <h2 id="limits-title">Limitations</h2>
            <ul>
              {summary.explanation.limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section className="result-card" aria-labelledby="next-title">
            <h2 id="next-title">If you have questions</h2>
            {summary.explanation.next_steps.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        </>
      )}

      <div className="button-row">
        <button type="button" className="btn" onClick={onBack}>
          Back to welcome
        </button>
      </div>
    </section>
  )
}
