/** Authoritative client assessment views. Server stage still gates progress. */

import type { SessionResponse, SessionStage } from './api'

export type AssessmentView =
  | 'welcome'
  | 'consent'
  | 'intake'
  | 'questionnaire'
  | 'camera'
  | 'calibration'
  | 'stimulus'
  | 'submitting_features'
  | 'feature_error'
  | 'results'

const LATE_VIEWS: readonly AssessmentView[] = [
  'camera',
  'calibration',
  'stimulus',
  'submitting_features',
  'feature_error',
  'results',
]

export const VIEW_ANNOUNCEMENTS: Record<AssessmentView, string> = {
  welcome: 'Welcome',
  consent: 'Consent',
  intake: 'Intake',
  questionnaire: 'Questionnaire',
  camera: 'Camera quality check',
  calibration: 'Calibration',
  stimulus: 'Video task',
  submitting_features: 'Saving numeric tracking notes',
  feature_error: 'Could not save tracking notes',
  results: 'Research-session summary',
}

export function viewFromServerStage(stage: SessionStage): AssessmentView {
  if (stage === 'created') return 'consent'
  if (stage === 'consented') return 'intake'
  if (stage === 'intake_complete' || stage === 'questionnaire_in_progress') {
    return 'questionnaire'
  }
  if (stage === 'questionnaire_complete') return 'camera'
  return 'welcome'
}

/**
 * Map a requested view onto the earliest stage allowed by the stored session.
 * Client-only steps (camera through results) require questionnaire_complete.
 */
export function resolveView(
  session: SessionResponse | null,
  requested: AssessmentView,
): AssessmentView {
  if (!session) return 'welcome'

  if (session.stage === 'created') {
    return requested === 'welcome' ? 'welcome' : 'consent'
  }

  if (session.stage === 'consented') {
    if (requested === 'welcome' || requested === 'consent') return requested
    return 'intake'
  }

  if (
    session.stage === 'intake_complete' ||
    session.stage === 'questionnaire_in_progress'
  ) {
    if (requested === 'welcome') return 'welcome'
    return 'questionnaire'
  }

  if (session.stage !== 'questionnaire_complete') {
    return 'welcome'
  }

  if (requested === 'welcome') return 'welcome'

  if (session.features_recorded) {
    if (requested === 'feature_error') return 'feature_error'
    return 'results'
  }

  if ((LATE_VIEWS as readonly string[]).includes(requested)) {
    return requested
  }
  return 'camera'
}

export function canRequestResults(session: SessionResponse | null): boolean {
  return session?.stage === 'questionnaire_complete'
}
