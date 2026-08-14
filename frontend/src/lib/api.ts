/** Typed client for the FastAPI backend (Phase 0–5). */

import type { ResearchSessionSummary } from '../types/assessment'

export type HealthResponse = {
  status: string
  service: string
  version: string
}

export type SessionStage =
  | 'created'
  | 'consented'
  | 'intake_complete'
  | 'questionnaire_in_progress'
  | 'questionnaire_complete'

export type AccessibilityPrefs = {
  large_text: boolean
  reduced_motion: boolean
  screen_reader_hints: boolean
}

export type QuestionnaireSummary = {
  started_at: string | null
  completed_at: string | null
  score: number | null
  item_count: number | null
  bank_id: string | null
  instrument_version: string | null
  subscale_scores: Record<string, number> | null
  timing: {
    item_count: number
    total_time_ms: number
    mean_time_to_first_interaction_ms: number
    mean_total_time_on_question_ms: number
    total_answer_changes: number
  } | null
}

export type SessionResponse = {
  id: string
  stage: SessionStage
  created_at: string
  updated_at: string
  consent: {
    research_only: boolean
    no_diagnosis: boolean
    data_minimization: boolean
    camera_optional: boolean | null
    consented_at: string | null
  }
  intake: {
    age_range: string
    language: string
    accessibility_prefs: AccessibilityPrefs
    optional_context: string | null
  } | null
  questionnaire: QuestionnaireSummary | null
}

export type ConsentPayload = {
  research_only: boolean
  no_diagnosis: boolean
  data_minimization: boolean
  camera_optional: boolean
}

export type IntakePayload = {
  age_range: string
  language: string
  accessibility_prefs: AccessibilityPrefs
  optional_context: string | null
}

export type ScaleOption = { value: number; label: string }

export type QuestionItem = {
  id: string
  text: string
  required: boolean
  reverse_scored: boolean
  category: string
}

export type QuestionBank = {
  bank_id: string
  instrument_version: string
  label: string
  scale: ScaleOption[]
  items: QuestionItem[]
  required_count: number
}

export type QuestionResponsePayload = {
  session_id: string
  question_id: string
  answer_value: number
  shown_at: string
  answered_at: string
  time_to_first_interaction_ms: number
  total_time_on_question_ms: number
  answer_change_count: number
}

export type StoredQuestionResponse = {
  question_id: string
  answer_value: number
  shown_at: string
  answered_at: string
  time_to_first_interaction_ms: number
  total_time_on_question_ms: number
  answer_change_count: number
}

export type QuestionResponseResult = {
  session: SessionResponse
  response: StoredQuestionResponse
  answered_count: number
  required_count: number
  next_question_id: string | null
}

export type FeaturePayload = {
  session_id: string
  task_version: string
  sample_count: number
  duration_ms: number
  tracking_ratio: number
  single_face_ratio: number
  dropped_frame_ratio: number
  valid_tracking_duration_ms: number
  task_completed: boolean
  data_quality: 'ok' | 'low' | 'insufficient' | 'unavailable'
  mean_abs_yaw_deg: number
  mean_abs_pitch_deg: number
  mean_blink_estimate: number | null
  media_uploaded: false
}

export type FeatureIngestResult = {
  status: 'accepted' | 'rejected'
  quality: 'ok' | 'low' | 'insufficient' | 'unavailable'
  detail: string
}

export type QuestionnaireProgress = {
  session_id: string
  stage: SessionStage
  bank_id: string
  required_count: number
  answered_count: number
  answered: Record<string, StoredQuestionResponse>
  next_question_id: string | null
  ordered_question_ids: string[]
  session: SessionResponse
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000'

function sessionPath(sessionId: string, suffix = ''): string {
  return `/api/v1/sessions/${encodeURIComponent(sessionId)}${suffix}`
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return JSON.stringify(body.detail)
  } catch {
    // ignore non-JSON error bodies
  }
  return `Request failed (${response.status})`
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`
  try {
    return await fetch(url, init)
  } catch (err) {
    const message =
      `Cannot reach backend at ${API_BASE_URL} (${path}). ` +
      `Start it with: ./scripts/run-backend.sh`
    throw new Error(message, { cause: err })
  }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<T>
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiFetch('/api/v1/health')
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  const data = (await response.json()) as HealthResponse
  if (data.status !== 'ok') {
    throw new Error(`Unexpected health status: ${data.status ?? 'missing'}`)
  }
  return data
}

export async function createSession(): Promise<SessionResponse> {
  const response = await apiFetch('/api/v1/sessions', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<SessionResponse>
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const response = await apiFetch(sessionPath(sessionId), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<SessionResponse>
}

export async function postConsent(
  sessionId: string,
  payload: ConsentPayload,
): Promise<SessionResponse> {
  return postJson<SessionResponse>(sessionPath(sessionId, '/consent'), payload)
}

export async function postIntake(
  sessionId: string,
  payload: IntakePayload,
): Promise<SessionResponse> {
  return postJson<SessionResponse>(sessionPath(sessionId, '/intake'), payload)
}

export async function fetchQuestionBank(): Promise<QuestionBank> {
  const response = await apiFetch('/api/v1/assessment/questionnaire', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<QuestionBank>
}

export async function fetchQuestionnaireProgress(
  sessionId: string,
): Promise<QuestionnaireProgress> {
  const response = await apiFetch(
    `/api/v1/assessment/questionnaire/progress/${encodeURIComponent(sessionId)}`,
    { headers: { Accept: 'application/json' } },
  )
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<QuestionnaireProgress>
}

export async function postQuestionResponse(
  payload: QuestionResponsePayload,
): Promise<QuestionResponseResult> {
  return postJson<QuestionResponseResult>(
    '/api/v1/assessment/question-response',
    payload,
  )
}

export async function postQuestionnaireComplete(
  sessionId: string,
): Promise<SessionResponse> {
  return postJson<SessionResponse>('/api/v1/assessment/questionnaire/complete', {
    session_id: sessionId,
  })
}

export async function postFeatures(
  payload: FeaturePayload,
): Promise<FeatureIngestResult> {
  return postJson<FeatureIngestResult>('/api/v1/assessment/features', payload)
}

export async function fetchResearchSummary(
  sessionId: string,
): Promise<ResearchSessionSummary> {
  const response = await apiFetch(
    `/api/v1/results/${encodeURIComponent(sessionId)}`,
    { headers: { Accept: 'application/json' } },
  )
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<ResearchSessionSummary>
}

export { API_BASE_URL }
