import { describe, expect, it } from 'vitest'
import {
  friendlyError,
  isFeaturesAlreadyRecorded,
  isQuestionnaireAlreadyComplete,
} from './friendlyError'

describe('friendlyError', () => {
  it('maps known API details to plain language', () => {
    expect(friendlyError(new Error('session_not_found'))).toMatch(/not found/i)
    expect(friendlyError(new Error('consent_required'))).toBe(
      'Consent is required before this step.',
    )
    expect(friendlyError(new Error('Failed to fetch'))).toMatch(/unavailable/i)
  })

  it('does not show an unknown backend detail string', () => {
    expect(friendlyError(new Error('boom'))).toBe(
      'Something went wrong. You can try again.',
    )
    expect(friendlyError(new Error('boom'))).not.toContain('boom')
  })

  it('does not forward stack traces or SQL errors', () => {
    const raw =
      'Traceback (most recent call last): OperationalError: no such table'
    expect(friendlyError(new Error(raw))).not.toMatch(/traceback|operationalerror/i)
  })

  it('recognizes a duplicate feature write', () => {
    expect(
      isFeaturesAlreadyRecorded(new Error('features_already_recorded')),
    ).toBe(true)
  })

  it('recognizes an already-complete questionnaire', () => {
    expect(
      isQuestionnaireAlreadyComplete(
        new Error('questionnaire_already_complete'),
      ),
    ).toBe(true)
    expect(
      isQuestionnaireAlreadyComplete(new Error('features_already_recorded')),
    ).toBe(false)
  })
})
