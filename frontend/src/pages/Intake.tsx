import { useState } from 'react'
import type { AccessibilityPrefs, IntakePayload } from '../lib/api'

const AGE_RANGES = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
  'prefer_not_to_say',
] as const

type IntakeProps = {
  busy: boolean
  error: string | null
  readOnlySummary: IntakePayload | null
  onSubmit: (payload: IntakePayload) => void
  onBack: () => void
}

export function Intake({
  busy,
  error,
  readOnlySummary,
  onSubmit,
  onBack,
}: IntakeProps) {
  const [ageRange, setAgeRange] = useState<string>(AGE_RANGES[0])
  const [language, setLanguage] = useState('en')
  const [prefs, setPrefs] = useState<AccessibilityPrefs>({
    large_text: false,
    reduced_motion: false,
    screen_reader_hints: false,
  })
  const [optionalContext, setOptionalContext] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  if (readOnlySummary) {
    return (
      <section className="panel" aria-labelledby="intake-title">
        <h2 id="intake-title">Intake complete</h2>
        <p className="status-ok">Your minimized intake was saved for this session.</p>
        <ul className="summary-list">
          <li>Age range: {readOnlySummary.age_range}</li>
          <li>Language: {readOnlySummary.language}</li>
          <li>
            Accessibility: large text=
            {String(readOnlySummary.accessibility_prefs.large_text)}, reduced
            motion=
            {String(readOnlySummary.accessibility_prefs.reduced_motion)}, screen
            reader hints=
            {String(readOnlySummary.accessibility_prefs.screen_reader_hints)}
          </li>
          <li>
            Optional context:{' '}
            {readOnlySummary.optional_context ?? '(none)'}
          </li>
        </ul>
        <p className="muted">
          When you continue, the next step is a timed research-inspired
          questionnaire (not an official diagnostic instrument).
        </p>
      </section>
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!ageRange || !language.trim()) {
      setLocalError('Age range and language are required.')
      return
    }
    setLocalError(null)
    onSubmit({
      age_range: ageRange,
      language: language.trim(),
      accessibility_prefs: prefs,
      optional_context: optionalContext.trim() || null,
    })
  }

  return (
    <section className="panel" aria-labelledby="intake-title">
      <h2 id="intake-title">Intake</h2>
      <p className="muted">
        Minimized research fields only. No names, contact details, or diagnostic
        claims.
      </p>
      <form onSubmit={handleSubmit} className="form-stack">
        <label className="field">
          <span>Age range</span>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            required
          >
            {AGE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="field-hint">
            Eligible ages are 18 and older (research prototype; not for minors).
          </span>
        </label>
        <label className="field">
          <span>Language</span>
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            maxLength={32}
            required
          />
        </label>
        <fieldset className="fieldset">
          <legend>Accessibility preferences</legend>
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.large_text}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, large_text: e.target.checked }))
              }
            />
            <span>Large text</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.reduced_motion}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, reduced_motion: e.target.checked }))
              }
            />
            <span>Reduced motion</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.screen_reader_hints}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  screen_reader_hints: e.target.checked,
                }))
              }
            />
            <span>Screen reader hints</span>
          </label>
        </fieldset>
        <label className="field">
          <span>Optional context (max 500 characters)</span>
          <textarea
            value={optionalContext}
            onChange={(e) => setOptionalContext(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <span className="field-hint">
            Do not enter your name, email, phone number, or address.
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
            {busy ? 'Saving…' : 'Save intake'}
          </button>
        </div>
      </form>
    </section>
  )
}
