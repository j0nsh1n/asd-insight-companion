import { useState } from 'react'

export type ConsentFormValues = {
  research_only: boolean
  no_diagnosis: boolean
  data_minimization: boolean
  camera_optional: boolean
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
  const [cameraOptional, setCameraOptional] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const requiredAccepted = researchOnly && noDiagnosis && dataMinimization

  const setRequired = (checked: boolean) => {
    setResearchOnly(checked)
    setNoDiagnosis(checked)
    setDataMinimization(checked)
    if (checked) setLocalError(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!researchOnly || !noDiagnosis || !dataMinimization) {
      setLocalError(
        'Consent is incomplete. All three required statements must be accepted to continue.',
      )
      return
    }
    setLocalError(null)
    onSubmit({
      research_only: researchOnly,
      no_diagnosis: noDiagnosis,
      data_minimization: dataMinimization,
      camera_optional: cameraOptional,
    })
  }

  return (
    <section className="panel" aria-labelledby="consent-title">
      <h2 id="consent-title">Consent</h2>
      <p className="muted">
        Fail-closed: you cannot continue to intake unless the three required
        statements are accepted. The camera item is optional and can be
        declined. This tool never diagnoses autism.
      </p>
      <form onSubmit={handleSubmit} className="form-stack">
        <label className="check-row check-row-all">
          <input
            type="checkbox"
            checked={requiredAccepted}
            aria-label="Agree to all required consent statements"
            onChange={(e) => setRequired(e.target.checked)}
          />
          <span>
            <strong>Agree to all required</strong> consent statements below
          </span>
        </label>
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
            video upload by default), including per-question response timing,
            time-to-first-interaction, and answer-change counts.
          </span>
        </label>
        <label className="check-row check-row-optional">
          <input
            type="checkbox"
            checked={cameraOptional}
            aria-label="Optional — camera-based attention measures"
            onChange={(e) => setCameraOptional(e.target.checked)}
          />
          <span>
            <strong>Optional — camera-based attention measures</strong>
            <br />
            I agree to let this research prototype use my camera during the
            attention task. Video is analysed on my own device to measure
            things like whether a face is visible and how the head is
            positioned. The video is never recorded, uploaded, or stored —
            only anonymous numeric summaries are produced, and they stay on
            this device.
            <br />
            Camera-based measures are a core part of what this research is
            exploring, so including them makes a session more useful as
            research data. This step is optional — you can decline and
            complete everything else. This tool does not diagnose autism or
            any condition, with or without the camera.
          </span>
        </label>
        {(localError || error) && (
          <p className="status-error" role="alert">
            {localError ?? error}
          </p>
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
