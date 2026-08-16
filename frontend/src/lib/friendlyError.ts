/** Map API/network failures to plain, non-blaming participant copy. */

const DETAIL_MESSAGES: Record<string, string> = {
  session_not_found: 'This research session was not found.',
  session_id_required: 'A session is required for this step.',
  consent_required: 'Consent is required before this step.',
  questionnaire_not_complete: 'The questionnaire needs to be finished first.',
  questionnaire_already_complete: 'The questionnaire is already complete.',
  features_already_recorded: 'Numeric tracking notes were already saved.',
  invalid_stage: 'This step is not available for the current session.',
  consent_already_recorded: 'Consent was already recorded for this session.',
  intake_already_recorded: 'Intake was already recorded for this session.',
}

export function isFeaturesAlreadyRecorded(err: unknown): boolean {
  return messageOf(err) === 'features_already_recorded'
}

export function friendlyError(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = String((err as { name: string }).name)
    if (name === 'AbortError' || name === 'TimeoutError') {
      return 'The request took too long. You can try again.'
    }
  }

  const raw = messageOf(err)

  if (raw in DETAIL_MESSAGES) {
    return DETAIL_MESSAGES[raw]
  }

  if (/cannot reach backend/i.test(raw) || /failed to fetch/i.test(raw)) {
    return 'The research service is unavailable. Try again in a moment.'
  }

  if (/traceback|operationalerror|internal server|sqlalchemy|psycopg/i.test(raw)) {
    return 'Something went wrong while saving this step. You can try again.'
  }

  if (raw.startsWith('[') || raw.includes('"loc"')) {
    return 'Some of the submitted data was not valid. Nothing extra was stored.'
  }

  if (raw) {
    console.debug('Unmapped error detail withheld from UI', raw)
  }
  return 'Something went wrong. You can try again.'
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return ''
}
