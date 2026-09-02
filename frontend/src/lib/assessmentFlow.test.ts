import { describe, expect, it } from 'vitest'
import type { SessionResponse, SessionStage } from './api'
import {
  previousView,
  resolveView,
  viewFromServerStage,
} from './assessmentFlow'

const session = (
  stage: SessionStage,
  extras: Partial<SessionResponse> = {},
): SessionResponse => ({
  id: 'sid-1',
  stage,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  consent: {
    research_only: stage !== 'created',
    no_diagnosis: stage !== 'created',
    data_minimization: stage !== 'created',
    camera_optional: stage === 'created' ? null : false,
    consented_at: stage === 'created' ? null : '2026-01-01T00:01:00+00:00',
  },
  intake: null,
  questionnaire: null,
  features_recorded: false,
  ...extras,
})

describe('resolveView', () => {
  it('sends created sessions to consent, not later steps', () => {
    const created = session('created')
    expect(resolveView(created, 'intake')).toBe('consent')
    expect(resolveView(created, 'questionnaire')).toBe('consent')
    expect(resolveView(created, 'results')).toBe('consent')
    expect(resolveView(created, 'welcome')).toBe('welcome')
  })

  it('keeps incomplete questionnaire on the questionnaire step', () => {
    const mid = session('questionnaire_in_progress')
    expect(resolveView(mid, 'camera')).toBe('questionnaire')
    expect(resolveView(mid, 'results')).toBe('questionnaire')
    expect(resolveView(mid, 'welcome')).toBe('welcome')
  })

  it('allows Back to an earlier unlocked step', () => {
    const mid = session('questionnaire_in_progress')
    expect(resolveView(mid, 'intake')).toBe('intake')
    expect(resolveView(mid, 'consent')).toBe('consent')
    const done = session('questionnaire_complete')
    expect(resolveView(done, 'questionnaire')).toBe('questionnaire')
    expect(resolveView(done, 'camera')).toBe('camera')
  })

  it('allows optional camera/stimulus after questionnaire complete', () => {
    const done = session('questionnaire_complete')
    expect(resolveView(done, 'camera')).toBe('camera')
    expect(resolveView(done, 'stimulus')).toBe('stimulus')
    expect(viewFromServerStage('questionnaire_complete')).toBe('camera')
  })

  it('still opens results after features are recorded, and allows Back', () => {
    const recorded = session('questionnaire_complete', {
      features_recorded: true,
    })
    expect(resolveView(recorded, 'results')).toBe('results')
    expect(resolveView(recorded, 'stimulus')).toBe('stimulus')
    expect(resolveView(recorded, 'welcome')).toBe('welcome')
  })

  it('maps each session step to the previous one', () => {
    expect(previousView('consent')).toBe('welcome')
    expect(previousView('intake')).toBe('consent')
    expect(previousView('questionnaire')).toBe('intake')
    expect(previousView('camera')).toBe('questionnaire')
    expect(previousView('calibration')).toBe('camera')
    expect(previousView('stimulus')).toBe('calibration')
    expect(previousView('results')).toBe('stimulus')
  })

  it('does not resolve results without a session', () => {
    expect(resolveView(null, 'results')).toBe('welcome')
  })
})
