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

const VIEW_ORDER: readonly AssessmentView[] = [
  'welcome',
  'consent',
  'intake',
  'questionnaire',
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

function furthestUnlockedView(session: SessionResponse): AssessmentView {
  switch (session.stage) {
    case 'created':
      return 'consent'
    case 'consented':
      return 'intake'
    case 'intake_complete':
    case 'questionnaire_in_progress':
      return 'questionnaire'
    case 'questionnaire_complete':
      return 'results'
    default:
      return 'welcome'
  }
}

/**
 * Honor Back to any already-unlocked step. Clamp anything ahead of the
 * session stage so consent/intake/questionnaire cannot be skipped.
 */
export function resolveView(
  session: SessionResponse | null,
  requested: AssessmentView,
): AssessmentView {
  if (!session) return 'welcome'
  const capIdx = VIEW_ORDER.indexOf(furthestUnlockedView(session))
  const reqIdx = VIEW_ORDER.indexOf(requested)
  if (reqIdx === -1 || reqIdx > capIdx) {
    return viewFromServerStage(session.stage)
  }
  return requested
}

/** One step earlier in the session. Welcome has no previous step. */
export function previousView(current: AssessmentView): AssessmentView {
  switch (current) {
    case 'consent':
      return 'welcome'
    case 'intake':
      return 'consent'
    case 'questionnaire':
      return 'intake'
    case 'camera':
      return 'questionnaire'
    case 'calibration':
      return 'camera'
    case 'stimulus':
    case 'submitting_features':
    case 'feature_error':
      return 'calibration'
    case 'results':
      return 'stimulus'
    default:
      return 'welcome'
  }
}

export function canRequestResults(session: SessionResponse | null): boolean {
  return session?.stage === 'questionnaire_complete'
}
