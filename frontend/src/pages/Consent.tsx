import { useState } from 'react'

export type ConsentFormValues = {
  research_only: boolean
  no_diagnosis: boolean
  data_minimization: boolean
}

type ConsentProps = {
  busy: boolean
  error: string | null
  onSubmit: (values: ConsentFormValues) => void
  onBack: () => void
}

export function Consent({ busy, error, onSubmit, onBack }: ConsentProps) {
  const [researchOnly, setResearchOnly] = useState(false)
  const [noDiagnosis, setNoDiagnosis] = useState(false)
  const [dataMinimization, setDataMinimization] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!researchOnly || !noDiagnosis || !dataMinimization) {
      setLocalError(
        'Consent is incomplete. All three statements must be accepted to continue.',
      )
      return
    }
    setLocalError(null)
    onSubmit({
      research_only: researchOnly,
      no_diagnosis: noDiagnosis,
      data_minimization: dataMinimization,
    })
  }

  return (
    <section className="panel" aria-labelledby="consent-title">
      <h2 id="consent-title">Consent</h2>
      <p className="muted">
        Fail-closed: you cannot continue to intake unless every item is accepted.
        This tool never diagnoses autism.
      </p>
      <form onSubmit={handleSubmit} className="form-stack">
        <label className="check-row">
          <input
            type="checkbox"
            checked={researchOnly}
            onChange={(e) => setResearchOnly(e.target.checked)}
          />
          <span>
            I understand this is a <strong>research-only prototype</strong>, not
            clinical care.
          </span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={noDiagnosis}
            onChange={(e) => setNoDiagnosis(e.target.checked)}
          />
          <span>
            I understand this tool <strong>does not diagnose autism</strong> or any
            medical condition.
          </span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={dataMinimization}
            onChange={(e) => setDataMinimization(e.target.checked)}
          />
          <span>
            I agree to minimized, anonymous research data only (no raw webcam
            video upload by default).
          </span>
        </label>
        {(localError || error) && (
          <p className="status-error">{localError ?? error}</p>
        )}
        <div className="button-row">
          <button type="button" className="btn" disabled={busy} onClick={onBack}>
            Back
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Accept and continue'}
          </button>
        </div>
      </form>
    </section>
  )
}
