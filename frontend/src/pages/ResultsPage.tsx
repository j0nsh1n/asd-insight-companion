import { useCallback, useEffect, useState } from 'react'
import { DataQualityCard } from '../components/DataQualityCard'
import { ResearchTaskSummary } from '../components/ResearchTaskSummary'
import { SafetyNotice } from '../components/SafetyNotice'
import { fetchResearchSummary } from '../lib/api'
import { friendlyError } from '../lib/friendlyError'
import type { ResearchSessionSummary } from '../types/assessment'

type ResultsPageProps = {
  sessionId: string
  loadError: string | null
  suppressEstimates?: boolean
  onBack: () => void
}

export function ResultsPage({
  sessionId,
  loadError,
  suppressEstimates = false,
  onBack,
}: ResultsPageProps) {
  const [summary, setSummary] = useState<ResearchSessionSummary | null>(null)
  const [error, setError] = useState<string | null>(loadError)
  const [loading, setLoading] = useState(true)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setSummary(null)
    try {
      const data = await fetchResearchSummary(sessionId)
      setSummary(data)
      setError(null)
    } catch (err: unknown) {
      setSummary(null)
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  return (
    <section className="panel results-panel" aria-labelledby="results-title">
      <h2 id="results-title">Research-session summary</h2>
      <SafetyNotice />

      {loading && (
        <p role="status" aria-live="polite" aria-busy="true">
          Loading stored research-task notes…
        </p>
      )}
      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}
      {error && !loading && (
        <div className="button-row">
          <button type="button" className="btn primary" onClick={() => void loadSummary()}>
            Retry
          </button>
        </div>
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
            <h3 id="available-title">What this session includes</h3>
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
            <h3 id="limited-title">Unavailable or limited data</h3>
            <ul>
              {summary.explanation.unavailable_or_limited_data.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <ResearchTaskSummary
            observations={summary.research_task_observations}
            suppressEstimates={suppressEstimates}
          />
          <section className="result-card" aria-labelledby="limits-title">
            <h3 id="limits-title">Limitations</h3>
            <ul>
              {summary.explanation.limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section className="result-card" aria-labelledby="next-title">
            <h3 id="next-title">If you have questions</h3>
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
